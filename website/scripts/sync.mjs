// Copies the repo's docs into the site, so there's one copy of each and the site never drifts:
// docs/guide/*.md, CONTRIBUTING.md and CHANGELOG.md become Starlight pages under /docs/, and the
// screenshots, social card, favicon and llms.txt are copied in. Everything it writes is
// git-ignored. `pnpm dev` and `pnpm build` run it first; `pnpm dev` also re-runs it when a
// source file changes (see watch() below).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(SITE, "..");
const REPO = "https://github.com/waddington/job-application-tracker";
const BASE = "/job-application-tracker";
const OUT = join(SITE, "src/content/docs/docs");

// Each page: where it comes from, its URL slug under /docs/, and its sidebar title.
const PAGES = [
  ["docs/guide/README.md", "index", "User guide"],
  ["docs/guide/install.md", "install"],
  ["docs/guide/your-data.md", "your-data"],
  ["docs/guide/using-the-app.md", "using-the-app"],
  ["docs/guide/customising.md", "customising"],
  ["docs/guide/commands.md", "commands"],
  ["docs/guide/troubleshooting.md", "troubleshooting"],
  ["CONTRIBUTING.md", "contributing"],
  ["CHANGELOG.md", "changelog"],
];
const SLUG = Object.fromEntries(PAGES.map(([src, slug]) => [src, slug]));

// A repo-relative link from `src`: another synced page goes to its docs URL, anything else
// in the repo to GitHub, and the web, mail and #anchors are left alone.
function rewrite(src, target) {
  if (/^(https?:|mailto:|#)/.test(target)) return target;
  const [path, hash] = target.split("#");
  const full = posix.normalize(posix.join(posix.dirname(src), path));
  const anchor = hash ? `#${hash}` : "";
  if (SLUG[full] !== undefined) {
    return `${BASE}/docs/${SLUG[full] === "index" ? "" : SLUG[full] + "/"}${anchor}`;
  }
  if (full.startsWith("docs/screenshots/")) return `${REPO}/raw/main/${full}`;
  return `${REPO}/blob/main/${full}${anchor}`;
}

// Plain text of the first paragraph after the title, for the page's meta description.
function describe(body) {
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|```|>|\||-|\d+\.|<)/.test(p));
  if (!para) return "";
  const text = para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 158 ? text.slice(0, 155).replace(/\s+\S*$/, "") + "…" : text;
}

function syncPage([src, slug, sidebar], order) {
  const file = join(ROOT, src);
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  const m = text.match(/^#\s+(.+)\n/);
  const title = m ? m[1].trim() : slug;
  let body = m ? text.slice(m.index + m[0].length) : text;
  // Markdown links and images, outside code blocks.
  body = body
    .split(/(```[\s\S]*?```)/)
    .map((part, i) => (i % 2 ? part : part.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (_, a, t, b) => a + rewrite(src, t) + b)))
    .join("");
  // Bare "(#12)" pull request numbers in the changelog become links.
  if (src === "CHANGELOG.md") body = body.replace(/#(\d+)\b/g, `[#$1](${REPO}/pull/$1)`);
  const fm = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(describe(body))}`,
    `editUrl: ${JSON.stringify(`${REPO}/edit/main/${src}`)}`,
    "sidebar:",
    `  order: ${order}`,
    ...(sidebar ? [`  label: ${JSON.stringify(sidebar)}`] : []),
    "---",
    "",
    `<!-- Generated from ${src} by website/scripts/sync.mjs. Edit that file, not this one. -->`,
    "",
  ];
  writeFileSync(join(OUT, `${slug}.md`), fm.join("\n") + body);
}

function copy(from, to) {
  const src = join(ROOT, from);
  if (!existsSync(src)) return;
  mkdirSync(dirname(join(SITE, to)), { recursive: true });
  copyFileSync(src, join(SITE, to));
}

function syncAll() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  PAGES.forEach((page, i) => syncPage(page, i));
  const shots = join(ROOT, "docs/screenshots");
  for (const name of readdirSync(shots)) {
    if (name.endsWith(".png")) copy(`docs/screenshots/${name}`, `src/assets/screenshots/${name}`);
  }
  copy("docs/social-preview.png", "public/og.png");
  copy("frontend/public/favicon.svg", "public/favicon.svg");
  copy("frontend/public/favicon.svg", "src/assets/logo.svg");
  copy("frontend/public/apple-touch-icon.png", "public/apple-touch-icon.png");
  copy("llms.txt", "public/llms.txt");
}

syncAll();
console.log(`sync: ${PAGES.length} docs pages and the screenshots copied from the repo`);

// `node scripts/sync.mjs --watch [astro dev options]` (what `pnpm dev` runs): start `astro dev`
// and re-sync whenever a source changes, so edits to the guide hot-reload too.
if (process.argv.includes("--watch")) {
  let timer;
  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll();
      console.log("sync: docs updated");
    }, 200);
  };
  watch(join(ROOT, "docs/guide"), again);
  watch(join(ROOT, "docs/screenshots"), again);
  for (const f of ["CONTRIBUTING.md", "CHANGELOG.md", "llms.txt"]) {
    if (existsSync(join(ROOT, f))) watch(join(ROOT, f), again);
  }
  console.log(`sync: watching ${relative(SITE, ROOT) || "."} for docs changes`);
  const extra = process.argv.slice(process.argv.indexOf("--watch") + 1);
  const astro = spawn("astro", ["dev", ...extra], { cwd: SITE, stdio: "inherit", shell: true });
  // Astro may detach into a background server (`astro dev stop` ends it) and exit 0: keep
  // watching the docs then. Ctrl+C ends both.
  astro.on("exit", (code) => code && process.exit(code));
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      astro.kill(sig);
      process.exit(0);
    });
  }
}
