// The app's screenshots (copied from docs/screenshots by scripts/sync.mjs), by name, for
// astro:assets to resize and convert. All of them show made-up demo data.
import type { ImageMetadata } from "astro";

const files = import.meta.glob<{ default: ImageMetadata }>("./assets/screenshots/*.png", { eager: true });

export function shot(name: string): ImageMetadata {
  const found = files[`./assets/screenshots/${name}.png`];
  if (!found) throw new Error(`No screenshot docs/screenshots/${name}.png (run pnpm sync)`);
  return found.default;
}
