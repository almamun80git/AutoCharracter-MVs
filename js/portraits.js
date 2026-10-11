import { characters } from "./characters.js";
import { fetchCharacterPortrait, stripHtml } from "./api.js";
import { cacheCharacter, getCachedCharacter } from "./db.js";
import { placeholderDataUri } from "./layout.js";

async function one(c) {
  const cached = await getCachedCharacter(c.id).catch(() => null);
  if (cached?.image && Date.now() - cached.savedAt < 1000 * 60 * 60 * 24 * 7) {
    return { ...c, ...cached };
  }
  try {
    const remote = await fetchCharacterPortrait(c.search);
    const extra = {
      image: remote?.image?.large || placeholderDataUri(c.name),
      remoteName: remote?.name?.full || c.name,
      remoteUrl: remote?.siteUrl || "",
      remoteBio: stripHtml(remote?.description || "").slice(0, 420),
      savedAt: Date.now()
    };
    await cacheCharacter({ id: c.id, ...extra });
    return { ...c, ...extra };
  } catch {
    return { ...c, image: placeholderDataUri(c.name), remoteBio: c.blurb };
  }
}

export async function hydrate(list = characters) {
  const out = [];
  const size = 3;
  for (let i = 0; i < list.length; i += size) {
    const chunk = await Promise.all(list.slice(i, i + size).map(one));
    out.push(...chunk);
  }
  return out;
}

export function cardHTML(c, extraClass = "") {
  const img = c.image || placeholderDataUri(c.name);
  const bio = c.blurb;
  return `<article class="card ${extraClass}">
    <div class="media"><img alt="${c.name}" src="${img}"></div>
    <div class="body">
      <div class="meta">${c.series}</div>
      <h4>${c.name}</h4>
      <p>${bio}</p>
    </div>
  </article>`;
}
