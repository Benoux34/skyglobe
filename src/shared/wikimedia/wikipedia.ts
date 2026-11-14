import { z } from "zod";

const API_URL = "https://en.wikipedia.org/w/api.php";
const IMAGE_WIDTH = 640;

/** What to look up: a known article, or a name to search for. */
export type WikipediaTopic =
  | { readonly kind: "title"; readonly title: string }
  | {
      readonly kind: "search";
      /** The article title has to contain this name, whatever the spacing and punctuation. */
      readonly name: string;
      /** Extra words that steer the search towards the right subject. */
      readonly context: string;
      /** Accepted as a title when nothing matches the full name: the family the thing belongs to. */
      readonly family: string | null;
    };

export interface WikipediaImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface WikipediaArticle {
  readonly title: string;
  /** A few words on what the subject is. */
  readonly description: string | null;
  /** The first sentences of the article. */
  readonly summary: string | null;
  readonly image: WikipediaImage | null;
  readonly url: string;
}

const pageSchema = z.object({
  title: z.string(),
  missing: z.boolean().optional(),
  /** Rank among the search results. */
  index: z.number().optional(),
  thumbnail: z.object({ source: z.string(), width: z.number(), height: z.number() }).optional(),
  extract: z.string().optional(),
  description: z.string().optional(),
  fullurl: z.string().optional(),
});

const responseSchema = z.object({
  query: z.object({ pages: z.array(pageSchema) }).optional(),
});

type Page = z.infer<typeof pageSchema>;

/** Letters and digits only, so that "NOAA 19" and "NOAA-19" compare equal. */
export const normalizeTitle = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "");

function toArticle(page: Page): WikipediaArticle | null {
  if (page.missing === true || page.fullurl === undefined) return null;
  const summary = page.extract?.trim() ?? "";
  return {
    title: page.title,
    description: page.description ?? null,
    summary: summary === "" ? null : summary,
    image:
      page.thumbnail === undefined
        ? null
        : {
            url: page.thumbnail.source,
            width: page.thumbnail.width,
            height: page.thumbnail.height,
          },
    url: page.fullurl,
  };
}

/** The best search result that really is about `topic`, if any. */
export function pickSearchResult(
  pages: readonly Page[],
  topic: Extract<WikipediaTopic, { kind: "search" }>,
): Page | null {
  const ranked = [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const name = normalizeTitle(topic.name);
  const exact = ranked.find((page) => normalizeTitle(page.title).includes(name));
  if (exact !== undefined) return exact;

  if (topic.family === null) return null;
  const family = normalizeTitle(topic.family);
  return ranked.find((page) => normalizeTitle(page.title) === family) ?? null;
}

/** `null` when Wikipedia has no article on the topic. */
export async function fetchWikipediaArticle(
  topic: WikipediaTopic,
): Promise<WikipediaArticle | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    // Lets a browser call the API from any site.
    origin: "*",
    prop: "pageimages|extracts|info|description",
    piprop: "thumbnail",
    pithumbsize: String(IMAGE_WIDTH),
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    inprop: "url",
  });
  if (topic.kind === "title") {
    params.set("titles", topic.title);
    params.set("redirects", "1");
  } else {
    params.set("generator", "search");
    params.set("gsrsearch", `"${topic.name}" ${topic.context}`);
    params.set("gsrlimit", "5");
  }

  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Wikipedia answered with HTTP ${response.status}.`);
  const pages = responseSchema.parse(await response.json()).query?.pages ?? [];

  const page = topic.kind === "title" ? (pages[0] ?? null) : pickSearchResult(pages, topic);
  return page === null ? null : toArticle(page);
}
