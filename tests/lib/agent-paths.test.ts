import path from "path";

describe("agent-paths", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("derives default OpenClaw and Hermes paths from HOME", async () => {
    process.env.HOME = "/tmp/mc-home";
    delete process.env.MISSION_CONTROL_AGENTS_ROOT;
    delete process.env.MISSION_CONTROL_OPENCLAW_ROOT;
    delete process.env.MISSION_CONTROL_HERMES_ROOT;
    delete process.env.MISSION_CONTROL_VAULT_ROOT;

    const paths = await import("@/lib/agent-paths");

    expect(paths.AGENTS_ROOT).toBe(path.join("/tmp/mc-home", "Agents"));
    expect(paths.OPENCLAW_WORKSPACE).toBe(path.join("/tmp/mc-home", "Agents", ".openclaw", "workspace"));
    expect(paths.HERMES_SESSIONS_DIR).toBe(path.join("/tmp/mc-home", "Agents", ".hermes", "sessions"));
    expect(paths.SHARED_HANDOFFS_FILE).toBe(path.join("/tmp/mc-home", "Agents", "Agent Memory Vault", "Agent-Shared", "handoffs.md"));
  });

  it("honors mission control root overrides", async () => {
    process.env.MISSION_CONTROL_AGENTS_ROOT = "/custom/agents";
    process.env.MISSION_CONTROL_OPENCLAW_ROOT = "/custom/openclaw";
    process.env.MISSION_CONTROL_HERMES_ROOT = "/custom/hermes";
    process.env.MISSION_CONTROL_VAULT_ROOT = "/custom/vault";

    const paths = await import("@/lib/agent-paths");

    expect(paths.AGENTS_ROOT).toBe("/custom/agents");
    expect(paths.OPENCLAW_ROOT).toBe("/custom/openclaw");
    expect(paths.OPENCLAW_WORKSPACE).toBe(path.join("/custom/openclaw", "workspace"));
    expect(paths.HERMES_SESSIONS_DIR).toBe(path.join("/custom/hermes", "sessions"));
    expect(paths.SHARED_HANDOFFS_FILE).toBe(path.join("/custom/vault", "Agent-Shared", "handoffs.md"));
  });
});
