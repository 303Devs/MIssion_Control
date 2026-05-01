import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { NextResponse } from "next/server";
import { OPENCLAW_CRON_FILE, OPENCLAW_SESSIONS_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const CRON_FILE = OPENCLAW_CRON_FILE;
const SESSIONS_FILE = OPENCLAW_SESSIONS_FILE;

function exec(cmd: string, timeout = 4000): string {
  try {
    return execSync(cmd, { timeout, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  } catch {
    return "";
  }
}

interface DiskInfo {
  filesystem: string;
  total: string;
  used: string;
  available: string;
  percent: string;
  mount: string;
}

function getDisk(): DiskInfo | null {
  const raw = exec("df -h /");
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const parts = lines[1].split(/\s+/);
  // macOS df has extra iused/ifree/%iused columns before mount point
  // Find mount by looking for the last token starting with "/"
  const mount = parts.slice().reverse().find((p) => p.startsWith("/")) || "/";
  // Capacity (percent) always has "%" suffix
  const percentIdx = parts.findIndex((p) => p.includes("%") && !p.startsWith("/"));
  return {
    filesystem: parts[0] || "",
    total: parts[1] || "?",
    used: parts[2] || "?",
    available: parts[3] || "?",
    percent: percentIdx >= 0 ? parts[percentIdx] : "?",
    mount,
  };
}

function getGatewayStatus(): { status: string; latencyMs?: number } {
  const start = Date.now();
  const out = exec("curl -s --max-time 2 http://127.0.0.1:18789/health", 3000);
  if (!out) return { status: "offline" };
  try {
    const json = JSON.parse(out) as { status?: string };
    return { status: json.status || "online", latencyMs: Date.now() - start };
  } catch {
    return { status: out ? "online" : "offline", latencyMs: Date.now() - start };
  }
}

interface CronJob {
  id?: string;
  name?: string;
  schedule?: string;
  enabled?: boolean;
  state?: { lastRunAtMs?: number; lastRunStatus?: string; lastError?: string };
}

function getCronJobs(): CronJob[] {
  try {
    if (!fs.existsSync(CRON_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(CRON_FILE, "utf-8")) as { jobs?: CronJob[] };
    return data.jobs || [];
  } catch {
    return [];
  }
}

interface SessionEntry {
  status?: string;
  startedAt?: number;
  label?: string;
  origin?: { label?: string };
}

function getActiveSessions(): number {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return 0;
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")) as Record<string, SessionEntry>;
    return Object.values(sessions).filter((s) => (s.status || "").toLowerCase() === "running").length;
  } catch {
    return 0;
  }
}

function getOpenclawProcesses(): number {
  const out = exec("ps aux | grep -i openclaw | grep -v grep | wc -l");
  return parseInt(out, 10) || 0;
}

function getNodeVersion(): string {
  return exec("node --version") || "unknown";
}

export async function GET() {
  const [disk, gateway, nodeVersion, cronJobs, activeSessions, openclawProcesses] = await Promise.all([
    Promise.resolve(getDisk()),
    Promise.resolve(getGatewayStatus()),
    Promise.resolve(getNodeVersion()),
    Promise.resolve(getCronJobs()),
    Promise.resolve(getActiveSessions()),
    Promise.resolve(getOpenclawProcesses()),
  ]);

  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;

  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const uptimeSecs = os.uptime();

  // Format uptime as human readable
  const uptimeDays = Math.floor(uptimeSecs / 86400);
  const uptimeHrs = Math.floor((uptimeSecs % 86400) / 3600);
  const uptimeMins = Math.floor((uptimeSecs % 3600) / 60);
  const uptimeStr = uptimeDays > 0
    ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMins}m`
    : `${uptimeHrs}h ${uptimeMins}m`;

  return NextResponse.json({
    gateway,
    disk,
    memory: {
      total: memTotal,
      used: memUsed,
      free: memFree,
      percent: Math.round((memUsed / memTotal) * 100),
      totalGb: (memTotal / 1024 ** 3).toFixed(1),
      usedGb: (memUsed / 1024 ** 3).toFixed(1),
    },
    cpu: {
      count: cpuCount,
      load1: loadAvg[0].toFixed(2),
      load5: loadAvg[1].toFixed(2),
      model: os.cpus()[0]?.model || "Unknown",
    },
    uptime: { seconds: uptimeSecs, formatted: uptimeStr },
    node: nodeVersion,
    platform: `${os.type()} ${os.release()}`,
    cron: {
      total: cronJobs.length,
      enabled: cronJobs.filter((j) => j.enabled !== false).length,
      lastErrors: cronJobs
        .filter((j) => j.state?.lastRunStatus === "error")
        .map((j) => ({ name: j.name || j.id || "unknown", error: j.state?.lastError || "Unknown error" })),
    },
    agents: { activeSessions, openclawProcesses },
    timestamp: Date.now(),
  });
}
