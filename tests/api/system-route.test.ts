import path from "path";
import { execSync } from "child_process";
import { makeTempDir, writeFile } from "../helpers/temp";

vi.mock("child_process", () => {
  const mocked = { execSync: vi.fn() };
  return { ...mocked, default: mocked };
});

const execSyncMock = vi.mocked(execSync);

async function loadSystemRoute(openclawRoot: string) {
  vi.resetModules();
  process.env.MISSION_CONTROL_OPENCLAW_ROOT = openclawRoot;
  return import("@/app/api/system/route");
}

describe("system API route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    execSyncMock.mockImplementation((command: string | URL) => {
      const cmd = String(command);
      if (cmd.startsWith("df -h")) {
        return Buffer.from("Filesystem Size Used Avail Capacity iused ifree %iused Mounted on\n/dev/disk3s1s1 460Gi 20Gi 100Gi 17% 1 2 1% /\n");
      }
      if (cmd.startsWith("curl")) {
        return Buffer.from(JSON.stringify({ status: "ok" }));
      }
      if (cmd.startsWith("ps aux")) {
        return Buffer.from("2\n");
      }
      if (cmd.startsWith("node --version")) {
        return Buffer.from("v20.0.0\n");
      }
      return Buffer.from("");
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns system, gateway, cron, and agent status", async () => {
    const openclawRoot = makeTempDir("mc-openclaw-");
    writeFile(path.join(openclawRoot, "cron", "jobs.json"), JSON.stringify({
      jobs: [
        { id: "ok", enabled: true },
        { name: "bad", enabled: false, state: { lastRunStatus: "error", lastError: "failed" } },
      ],
    }));
    writeFile(path.join(openclawRoot, "agents", "main", "sessions", "sessions.json"), JSON.stringify({
      one: { status: "running" },
      two: { status: "stopped" },
    }));
    const route = await loadSystemRoute(openclawRoot);

    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gateway).toMatchObject({ status: "ok" });
    expect(body.disk).toMatchObject({ filesystem: "/dev/disk3s1s1", total: "460Gi", used: "20Gi", available: "100Gi", percent: "17%", mount: "/" });
    expect(body.cron).toEqual({ total: 2, enabled: 1, lastErrors: [{ name: "bad", error: "failed" }] });
    expect(body.agents).toEqual({ activeSessions: 1, openclawProcesses: 2 });
    expect(body.node).toBe("v20.0.0");
    expect(body.memory.percent).toEqual(expect.any(Number));
    expect(body.timestamp).toEqual(expect.any(Number));
  });
});
