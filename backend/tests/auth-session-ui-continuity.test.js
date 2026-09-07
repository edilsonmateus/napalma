import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(
  path.join(process.cwd(), "../frontend/src/App.jsx"),
  "utf8"
);

describe("authenticated UI continuity", () => {
  it("keeps authenticated routes mounted during background session recovery", () => {
    expect(appSource).toContain("hasValidatedSessionRef");
    expect(appSource).toContain("const shouldBlockCurrentScreen = !hasValidatedSessionRef.current;");
    expect(appSource).toContain("if (token && !authReady");
    expect(appSource).not.toContain('if (sessionStatus === "degraded") return <Navigate to="/explore"');
  });

  it("reserves the degraded full-screen recovery for sessions without a usable user", () => {
    expect(appSource).toContain('if (token && !user && sessionStatus === "degraded"');
    expect(appSource).toContain("Seus dados preenchidos foram preservados");
  });
});
