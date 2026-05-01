import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { NextResponse } from "next/server";
import { OPENCLAW_CRON_FILE, OPENCLAW_SESSIONS_FILE, OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "/Users/anthony";
const PROJECTS_DIR = path.join(HOME, "Projects");
const WORKSPACE = OPENCLAW_WORKSPACE;
const SESSIONS_FILE = OPENCLAW_SESSIONS_FILE;
const CRON_FILE = OPENCLAW_CRON_FILE;

export interface RadarEvent {
  id: string;
  timestamp: number;
  type: "commit" | "file" | "agent" | "cron";
  title: string;
  detail: string;
  source: string;
  repo?: string;
}

function getGitCommits(): RadarEvent[] {
  const events: RadarEvent[] = [];
  let dirs: string[] = [];

  try {
    dirs = fs.readdirSync(PROJECTS_DIR).slice(0, 15);
  } catch {
    return events;
  }

  for (const dir of dirs) {
    const repoPath = path.join(PROJECTS_DIR, dir);
    const result = spawnSync(
      "git",
      ["-C", repoPath, "log", "--oneline", "-n", "15", "--since=14 days ago", "--format=%H|%at|%an|%s"],
      { timeout: 4000, encoding: "utf-8" }
    );
    if (result.status !== 0 || !result.stdout) continue;

    for (const line of result.stdout.trim().split("\n").filter(Boolean)) {
      const [hash, ts, author, ...msgParts] = line.split("|");
      const tsNum = parseInt(ts || "0", 10);
      if (hash && tsNum > 0) {
        events.push({
          id: `git-${hash}`,
          timestamp: tsNum * 1000,
          type: "commit",
          title: msgParts.join("|") || "Commit",
          detail: `by ${author} in ${dir}`,
          source: dir,
          repo: dir,
        });
      }
    }
  }

  return events;
}

interface SessionEntry {
  sessionId?: string;
  label?: string;
  origin?: { label?: string };
  startedAt?: number;
  updatedAt?: number;
  status?: string;
}

interface CronJob {
  id?: string;
  name?: string;
  state?: { lastRunAtMs?: number; lastRunStatus?: string };
}

function getAgentEvents(): RadarEvent[] {
  const events: RadarEvent[] = [];
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return events;
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")) as Record<string, SessionEntry>;

    for (const [key, session] of Object.entries(sessions)) {
      const label = session.label || session.origin?.label || key;
      const cleanLabel = label.replace(/^Cron:\s*/, "").trim();
      const ts = session.updatedAt || session.startedAt || 0;
      if (ts <= 0) continue;

      events.push({
        id: `session-${session.sessionId || key}-${ts}`,
        timestamp: ts,
        type: "agent",
        title: cleanLabel,
        detail: `Status: ${session.status || "unknown"}`,
        source: "agents",
      });
    }
  } catch {}

  return events;
}

function getCronEvents(): RadarEvent[] {
  const events: RadarEvent[] = [];
  try {
    if (!fs.existsSync(CRON_FILE)) return events;
    const data = JSON.parse(fs.readFileSync(CRON_FILE, "utf-8")) as { jobs?: CronJob[] };

    for (const job of data.jobs || []) {
      const ts = job.state?.lastRunAtMs || 0;
      if (ts <= 0) continue;
      const isErr = (job.state?.lastRunStatus || "").toLowerCase() === "error";
      events.push({
        id: `cron-${job.id || job.name}-${ts}`,
        timestamp: ts,
        type: "cron",
        title: job.name || "Cron job",
        detail: isErr ? "Failed" : "Completed",
        source: "cron",
      });
    }
  } catch {}

  return events;
}

function getWorkspaceFileEvents(): RadarEvent[] {
  const events: RadarEvent[] = [];
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  try {
    const entries = fs.readdirSync(WORKSPACE, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!/\.(md|json|txt)$/.test(entry.name)) continue;
      try {
        const st = fs.statSync(path.join(WORKSPACE, entry.name));
        if (st.mtimeMs < cutoff) continue;
        events.push({
          id: `ws-${entry.name}-${st.mtimeMs}`,
          timestamp: st.mtimeMs,
          type: "file",
          title: `${entry.name} updated`,
          detail: `${Math.round(st.size / 1024)}KB — workspace file`,
          source: "workspace",
        });
      } catch {}
    }
  } catch {}

  return events;
}

export async function GET() {
  const [commits, agentEvents, cronEvents, fileEvents] = await Promise.all([
    Promise.resolve(getGitCommits()),
    Promise.resolve(getAgentEvents()),
    Promise.resolve(getCronEvents()),
    Promise.resolve(getWorkspaceFileEvents()),
  ]);

  const events = [...commits, ...agentEvents, ...cronEvents, ...fileEvents]
    .filter((e) => Number.isFinite(e.timestamp) && e.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 80);

  return NextResponse.json({ events });
}
