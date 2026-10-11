import { characters, homeIds, hallIds } from "./characters.js";
import { hydrate, cardHTML } from "./portraits.js";
import { mountLayout, isNsfwOk, enableNsfw, disableNsfw } from "./layout.js";
import {
  searchAniListMedia,
  searchAniListCharacters,
  searchMangaDex,
  trendingAniList,
  catalogLinks,
  stripHtml
} from "./api.js";
import { saveSearch, recentSearches } from "./db.js";
import { sendChat, SYSTEM } from "./chat.js";

mountLayout();

const page = document.body.dataset.page;

if (page === "home") renderCollection(homeIds, "#home-grid");
if (page === "library") renderCollection(characters.map((c) => c.id), "#library-grid");
if (page === "hall") renderCollection(hallIds, "#hall-grid", "hall");
if (page === "trendings") renderTrendings();
if (page === "search") bindSearch();
if (page === "chat") bindChat();
if (page === "contact") bindContact();

async function renderCollection(ids, sel, extra = "") {
  const root = document.querySelector(sel);
  if (!root) return;
  root.innerHTML = `<p class="status">Loading portraits from AniList…</p>`;
  const subset = characters.filter((c) => ids.includes(c.id));
  const hydrated = await hydrate(subset);
  root.innerHTML = hydrated.map((c) => cardHTML(c, extra)).join("");
}

async function renderTrendings() {
  const root = document.querySelector("#trend-grid");
  if (!root) return;
  root.innerHTML = `<p class="status">Loading AniList trending…</p>`;
  try {
    const items = await trendingAniList();
    root.innerHTML = items
      .map((m) => {
        const title = m.title.english || m.title.romaji;
        const desc = stripHtml(m.description || "").slice(0, 140);
        return `<article class="card">
          <div class="media"><img alt="${title}" src="${m.coverImage.extraLarge}"></div>
          <div class="body">
            <div class="meta">score ${m.averageScore || "—"}</div>
            <h4>${title}</h4>
            <p>${desc}</p>
            <p class="meta"><a href="${m.siteUrl}" target="_blank" rel="noopener">AniList</a></p>
          </div>
        </article>`;
      })
      .join("");
  } catch (err) {
    root.innerHTML = `<p class="err">${err.message}. Open this folder through a local server (python -m http.server) if file:// is blocked.</p>`;
  }
}

function bindSearch() {
  const form = document.querySelector("#search-form");
  const out = document.querySelector("#results");
  const recent = document.querySelector("#recent");
  const nsfwBtn = document.querySelector("#nsfw-toggle");
  paintRecent(recent);
  paintNsfw(nsfwBtn);
  nsfwBtn?.addEventListener("click", () => {
    if (isNsfwOk()) disableNsfw();
    else {
      if (confirm("Enable adult catalog links (Hitomi, OmegaScans, Doujinshi) plus AniList/MangaDex adult filters? You must be 18+.")) {
        enableNsfw();
      }
    }
    paintNsfw(nsfwBtn);
  });
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = new FormData(form).get("q")?.toString().trim();
    const nsfw = isNsfwOk();
    if (!q) return;
    out.innerHTML = `<p class="status">Querying AniList + MangaDex…</p>`;
    try {
      const [anime, manga, chars, dex] = await Promise.all([
        searchAniListMedia(q, { adult: nsfw, type: "ANIME" }).catch(() => []),
        searchAniListMedia(q, { adult: nsfw, type: "MANGA" }).catch(() => []),
        searchAniListCharacters(q).catch(() => []),
        searchMangaDex(q, { nsfw }).catch(() => [])
      ]);
      await saveSearch({ query: q, nsfw, counts: { anime: anime.length, manga: manga.length, chars: chars.length, dex: dex.length } });
      paintRecent(recent);
      out.innerHTML = [
        section("AniList anime", anime.map(mediaRow).join("") || empty()),
        section("AniList manga", manga.map(mediaRow).join("") || empty()),
        section("AniList characters", chars.map(charRow).join("") || empty()),
        section("MangaDex", dex.map(dexRow).join("") || empty()),
        section("Other catalogs", catalogRow(q, nsfw))
      ].join("");
    } catch (err) {
      out.innerHTML = `<p class="err">${err.message}</p>`;
    }
  });
}

