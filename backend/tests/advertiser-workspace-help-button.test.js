import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("advertiser workspace help action", () => {
  it("uses the blue primary action treatment on the light workspace header", () => {
    expect(read("frontend/src/pages/AdvertiserPortalPage.jsx")).toContain('className="chip ads-workspace-help-link"');
    const css = read("frontend/src/styles/globals.css");
    expect(css).toContain(".ads-workspace-v2-header .ads-workspace-help-link {");
    expect(css).toContain("background: #2563eb;");
    expect(css).toContain("color: #fff;");
  });
});
