import { z } from "zod";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const IMAGE_WIDTH = 640;
const FILE_NAMESPACE = 6;
const CATEGORY_NAMESPACE = 14;
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_AUTHOR_LENGTH = 48;

export interface CommonsPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** The page of the photo on Wikimedia Commons, with its full credits. */
  readonly pageUrl: string;
  readonly author: string | null;
  readonly license: string | null;
}

const metadataValue = z.object({ value: z.string() }).optional();

const pageSchema = z.object({
  ns: z.number(),
  title: z.string(),
  imageinfo: z
    .array(
      z.object({
        thumburl: z.string(),
        thumbwidth: z.number(),
        thumbheight: z.number(),
        descriptionurl: z.string(),
        extmetadata: z
          .object({ Artist: metadataValue, LicenseShortName: metadataValue })
          .optional(),
      }),
    )
    .optional(),
});

const responseSchema = z.object({
  query: z.object({ pages: z.array(pageSchema) }).optional(),
});

type Page = z.infer<typeof pageSchema>;

/** Commons stores authors as HTML, often a link to a user page. */
function plainText(html: string | undefined): string | null {
  if (html === undefined) return null;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "") return null;
  return text.length > MAX_AUTHOR_LENGTH ? `${text.slice(0, MAX_AUTHOR_LENGTH - 1)}…` : text;
}

async function categoryMembers(category: string): Promise<Page[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    // Lets a browser call the API from any site.
    origin: "*",
    generator: "categorymembers",
    gcmtitle: category,
    gcmtype: "file|subcat",
    gcmlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(IMAGE_WIDTH),
    iiextmetadatafilter: "Artist|LicenseShortName",
  });
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikimedia Commons answered with HTTP ${response.status}.`);
  return responseSchema.parse(await response.json()).query?.pages ?? [];
}

function firstPhoto(pages: readonly Page[]): CommonsPhoto | null {
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (page.ns !== FILE_NAMESPACE || info === undefined || !PHOTO_EXTENSIONS.test(page.title)) {
      continue;
    }
    return {
      url: info.thumburl,
      width: info.thumbwidth,
      height: info.thumbheight,
      pageUrl: info.descriptionurl,
      author: plainText(info.extmetadata?.Artist?.value),
      license: plainText(info.extmetadata?.LicenseShortName?.value),
    };
  }
  return null;
}

/**
 * A photo of the ship with this IMO number. Wikimedia Commons files ship
 * photos under "IMO <number>", usually inside a sub-category named after the
 * ship. `null` when it has none.
 */
export async function fetchShipPhoto(imo: number): Promise<CommonsPhoto | null> {
  const members = await categoryMembers(`Category:IMO ${imo}`);
  const direct = firstPhoto(members);
  if (direct !== null) return direct;

  const subcategory = members.find((page) => page.ns === CATEGORY_NAMESPACE);
  return subcategory === undefined ? null : firstPhoto(await categoryMembers(subcategory.title));
}