function paintNsfw(btn) {
  if (!btn) return;
  btn.textContent = isNsfwOk() ? "NSFW on" : "NSFW off";
  btn.classList.toggle("invert", isNsfwOk());
}

async function paintRecent(el) {
  if (!el) return;
  const rows = await recentSearches(8);
  el.innerHTML = rows.length
    ? rows.map((r) => `<span class="chip">${r.query}</span>`).join("")
    : `<span class="muted">No saved searches yet. Results cache in IndexedDB in this browser.</span>`;
}

function section(title, html) {
  return `<section class="section" style="border:0;padding:18px 0"><h3>${title}</h3><div class="grid grid-2">${html}</div></section>`;
}
function empty() {
  return `<p class="muted">No rows from this source.</p>`;
}
function mediaRow(m) {
  const title = m.title.english || m.title.romaji;
  return `<article class="result">
    <img alt="" src="${m.coverImage?.large || ""}">
    <div>
      <div><span class="badge">${m.type}</span>${m.isAdult ? `<span class="badge">18+</span>` : ""}</div>
      <h4><a href="${m.siteUrl}" target="_blank" rel="noopener">${title}</a></h4>
      <p class="muted">${stripHtml(m.description || "").slice(0, 160)}</p>
    </div>
  </article>`;
}
function charRow(c) {
  const series = c.media?.nodes?.[0]?.title?.romaji || "";
  return `<article class="result">
    <img alt="" src="${c.image?.large || ""}">
    <div>
      <div class="meta">${series}</div>
      <h4><a href="${c.siteUrl}" target="_blank" rel="noopener">${c.name.full}</a></h4>
      <p class="muted">${stripHtml(c.description || "").slice(0, 160)}</p>
    </div>
  </article>`;
}
function dexRow(m) {
  return `<article class="result">
    <img alt="" src="${m.cover}">
    <div>
      <span class="badge">${m.rating || "manga"}</span>
      <h4><a href="${m.url}" target="_blank" rel="noopener">${m.title}</a></h4>
      <p class="muted">MangaDex · ${m.year || "year n/a"}</p>
    </div>
  </article>`;
}
function catalogRow(q, nsfw) {
  const links = catalogLinks(q, nsfw);
  return links
    .map((l) => `<a class="chip" href="${l.url}" target="_blank" rel="noopener">${l.source}</a>`)
    .join(" ");
}

function bindChat() {
  const log = document.querySelector("#chat-log");
  const form = document.querySelector("#chat-form");
  const messages = [{ role: "system", content: SYSTEM }];
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const text = data.get("prompt")?.toString().trim();
    if (!text) return;
    form.querySelector("[name=prompt]").value = "";
    messages.push({ role: "user", content: text });
    appendMsg(log, "user", "You", text);
    const thinking = appendMsg(log, "bot", "Online model", "…");
    try {
      const reply = await sendChat({
        messages,
        provider: data.get("provider"),
        apiKey: data.get("key")
      });
      messages.push({ role: "assistant", content: reply });
      thinking.querySelector(".txt").textContent = reply;
    } catch (err) {
      thinking.querySelector(".txt").textContent = err.message;
    }
  });
}

function appendMsg(log, cls, who, text) {
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = `<div class="who">${who}</div><div class="txt"></div>`;
  el.querySelector(".txt").textContent = text;
  log.append(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function bindContact() {
  document.querySelector("#contact-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const box = document.querySelector("#contact-status");
    box.textContent = "Saved locally. This static site has no mail server — copy the note or email Maverick's HQ7 yourself.";
    e.target.reset();
  });
}
