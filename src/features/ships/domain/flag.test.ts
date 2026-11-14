import { describe, expect, it } from "vitest";
import { flagOfMmsi } from "./flag";

describe("flagOfMmsi", () => {
  it("reads the country of registration from the first three digits", () => {
    expect(flagOfMmsi(228339600)).toEqual({ code: "FR", country: "France", emoji: "🇫🇷" });
    expect(flagOfMmsi(636092799)?.country).toBe("Liberia");
    expect(flagOfMmsi(374811000)?.country).toBe("Panama");
    expect(flagOfMmsi(563012300)?.code).toBe("SG");
  });

  it("knows the countries with several prefixes", () => {
    expect([232, 233, 234, 235].map((prefix) => flagOfMmsi(prefix * 1_000_000 + 1)?.code)).toEqual([
      "GB",
      "GB",
      "GB",
      "GB",
    ]);
  });

  it("returns nothing for a prefix no country holds", () => {
    expect(flagOfMmsi(299000000)).toBeNull();
  });
});
