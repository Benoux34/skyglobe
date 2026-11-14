import { z } from "zod";

/** What the public satellite catalogue (SATCAT) says about one object. */
export interface CatalogEntry {
  /** ISO date, e.g. "1998-11-20". */
  readonly launchDate: string | null;
  readonly launchSite: string | null;
  /** Country or organisation the object belongs to. */
  readonly owner: string | null;
  /** Payload, rocket body or debris. */
  readonly kind: string | null;
  readonly status: string | null;
  /** How large the object looks to a radar, in square metres. */
  readonly radarCrossSection: number | null;
}

const text = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  });

export const satcatRecordSchema = z.object({
  OBJECT_TYPE: text,
  OPS_STATUS_CODE: text,
  OWNER: text,
  LAUNCH_DATE: text,
  LAUNCH_SITE: text,
  RCS: z.number().nullish(),
});

export type SatcatRecord = z.infer<typeof satcatRecordSchema>;

const OWNERS: Readonly<Record<string, string>> = {
  AB: "Arabsat",
  AC: "AsiaSat",
  ALG: "Algeria",
  ARGN: "Argentina",
  AUS: "Australia",
  BEL: "Belgium",
  BRAZ: "Brazil",
  CA: "Canada",
  CHLE: "Chile",
  CIS: "Russia",
  COL: "Colombia",
  CZCH: "Czechia",
  DEN: "Denmark",
  EGYP: "Egypt",
  ESA: "European Space Agency",
  EUME: "EUMETSAT",
  EUTE: "Eutelsat",
  FIN: "Finland",
  FR: "France",
  GER: "Germany",
  GLOB: "Globalstar",
  IM: "Inmarsat",
  IND: "India",
  INDO: "Indonesia",
  IRAN: "Iran",
  IRID: "Iridium",
  ISRA: "Israel",
  ISS: "ISS partners",
  IT: "Italy",
  ITSO: "Intelsat",
  JPN: "Japan",
  KAZ: "Kazakhstan",
  LUXE: "Luxembourg",
  MALA: "Malaysia",
  MEX: "Mexico",
  NATO: "NATO",
  NETH: "Netherlands",
  NIG: "Nigeria",
  NKOR: "North Korea",
  NOR: "Norway",
  NZ: "New Zealand",
  O3B: "O3b Networks",
  ORB: "Orbcomm",
  PAKI: "Pakistan",
  PER: "Peru",
  POL: "Poland",
  PRC: "China",
  RP: "Philippines",
  SAFR: "South Africa",
  SAUD: "Saudi Arabia",
  SES: "SES",
  SING: "Singapore",
  SKOR: "South Korea",
  SPN: "Spain",
  SWED: "Sweden",
  SWTZ: "Switzerland",
  THAI: "Thailand",
  TURK: "Türkiye",
  TWN: "Taiwan",
  UAE: "United Arab Emirates",
  UK: "United Kingdom",
  UKR: "Ukraine",
  US: "United States",
  VENZ: "Venezuela",
  VTNM: "Vietnam",
};

const LAUNCH_SITES: Readonly<Record<string, string>> = {
  AFETR: "Cape Canaveral, USA",
  AFWTR: "Vandenberg, USA",
  DLS: "Dombarovsky, Russia",
  FRGUI: "Kourou, French Guiana",
  JSC: "Jiuquan, China",
  KODAK: "Kodiak, USA",
  KSCUT: "Uchinoura, Japan",
  KYMSC: "Kapustin Yar, Russia",
  NSC: "Naro, South Korea",
  PLMSC: "Plesetsk, Russia",
  RLLB: "Mahia, New Zealand",
  SEAL: "Sea Launch platform",
  SEMLS: "Semnan, Iran",
  SRILR: "Sriharikota, India",
  TAISC: "Taiyuan, China",
  TANSC: "Tanegashima, Japan",
  TYMSC: "Baikonur, Kazakhstan",
  VOSTO: "Vostochny, Russia",
  WLPIS: "Wallops Island, USA",
  WSC: "Wenchang, China",
  XICLF: "Xichang, China",
  YAVNE: "Palmachim, Israel",
  YSLA: "Yellow Sea platform",
};

const KINDS: Readonly<Record<string, string>> = {
  PAY: "Payload",
  "R/B": "Rocket body",
  DEB: "Debris",
};

const STATUSES: Readonly<Record<string, string>> = {
  "+": "Operational",
  "-": "Not operational",
  P: "Partially operational",
  B: "Backup",
  S: "Spare",
  X: "Extended mission",
  D: "Decayed",
};

/** Known codes become plain words; an unknown owner or site keeps its code rather than vanish. */
export function toCatalogEntry(record: SatcatRecord): CatalogEntry {
  const { OWNER: owner, LAUNCH_SITE: site, OBJECT_TYPE: kind, OPS_STATUS_CODE: status } = record;
  return {
    launchDate:
      record.LAUNCH_DATE !== null && /^\d{4}-\d{2}-\d{2}$/.test(record.LAUNCH_DATE)
        ? record.LAUNCH_DATE
        : null,
    launchSite: site === null ? null : (LAUNCH_SITES[site] ?? site),
    owner: owner === null ? null : (OWNERS[owner] ?? owner),
    kind: kind === null ? null : (KINDS[kind] ?? null),
    status: status === null ? null : (STATUSES[status] ?? null),
    radarCrossSection: record.RCS ?? null,
  };
}
