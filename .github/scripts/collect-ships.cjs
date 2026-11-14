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
//     name, AIS ship type, destination, length (metres), beam (metres),
//     draught (metres), IMO number, call sign, expected arrival ("MM-DDTHH:mm",
//     UTC)], ...] }
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
/**
 * Keeps the file within what the app can serve in one response (4.5 MB on
 * Vercel). When there are more ships than fit, the most recently heard win.
 */
const MAX_ROWS_BYTES = 3_800_000;
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

/** In the order of the columns of a row, after the MMSI. */
const FIELDS = [
  "latitude",
  "longitude",
  "course",
  "speed",
  "heading",
  "status",
  "seen",
  "name",
  "type",
  "destination",
  "length",
  "beam",
  "draught",
  "imo",
  "callsign",
  "eta",
];

const nowSeconds = () => Date.now() / 1000;
const round = (value, decimals) => Number(value.toFixed(decimals));
const twoDigits = (value) => String(value).padStart(2, "0");

/** A finite number accepted by `isValid`, otherwise null: AIS uses out-of-range values for "unknown". */
const numberOr = (value, isValid) =>
  typeof value === "number" && Number.isFinite(value) && isValid(value) ? value : null;

/** AIS pads its texts with "@" and spaces. */
function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/@+/g, " ").replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

/** Seven digits, the last one a checksum of the six before it. Crews often leave it at 0. */
function isImoNumber(value) {
  if (!Number.isInteger(value) || value < 1_000_000 || value > 9_999_999) return false;
  const digits = String(value).split("").map(Number);
  const checksum = digits.slice(0, 6).reduce((sum, digit, index) => sum + digit * (7 - index), 0);
  return checksum % 10 === digits[6];
}

/** AIS gives the expected arrival as a month, day, hour and minute, without a year. */
function etaOf(eta) {
  const month = numberOr(eta?.Month, (value) => value >= 1 && value <= 12);
  const day = numberOr(eta?.Day, (value) => value >= 1 && value <= 31);
  const hour = numberOr(eta?.Hour, (value) => value >= 0 && value <= 23);
  const minute = numberOr(eta?.Minute, (value) => value >= 0 && value <= 59);
  if (month === null || day === null || hour === null || minute === null) return null;
  return `${twoDigits(month)}-${twoDigits(day)}T${twoDigits(hour)}:${twoDigits(minute)}`;
}

function emptyShip() {
  const ship = Object.fromEntries(FIELDS.map((field) => [field, null]));
  ship.seen = 0;
  return ship;
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
    const ship = emptyShip();
    // Rows written before the format grew are shorter: what they lack stays unknown.
    FIELDS.forEach((field, index) => {
      ship[field] = row[index + 1] ?? ship[field];
    });
    ships.set(row[0], ship);
  }
  return ships;
}

function applyStaticData(
  ship,
  { name, type, dimension, destination, imo, callsign, draught, eta },
) {
  ship.name = cleanText(name) ?? ship.name;
  ship.type = numberOr(type, (value) => value >= 1 && value <= 99) ?? ship.type;
  ship.destination = cleanText(destination) ?? ship.destination;
  // A and B run from the antenna to the bow and the stern, C and D to each side.
  const length = numberOr((dimension?.A ?? 0) + (dimension?.B ?? 0), (value) => value > 0);
  const beam = numberOr((dimension?.C ?? 0) + (dimension?.D ?? 0), (value) => value > 0);
  ship.length = length ?? ship.length;
  ship.beam = beam ?? ship.beam;
  ship.imo = numberOr(imo, isImoNumber) ?? ship.imo;
  ship.callsign = cleanText(callsign) ?? ship.callsign;
  // The draught and the expected arrival change from one voyage to the next.
  if (draught !== undefined) {
    ship.draught = numberOr(draught, (value) => value > 0 && value < 30);
  }
  if (eta !== undefined) ship.eta = etaOf(eta);
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
      imo: body.ImoNumber,
      callsign: body.CallSign,
      draught: body.MaximumStaticDraught ?? null,
      eta: body.Eta ?? null,
    });
  } else if (message.MessageType === "StaticDataReport") {
    applyStaticData(ship, {
      name: body.ReportA?.Name,
      type: body.ReportB?.ShipType,
      dimension: body.ReportB?.Dimension,
      callsign: body.ReportB?.CallSign,
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
  const heard = [...ships.entries()]
    .filter(([, ship]) => ship.latitude !== null && time - ship.seen <= MAX_AGE_SECONDS)
    .sort(([, a], [, b]) => b.seen - a.seen);

  const rows = [];
  let bytes = 0;
  for (const [mmsi, ship] of heard) {
    const row = [mmsi, ...FIELDS.map((field) => ship[field])];
    bytes += Buffer.byteLength(JSON.stringify(row)) + 1;
    if (bytes > MAX_ROWS_BYTES) break;
    rows.push(row);
  }
  return rows;
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
