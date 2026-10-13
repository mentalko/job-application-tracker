// Copies what the site shows from the rest of the repo, so there's one copy of each: the app's
// screenshots, the social card, the favicon and llms.txt. Everything it writes is git-ignored.
// `pnpm dev` and `pnpm build` run it first; `pnpm dev` also re-runs it when a source changes.
import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(SITE, "..");

// Copy only when the content differs, so the dev server reloads only what changed.
function copy(from, to) {
  const src = join(ROOT, from);
  if (!existsSync(src)) return;
  const dest = join(SITE, to);
  const content = readFileSync(src);
  if (existsSync(dest) && readFileSync(dest).equals(content)) return;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
}

function syncAll() {
  for (const name of readdirSync(join(ROOT, "docs/screenshots"))) {
    if (name.endsWith(".png")) copy(`docs/screenshots/${name}`, `src/assets/screenshots/${name}`);
  }
  copy("docs/social-preview.png", "public/og.png");
  copy("frontend/public/favicon.svg", "public/favicon.svg");
  copy("frontend/public/apple-touch-icon.png", "public/apple-touch-icon.png");
  copy("llms.txt", "public/llms.txt");
}

syncAll();
console.log("sync: screenshots, social card, favicon and llms.txt copied from the repo");

// `node scripts/sync.mjs --watch [astro dev options]` (what `pnpm dev` runs): start `astro dev`
// and re-sync whenever a source changes.
if (process.argv.includes("--watch")) {
  let timer;
  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll();
      console.log("sync: updated");
    }, 200);
  };
  watch(join(ROOT, "docs/screenshots"), again);
  // Watch the folders, not the files: editors often save by replacing a file.
  watch(ROOT, (_event, name) => name === "llms.txt" && again());
  watch(join(ROOT, "docs"), (_event, name) => name === "social-preview.png" && again());
  const extra = process.argv.slice(process.argv.indexOf("--watch") + 1);
  const astro = spawn("astro", ["dev", ...extra], { cwd: SITE, stdio: "inherit", shell: true });
  // Astro may detach into a background server (`astro dev stop` ends it) and exit 0: keep
  // watching then. Ctrl+C ends both.
  astro.on("exit", (code, signal) => (code || signal) && process.exit(code ?? 1));
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      astro.kill(sig);
      process.exit(0);
    });
  }
}
