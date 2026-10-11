const ANILIST = "https://graphql.anilist.co";
const MANGADEX = "https://api.mangadex.org";

export async function anilistQuery(query, variables = {}) {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error("AniList request failed");
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "AniList error");
  return json.data;
}

export async function fetchCharacterPortrait(search) {
  const data = await anilistQuery(
    `query ($search: String) {
      Character(search: $search) {
        id
        name { full native }
        image { large }
        description(asHtml: false)
        siteUrl
        gender
        media(sort: POPULARITY_DESC, perPage: 3) {
          nodes { title { romaji english } type }
        }
      }
    }`,
    { search }
  );
  return data.Character;
}

export async function searchAniListMedia(search, { adult = false, type } = {}) {
  const data = await anilistQuery(
    `query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 16) {
        media(search: $search, type: $type, sort: SEARCH_MATCH) {
          id
          type
          isAdult
          siteUrl
          format
          averageScore
          title { romaji english native }
          coverImage { extraLarge large }
          description(asHtml: false)
        }
      }
    }`,
    { search, type: type || undefined }
  );
  const media = data.Page.media || [];
  if (adult) return media;
  return media.filter((m) => !m.isAdult);
}

export async function searchAniListCharacters(search) {
  const data = await anilistQuery(
    `query ($search: String) {
      Page(page: 1, perPage: 16) {
        characters(search: $search, sort: SEARCH_MATCH) {
          id
          siteUrl
          name { full native }
          image { large }
          description(asHtml: false)
          media(sort: POPULARITY_DESC, perPage: 1) {
            nodes { title { romaji } }
          }
        }
      }
    }`,
    { search }
  );
  return data.Page.characters || [];
}

export async function trendingAniList() {
  const data = await anilistQuery(
    `query {
      Page(page: 1, perPage: 12) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          siteUrl
          averageScore
          title { romaji english }
          coverImage { extraLarge }
          description(asHtml: false)
        }
      }
    }`
  );
  return data.Page.media || [];
}

export async function searchMangaDex(title, { nsfw = false } = {}) {
  const ratings = nsfw
    ? ["safe", "suggestive", "erotica", "pornographic"]
    : ["safe", "suggestive"];
  const params = new URLSearchParams({ title, limit: "16" });
  ratings.forEach((r) => params.append("contentRating[]", r));
  params.append("includes[]", "cover_art");
  params.append("order[relevance]", "desc");
  const res = await fetch(`${MANGADEX}/manga?${params.toString()}`);
  if (!res.ok) throw new Error("MangaDex request failed");
  const json = await res.json();
  return (json.data || []).map((item) => {
    const cover = item.relationships?.find((r) => r.type === "cover_art");
    const file = cover?.attributes?.fileName;
    const titleObj = item.attributes?.title || {};
    const name = titleObj.en || Object.values(titleObj)[0] || "Untitled";
    return {
      id: item.id,
      title: name,
      rating: item.attributes?.contentRating,
      year: item.attributes?.year,
      url: `https://mangadex.org/title/${item.id}`,
      cover: file ? `https://uploads.mangadex.org/covers/${item.id}/${file}.256.jpg` : ""
    };
  });
}

export function catalogLinks(query, nsfw) {
  const q = encodeURIComponent(query);
  const links = [
    { source: "AniList", url: `https://anilist.co/search/anime?search=${q}` },
    { source: "MangaDex", url: `https://mangadex.org/search?q=${q}` },
    { source: "MangaBaka", url: `https://mangabaka.dev/?q=${q}` }
  ];
  if (nsfw) {
    links.push(
      { source: "Hitomi.la", url: `https://hitomi.la/search.html?${q}` },
      { source: "OmegaScans", url: `https://omegascans.org/?s=${q}` },
      { source: "Doujinshi.org", url: `https://www.doujinshi.org/search/simple/?T=objects&sn=${q}` }
    );
  }
  return links;
}

export function stripHtml(text = "") {
  return String(text)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/~!|!~/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/__/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
