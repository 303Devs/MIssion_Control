import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { NextResponse } from "next/server";
import { OPENCLAW_CRON_FILE, OPENCLAW_SESSIONS_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "/Users/anthony";
const PROJECTS_DIR = path.join(HOME, "Projects");
const SESSIONS_FILE = OPENCLAW_SESSIONS_FILE;
const CRON_FILE = OPENCLAW_CRON_FILE;
const MAX_PROJECTS = 25;
const COMMITS_PER_PROJECT = 5;

export interface RadarEvent {
  id: string;
  timestamp: number;
  type: "commit" | "agent" | "cron";
  title: string;
  detail: string;
  source: string;
  repo?: string;
  model?: string;
  modelProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

function getGitRepos(): string[] {
  try {
    return fs
      .readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((dir) => fs.existsSync(path.join(PROJECTS_DIR, dir, ".git")))
      .sort((a, b) => {
        const aMtime = fs.statSync(path.join(PROJECTS_DIR, a)).mtimeMs;
        const bMtime = fs.statSync(path.join(PROJECTS_DIR, b)).mtimeMs;
        return bMtime - aMtime;
      })
      .slice(0, MAX_PROJECTS);
  } catch {
    return [];
  }
}

function getGitCommits(): RadarEvent[] {
  const events: RadarEvent[] = [];

  for (const dir of getGitRepos()) {
    const repoPath = path.join(PROJECTS_DIR, dir);
    const result = spawnSync(
      "git",
      [
        "-C",
        repoPath,
        "log",
        `-n${COMMITS_PER_PROJECT}`,
        "--format=%H|%at|%an|%s",
      ],
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
          detail: `${hash.slice(0, 7)} by ${author || "unknown"} in ${dir}`,
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
  endedAt?: number;
  runtimeMs?: number;
  status?: string;
  model?: string;
  modelProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface CronJob {
  id?: string;
  name?: string;
  state?: { lastRunAtMs?: number; lastRunStatus?: string };
}

function getDurationMs(session: SessionEntry) {
  if (typeof session.runtimeMs === "number" && session.runtimeMs >= 0) return session.runtimeMs;
  const start = session.startedAt || 0;
  const end = session.endedAt || session.updatedAt || 0;
  if (start > 0 && end >= start) return end - start;
  return undefined;
}

function getAgentEvents(): RadarEvent[] {
  const events: RadarEvent[] = [];
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return events;
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")) as Record<string, SessionEntry>;

    for (const [key, session] of Object.entries(sessions)) {
      const label = session.label || session.origin?.label || key;
      const cleanLabel = label.replace(/^Cron:\s*/, "").trim();
      const ts = session.endedAt || session.updatedAt || session.startedAt || 0;
      if (ts <= 0) continue;

      const tokenSummary = session.totalTokens ? ` · ${session.totalTokens.toLocaleString()} tokens` : "";
      const modelSummary = session.model ? ` · ${session.model}` : "";

      events.push({
        id: `session-${session.sessionId || key}-${ts}`,
        timestamp: ts,
        type: "agent",
        title: cleanLabel,
        detail: `Status: ${session.status || "unknown"}${modelSummary}${tokenSummary}`,
        source: "agents",
        model: session.model,
        modelProvider: session.modelProvider,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        durationMs: getDurationMs(session),
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
      const status = (job.state?.lastRunStatus || "").toLowerCase();
      const isErr = status === "error" || status === "fail" || status === "failed";
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

export async function GET() {
  const [commits, agentEvents, cronEvents] = await Promise.all([
    Promise.resolve(getGitCommits()),
    Promise.resolve(getAgentEvents()),
    Promise.resolve(getCronEvents()),
  ]);

  const events = [...commits, ...agentEvents, ...cronEvents]
    .filter((e) => Number.isFinite(e.timestamp) && e.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 80);

  return NextResponse.json({ events });
}
