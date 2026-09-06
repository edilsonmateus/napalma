import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const explorePage = fs.readFileSync(path.join(projectRoot, "frontend/src/pages/ExplorePage.jsx"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "frontend/src/styles/globals.css"), "utf8");

describe("posicionamento do anúncio no Explorar", () => {
  it("mantém o anúncio na mesma grade dos cards, com mídia 4:5", () => {
    expect(explorePage).toContain('<div className="explore-ad-placement">');
    expect(styles).toContain('.screen-explore .explore-ad-placement');
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(styles).toContain('.ad-slot-card-explore_feed_large .ad-slot-media');
    expect(styles).toContain('aspect-ratio: 4 / 5;');
    expect(styles).toContain('min-height: 118px;');
    expect(styles).toContain('.ad-slot-card-explore_feed_large .ad-slot-body { row-gap: 10px; }');
    expect(styles).toContain('font-size: clamp(13px, 2.6vw, 18px);');
  });
});
