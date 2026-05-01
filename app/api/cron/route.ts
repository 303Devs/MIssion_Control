import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_CRON_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const CRON_FILE = OPENCLAW_CRON_FILE;

function formatNextRun(ms: number | undefined): string | null {
  if (!ms) return null;
  const now = Date.now();
  const diff = ms - now;

  if (diff < 0) return "overdue";
  if (diff < 60_000) return "< 1 min";
  if (diff < 3_600_000) return `in ${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)}h`;
  return `in ${Math.round(diff / 86_400_000)}d`;
}

function formatLastRun(ms: number | undefined): string | null {
  if (!ms) return null;
  const diff = Date.now() - ms;

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export async function GET() {
  try {
    if (!fs.existsSync(CRON_FILE)) {
      return NextResponse.json({ jobs: [], error: "No cron jobs file found" });
    }
    const raw = fs.readFileSync(CRON_FILE, "utf-8");
    const data = JSON.parse(raw);
    const rawJobs = Array.isArray(data) ? data : data.jobs || [];

    const jobs = rawJobs.map((job: {
      id?: string;
      name?: string;
      enabled?: boolean;
      deleteAfterRun?: boolean;
      schedule?: { kind?: string; expr?: string; tz?: string } | string;
      payload?: { kind?: string; model?: string };
      delivery?: { channel?: string; to?: string };
      state?: {
        nextRunAtMs?: number;
        lastRunAtMs?: number;
        lastRunStatus?: string;
        lastStatus?: string;
        lastDurationMs?: number;
        lastDelivered?: boolean;
        consecutiveErrors?: number;
      };
    }) => {
      const state = job.state || {};
      return {
        id: job.id,
        name: job.name,
        enabled: job.enabled !== false,
        deleteAfterRun: job.deleteAfterRun || false,
        schedule: job.schedule,
        payload: job.payload,
        delivery: job.delivery,
        // Formatted fields for display
        nextRun: formatNextRun(state.nextRunAtMs),
        nextRunAtMs: state.nextRunAtMs,
        lastRun: formatLastRun(state.lastRunAtMs),
        lastRunAtMs: state.lastRunAtMs,
        lastRunStatus: state.lastRunStatus || state.lastStatus,
        lastDurationMs: state.lastDurationMs,
        lastDelivered: state.lastDelivered,
        consecutiveErrors: state.consecutiveErrors || 0,
      };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ jobs: [], error: String(err) });
  }
}
