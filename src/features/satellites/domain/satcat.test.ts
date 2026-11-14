import { describe, expect, it } from "vitest";
import { pickSearchResult } from "@/shared/wikimedia/wikipedia";
import { satcatRecordSchema, toCatalogEntry } from "./satcat";
import { wikipediaTopicFor } from "./wikipedia-topic";

describe("toCatalogEntry", () => {
  it("turns the catalogue codes into plain words", () => {
    const record = satcatRecordSchema.parse({
      OBJECT_NAME: "ISS (ZARYA)",
      OBJECT_TYPE: "PAY",
      OPS_STATUS_CODE: "+",
      OWNER: "ISS",
      LAUNCH_DATE: "1998-11-20",
      LAUNCH_SITE: "TYMSC",
      DECAY_DATE: "",
      RCS: 399.0524,
    });

    expect(toCatalogEntry(record)).toEqual({
      launchDate: "1998-11-20",
      launchSite: "Baikonur, Kazakhstan",
      owner: "ISS partners",
      kind: "Payload",
      status: "Operational",
      radarCrossSection: 399.0524,
    });
  });

  it("keeps unknown codes and copes with missing fields", () => {
    const record = satcatRecordSchema.parse({ OWNER: "ZZZ", LAUNCH_SITE: "", LAUNCH_DATE: "?" });

    expect(toCatalogEntry(record)).toEqual({
      launchDate: null,
      launchSite: null,
      owner: "ZZZ",
      kind: null,
      status: null,
      radarCrossSection: null,
    });
  });
});

describe("wikipediaTopicFor", () => {
  it("sends constellations and stations to their own article", () => {
    expect(wikipediaTopicFor({ name: "STARLINK-5853", group: "starlink" })).toEqual({
      kind: "title",
      title: "Starlink",
    });
    expect(wikipediaTopicFor({ name: "ISS", group: "station" })).toEqual({
      kind: "title",
      title: "International Space Station",
    });
    expect(wikipediaTopicFor({ name: "COSMOS 2545 (759)", group: "navigation" })).toEqual({
      kind: "title",
      title: "GLONASS",
    });
  });

  it("searches for the others by name", () => {
    expect(wikipediaTopicFor({ name: "NOAA 19", group: "other" })).toEqual({
      kind: "search",
      name: "NOAA 19",
      context: "satellite",
      family: "NOAA",
    });
    expect(wikipediaTopicFor({ name: "COSMOS 2553", group: "other" })).toMatchObject({
      name: "KOSMOS 2553",
    });
  });
});

describe("pickSearchResult", () => {
  const topic = {
    kind: "search",
    name: "YAOGAN-35 A",
    context: "satellite",
    family: "YAOGAN",
  } as const;

  it("prefers an article about the satellite itself, whatever the punctuation", () => {
    const pages = [
      { title: "Yaogan", index: 1 },
      { title: "Yaogan 35A", index: 2 },
    ];
    expect(pickSearchResult(pages, topic)?.title).toBe("Yaogan 35A");
  });

  it("falls back on the family, and on nothing rather than an unrelated article", () => {
    expect(pickSearchResult([{ title: "Yaogan", index: 1 }], topic)?.title).toBe("Yaogan");
    expect(pickSearchResult([{ title: "Reconnaissance satellite", index: 1 }], topic)).toBeNull();
  });
});
