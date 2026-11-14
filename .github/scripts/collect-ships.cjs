#!/usr/bin/env node
// Listens to the aisstream.io feed (ships broadcasting their position over AIS)
// for a while and writes what it heard as one snapshot file.
//
//   AISSTREAM_API_KEY=... node collect-ships.cjs <output-file>
//
// The output file is also the starting point: ships it already holds are kept
// until they have been silent for too long. A moored ship only speaks every few
// minutes, so one listening window alone would miss most of them.
//
// File format, one row per ship:
//   { "time": <unix seconds>, "ships": [[mmsi, latitude, longitude, course,
//     speed (knots), heading, navigational status, last heard (unix seconds),
//     name, AIS ship type, destination, length (metres)], ...] }
// Everything after the longitude may be null, except "last heard".
"use strict";

// A plain Node script, run as it is by the workflow: no build step, hence `require`.
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const WebSocket = require("ws");

const STREAM_URL = process.env.AISSTREAM_URL || "wss://stream.aisstream.io/v0/stream";
const API_KEY = process.env.AISSTREAM_API_KEY || "";
const LISTEN_SECONDS = Number(process.env.LISTEN_SECONDS || 130);
/** Ships silent for longer than this are dropped from the snapshot. */
const MAX_AGE_SECONDS = 45 * 60;
/** Keeps the file within what the app can serve in one response. */
const MAX_SHIPS = 40_000;
const RECONNECT_DELAY_MS = 2_000;

const POSITION_MESSAGES = new Set([
  "PositionReport",
  "StandardClassBPositionReport",
  "ExtendedClassBPositionReport",
]);
const SUBSCRIPTION = {
  APIKey: API_KEY,
  // The whole world.
  BoundingBoxes: [
    [
      [-90, -180],
      [90, 180],
    ],
  ],
  FilterMessageTypes: [...POSITION_MESSAGES, "ShipStaticData", "StaticDataReport"],
};

const nowSeconds = () => Date.now() / 1000;
const round = (value, decimals) => Number(value.toFixed(decimals));

/** A finite number accepted by `isValid`, otherwise null: AIS uses out-of-range values for "unknown". */
const numberOr = (value, isValid) =>
  typeof value === "number" && Number.isFinite(value) && isValid(value) ? value : null;

/** AIS pads its texts with "@" and spaces. */
function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/@+/g, " ").replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

function emptyShip() {
  return {
    latitude: null,
    longitude: null,
    course: null,
    speed: null,
    heading: null,
    status: null,
    seen: 0,
    name: null,
    type: null,
    destination: null,
    length: null,
  };
}

function loadPrevious(file) {
  const ships = new Map();
  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(file, "utf8")).ships;
  } catch {
    return ships; // First run, or an unreadable file: start from nothing.
  }
  if (!Array.isArray(rows)) return ships;
  for (const row of rows) {
    if (!Array.isArray(row) || typeof row[0] !== "number") continue;
    const [
      mmsi,
      latitude,
      longitude,
      course,
      speed,
      heading,
      status,
      seen,
      name,
      type,
      destination,
      length,
    ] = row;
    ships.set(mmsi, {
      latitude,
      longitude,
      course: course ?? null,
      speed: speed ?? null,
      heading: heading ?? null,
      status: status ?? null,
      seen: typeof seen === "number" ? seen : 0,
      name: name ?? null,
      type: type ?? null,
      destination: destination ?? null,
      length: length ?? null,
    });
  }
  return ships;
}

function applyStaticData(ship, { name, type, dimension, destination }) {
  ship.name = cleanText(name) ?? ship.name;
  ship.type = numberOr(type, (value) => value >= 1 && value <= 99) ?? ship.type;
  ship.destination = cleanText(destination) ?? ship.destination;
  const length = numberOr((dimension?.A ?? 0) + (dimension?.B ?? 0), (value) => value > 0);
  ship.length = length ?? ship.length;
}

function applyPosition(ship, body, meta, heardAt) {
  const latitude = numberOr(
    body.Latitude ?? meta.latitude ?? meta.Latitude,
    (value) => Math.abs(value) <= 90,
  );
  const longitude = numberOr(
    body.Longitude ?? meta.longitude ?? meta.Longitude,
    (value) => Math.abs(value) <= 180,
  );
  // Transponders without a GPS fix report 0, 0.
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) return;

  ship.latitude = round(latitude, 4);
  ship.longitude = round(longitude, 4);
  ship.course = numberOr(body.Cog, (value) => value >= 0 && value < 360);
  ship.speed = numberOr(body.Sog, (value) => value >= 0 && value < 102.3);
  ship.heading = numberOr(body.TrueHeading, (value) => value >= 0 && value < 360);
  if ("NavigationalStatus" in body) {
    ship.status = numberOr(body.NavigationalStatus, (value) => value >= 0 && value < 15);
  }
  ship.seen = Math.floor(heardAt);
}

