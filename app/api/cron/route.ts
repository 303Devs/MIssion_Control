import { NextResponse } from "next/server";
import fs from "fs";
import { OPENCLAW_CRON_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const CRON_FILE = OPENCLAW_CRON_FILE;

type CronSchedule = { kind?: string; expr?: string; tz?: string } | string | undefined;

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

function parseCronPart(part: string, min: number, max: number): Set<number> | null {
  const values = new Set<number>();
  for (const rawSegment of part.split(",")) {
    const segment = rawSegment.trim();
    if (!segment) return null;
    const [rangePart, stepPart] = segment.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step <= 0) return null;

    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
      start = a;
      end = b;
    } else {
      const value = Number(rangePart);
      if (!Number.isInteger(value)) return null;
      start = value;
      end = value;
    }

    if (start < min || end > max || start > end) return null;
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}

function cronExprFromSchedule(schedule: CronSchedule): string | null {
  if (typeof schedule === "string") return schedule;
  if (schedule?.kind === "cron" && schedule.expr) return schedule.expr;
  return null;
}

function computeNextCronRunMs(schedule: CronSchedule, fromMs = Date.now()): number | undefined {
  const expr = cronExprFromSchedule(schedule);
  if (!expr) return undefined;

  const parts = expr.trim().split(/\s+/);
  const fields = parts.length === 6 ? parts.slice(1) : parts;
  if (fields.length !== 5) return undefined;

  const [minPart, hourPart, domPart, monthPart, dowPart] = fields;
  const minutes = parseCronPart(minPart, 0, 59);
  const hours = parseCronPart(hourPart, 0, 23);
  const dom = parseCronPart(domPart, 1, 31);
  const months = parseCronPart(monthPart, 1, 12);
  const dow = parseCronPart(dowPart, 0, 7);
  if (!minutes || !hours || !dom || !months || !dow) return undefined;

  const start = new Date(fromMs + 60_000);
  start.setSeconds(0, 0);
  const maxChecks = 366 * 24 * 60;

  for (let i = 0; i < maxChecks; i++) {
    const d = new Date(start.getTime() + i * 60_000);
    const day = d.getDay();
    const dowMatches = dow.has(day) || (day === 0 && dow.has(7));
    if (
      minutes.has(d.getMinutes()) &&
      hours.has(d.getHours()) &&
      dom.has(d.getDate()) &&
      months.has(d.getMonth() + 1) &&
      dowMatches
    ) {
      return d.getTime();
    }
  }

  return undefined;
}

function normalizeLastRunResult(status: string | undefined): "success" | "fail" | "unknown" {
  const normalized = (status || "").toLowerCase();
  if (["success", "succeeded", "ok", "done", "completed"].includes(normalized)) return "success";
  if (["fail", "failed", "error", "errored"].includes(normalized)) return "fail";
  return "unknown";
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
      schedule?: CronSchedule;
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
      const nextRunAtMs = state.nextRunAtMs || computeNextCronRunMs(job.schedule);
      const nextRunCountdownSeconds = nextRunAtMs
        ? Math.max(0, Math.floor((nextRunAtMs - Date.now()) / 1000))
        : null;
      const lastRunStatus = state.lastRunStatus || state.lastStatus;
      return {
        id: job.id,
        name: job.name,
        enabled: job.enabled !== false,
        deleteAfterRun: job.deleteAfterRun || false,
        schedule: job.schedule,
        payload: job.payload,
        delivery: job.delivery,
        // Formatted fields for display
        nextRun: nextRunCountdownSeconds,
        nextRunLabel: formatNextRun(nextRunAtMs),
        nextRunCountdownSeconds,
        nextRunAtMs,
        lastRun: formatLastRun(state.lastRunAtMs),
        lastRunAtMs: state.lastRunAtMs,
        lastRunStatus,
        lastRunResult: normalizeLastRunResult(lastRunStatus),
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
