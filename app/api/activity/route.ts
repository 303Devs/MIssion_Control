import fs from "fs";
import { NextResponse } from "next/server";
import { OPENCLAW_CRON_FILE, OPENCLAW_SESSIONS_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const SESSIONS_FILE = OPENCLAW_SESSIONS_FILE;
const CRON_FILE = OPENCLAW_CRON_FILE;
const MAX_EVENTS = 20;

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: "spawn" | "done" | "error" | "cron";
  text: string;
  source: "session" | "cron";
}

interface SessionEntry {
  sessionId?: string;
  startedAt?: number;
  updatedAt?: number;
  status?: string;
  abortedLastRun?: boolean;
  label?: string;
  origin?: { label?: string };
}

interface CronJob {
  id?: string;
  name?: string;
  state?: {
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastError?: string;
  };
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function getSessionLabel(key: string, session: SessionEntry) {
  const rawLabel = session.label || session.origin?.label || key;
  return rawLabel.replace(/^Cron:\s*/, "").trim();
}

function buildSessionEvents(sessions: Record<string, SessionEntry>) {
  const events: ActivityEvent[] = [];

  for (const [key, session] of Object.entries(sessions)) {
    const label = getSessionLabel(key, session);
    const startedAt = session.startedAt || session.updatedAt || 0;
    const updatedAt = session.updatedAt || startedAt;
    const status = (session.status || "").toLowerCase();
    const sessionId = session.sessionId || key;

    if (startedAt > 0) {
      events.push({
        id: `${sessionId}-spawn`,
        timestamp: startedAt,
        type: "spawn",
        text: `Agent spawned: ${label}`,
        source: "session",
      });
    }

    if (updatedAt > 0 && status && status !== "running") {
      const terminalType: ActivityEvent["type"] =
        status === "error" || session.abortedLastRun ? "error" : "done";

      events.push({
        id: `${sessionId}-${terminalType}`,
        timestamp: updatedAt,
        type: terminalType,
        text:
          terminalType === "error"
            ? `Agent errored: ${label}`
            : `Agent completed: ${label}`,
        source: "session",
      });
    }
  }

  return events;
}

function buildCronEvents(jobs: CronJob[]) {
  return jobs.flatMap((job) => {
    const lastRunAtMs = job.state?.lastRunAtMs || 0;
    if (lastRunAtMs <= 0) return [];

    const status = (job.state?.lastRunStatus || "").toLowerCase();
    const isError = status === "error";

    return [
      {
        id: `${job.id || job.name || "cron"}-${lastRunAtMs}`,
        timestamp: lastRunAtMs,
        type: isError ? "error" : "cron",
        text: isError
          ? `Cron failed: ${job.name || "Unnamed job"}`
          : `Cron ran: ${job.name || "Unnamed job"}`,
        source: "cron" as const,
      },
    ];
  });
}

export async function GET() {
  const sessions = readJsonFile<Record<string, SessionEntry>>(SESSIONS_FILE, {});
  const cronData = readJsonFile<{ jobs?: CronJob[] }>(CRON_FILE, { jobs: [] });

  const events = [...buildSessionEvents(sessions), ...buildCronEvents(cronData.jobs || [])]
    .filter((event) => Number.isFinite(event.timestamp) && event.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_EVENTS);

  return NextResponse.json({ events });
}
