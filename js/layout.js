const AGE_KEY = "acmv-age-ok";
const NSFW_KEY = "acmv-nsfw-ok";

export function isAgeOk() {
  return localStorage.getItem(AGE_KEY) === "1";
}
export function isNsfwOk() {
  return isAgeOk() && localStorage.getItem(NSFW_KEY) === "1";
}

const NAV = [
  ["index.html", "Home"],
  ["features.html", "Features"],
  ["trendings.html", "Trendings"],
  ["search.html", "Search"],
  ["chat.html", "AI Chat"],
  ["library.html", "Library"],
  ["hall-of-fame.html", "Hall of Fame"],
  ["about.html", "About"],
  ["contact.html", "Contact"]
];

function currentFile() {
  const file = location.pathname.split("/").pop() || "index.html";
  return file === "" ? "index.html" : file;
}

export function mountLayout() {
  const header = document.createElement("header");
  header.className = "site-header";
  const file = currentFile();
  header.innerHTML = `
    <div class="wrap">
      <div class="brand">
        <h1>AutoCharracter MV's</h1>
        <small>site by Maverick's HQ7</small>
      </div>
      <nav class="nav" aria-label="Primary">
        ${NAV.map(([href, label]) => `<a href="${href}" class="${file === href ? "active" : ""}">${label}</a>`).join("")}
        <span class="nsfw-flag" data-nsfw-flag></span>
      </nav>
    </div>`;
  document.body.prepend(header);

  const footer = document.createElement("footer");
  footer.className = "footer wrap";
  footer.innerHTML = `<span>AutoCharracter MV's · B&amp;W interface · character stills remain in color</span><span>18+ catalogs stay behind confirmation · no local AI model</span>`;
  document.body.append(footer);

  mountAgeGate();
  updateNsfwFlag();
}

function mountAgeGate() {
  if (isAgeOk()) return;
  const gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML = `
    <div class="gate-box">
      <p class="kicker">Age confirmation</p>
      <h1>This site includes 18+ catalogs</h1>
      <p>Home, library, search, and chat can surface adult anime/manga metadata from the public internet. You must be 18 or older to continue. We do not host underage sexual content.</p>
      <div class="gate-actions">
        <button class="btn invert" type="button" data-age-yes>I am 18+</button>
        <button class="btn ghost" type="button" data-age-no>Leave</button>
      </div>
    </div>`;
  document.body.append(gate);
  gate.querySelector("[data-age-yes]").onclick = () => {
    localStorage.setItem(AGE_KEY, "1");
    gate.remove();
  };
  gate.querySelector("[data-age-no]").onclick = () => {
    location.href = "https://www.google.com";
  };
}

export function enableNsfw() {
  if (!isAgeOk()) return false;
  localStorage.setItem(NSFW_KEY, "1");
  updateNsfwFlag();
  return true;
}

export function disableNsfw() {
  localStorage.removeItem(NSFW_KEY);
  updateNsfwFlag();
}

function updateNsfwFlag() {
  const el = document.querySelector("[data-nsfw-flag]");
  if (el) el.textContent = isNsfwOk() ? "NSFW catalogs: on" : "NSFW catalogs: off";
}

export function placeholderDataUri(name) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect fill="#111" width="100%" height="100%"/><text x="50%" y="50%" fill="#fff" font-family="monospace" font-size="64" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