function handleMessage(ships, message, heardAt) {
  const meta = message.MetaData ?? {};
  const mmsi = Number(meta.MMSI);
  // Ships only: this leaves out coast stations, buoys and rescue aircraft.
  if (!Number.isInteger(mmsi) || mmsi < 200_000_000 || mmsi > 799_999_999) return;
  const body = message.Message?.[message.MessageType];
  if (body === null || typeof body !== "object") return;

  let ship = ships.get(mmsi);
  if (ship === undefined) {
    ship = emptyShip();
    ships.set(mmsi, ship);
  }
  ship.name = cleanText(meta.ShipName) ?? ship.name;

  if (POSITION_MESSAGES.has(message.MessageType)) {
    applyPosition(ship, body, meta, heardAt);
    if (message.MessageType === "ExtendedClassBPositionReport") {
      applyStaticData(ship, { name: body.Name, type: body.Type, dimension: body.Dimension });
    }
  } else if (message.MessageType === "ShipStaticData") {
    applyStaticData(ship, {
      name: body.Name,
      type: body.Type,
      dimension: body.Dimension,
      destination: body.Destination,
    });
  } else if (message.MessageType === "StaticDataReport") {
    applyStaticData(ship, {
      name: body.ReportA?.Name,
      type: body.ReportB?.ShipType,
      dimension: body.ReportB?.Dimension,
    });
  }
}

/** Resolves with the number of messages heard; rejects when the service refuses the subscription. */
function listen(ships, seconds) {
  return new Promise((resolve, reject) => {
    let messages = 0;
    let socket = null;
    let retry = null;
    let finished = false;

    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      clearTimeout(retry);
      socket?.terminate();
      if (error === null) resolve(messages);
      else reject(error);
    };
    const deadline = setTimeout(() => finish(null), seconds * 1000);

    const connect = () => {
      const current = new WebSocket(STREAM_URL);
      socket = current;
      // The service closes connections that have not subscribed within 3 seconds.
      current.on("open", () => current.send(JSON.stringify(SUBSCRIPTION)));
      current.on("message", (data) => {
        let message;
        try {
          message = JSON.parse(data.toString());
        } catch {
          return;
        }
        if (typeof message.error === "string") {
          finish(new Error(`aisstream.io refused the subscription: ${message.error}`));
          return;
        }
        messages += 1;
        handleMessage(ships, message, nowSeconds());
      });
      current.on("error", (error) => console.error(`Connection problem: ${error.message}`));
      current.on("close", () => {
        if (!finished) retry = setTimeout(connect, RECONNECT_DELAY_MS);
      });
    };
    connect();
  });
}

function toRows(ships, time) {
  return [...ships.entries()]
    .filter(([, ship]) => ship.latitude !== null && time - ship.seen <= MAX_AGE_SECONDS)
    .sort(([, a], [, b]) => b.seen - a.seen)
    .slice(0, MAX_SHIPS)
    .map(([mmsi, ship]) => [
      mmsi,
      ship.latitude,
      ship.longitude,
      ship.course,
      ship.speed,
      ship.heading,
      ship.status,
      ship.seen,
      ship.name,
      ship.type,
      ship.destination,
      ship.length,
    ]);
}

async function main() {
  const output = process.argv[2];
  if (output === undefined) throw new Error("usage: collect-ships.cjs <output-file>");
  if (API_KEY === "") throw new Error("AISSTREAM_API_KEY is not set.");

  const ships = loadPrevious(output);
  const known = ships.size;
  const messages = await listen(ships, LISTEN_SECONDS);
  // An empty window means the feed is down: better to keep the previous file as it is.
  if (messages === 0) throw new Error("Nothing was received from aisstream.io.");

  const time = Math.floor(nowSeconds());
  const rows = toRows(ships, time);
  fs.writeFileSync(`${output}.part`, JSON.stringify({ time, ships: rows }));
  fs.renameSync(`${output}.part`, output);
  console.log(
    `Snapshot of ${rows.length} ships (${known} carried over, ${messages} messages in ${LISTEN_SECONDS} s).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
