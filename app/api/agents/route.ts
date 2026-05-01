import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { OPENCLAW_CRON_FILE, OPENCLAW_SESSIONS_FILE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const AGENTS_FILE = path.join(process.cwd(), "data", "agents.json");
const HISTORY_FILE = path.join(process.cwd(), "data", "agent-history.json");
const SESSIONS_FILE = OPENCLAW_SESSIONS_FILE;
const CRON_JOBS_FILE = OPENCLAW_CRON_FILE;
const GATEWAY_URL = "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

// 15 minutes — if an agent's most recent session was updated within this window, they're "active"
const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;

// Cache CLI results for 10 seconds to keep response fast (frontend polls every few seconds)
let cliCache: { data: OpenClawSession[]; fetchedAt: number } | null = null;
const CLI_CACHE_TTL_MS = 10_000;

// Known agent name prefixes that appear in session labels
const KNOWN_AGENTS = [
  "bob",
  "alice",
  "jeeves",
  "gilfoyle",
  "turing",
  "ada",
  "nora",
  "ive",
  "joyce",
  "banksy",
  "sagan",
  "orwell",
  "spangler",
  "mustafa",
  "atticus",
  "thich",
  "buffett",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

interface OpenClawSession {
  key: string;
  updatedAt: number;
  ageMs?: number;
  sessionId: string;
  model?: string;
  kind?: string;
  status?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  label?: string;
}

interface SessionEntry {
  sessionId: string;
  updatedAt: number;
  label?: string;
  status?: string;
  model?: string;
  [key: string]: unknown;
}

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    consecutiveErrors?: number;
    lastError?: string;
  };
  [key: string]: unknown;
}

interface AgentMeta {
  id: string;
  name: string;
  role: string;
  description: string;
  model: string;
  capabilities: string[];
  avatar: string;
  color: string;
  isOrchestrator: boolean;
  reports: string[];
  status?: string;
  currentTask?: string | null;
  activeSince?: string;
  tasksCompleted?: number;
  lastActive?: string | null;
  cronJobs?: CronJob[];
}

interface AgentHistoryEntry {
  firstSeen: number | null;
  lastSeen: number | null;
  sessionsTracked: string[];
  tasksCompleted: number;
}

interface AgentHistory {
  lastSyncedAt: number;
  agents: Record<string, AgentHistoryEntry>;
}

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 5000,
      shell: "/bin/bash",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

async function checkGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      headers: GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {},
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Get active sessions from the openclaw CLI (sessions active in last 60 min).
 * Results are cached for CLI_CACHE_TTL_MS to avoid 1.5s CLI overhead on every poll.
 */
function getActiveSessions(): OpenClawSession[] {
  const now = Date.now();
  if (cliCache && (now - cliCache.fetchedAt) < CLI_CACHE_TTL_MS) {
    return cliCache.data;
  }

  const raw = runCmd("openclaw sessions --all-agents --active 60 --json");
  if (!raw) {
    cliCache = { data: [], fetchedAt: now };
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    const sessions = (parsed.sessions || []) as OpenClawSession[];
    cliCache = { data: sessions, fetchedAt: now };
    return sessions;
  } catch {
    cliCache = { data: [], fetchedAt: now };
    return [];
  }
}

/**
 * Read the full sessions.json for labels and historical data.
 */
function getAllSessions(): Record<string, SessionEntry> {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return {};
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, SessionEntry>;
  } catch {
    return {};
  }
}

/**
 * Read cron jobs from jobs.json.
 */
function getCronJobs(): CronJob[] {
  try {
    if (!fs.existsSync(CRON_JOBS_FILE)) return [];
    const raw = fs.readFileSync(CRON_JOBS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return (parsed.jobs || []) as CronJob[];
  } catch {
    return [];
  }
}

/**
 * Read agent-history.json, returning a default structure if missing.
 */
function getAgentHistory(): AgentHistory {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return { lastSyncedAt: 0, agents: {} };
    }
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")) as AgentHistory;
  } catch {
    return { lastSyncedAt: 0, agents: {} };
  }
}

/**
 * Sync sessions.json into agent-history.json:
 * - Find session IDs not yet in sessionsTracked
 * - Append them, increment tasksCompleted, update firstSeen/lastSeen
 * - Write the updated history back to disk
 */
function syncHistoryFromSessions(
  allSessions: Record<string, SessionEntry>,
  history: AgentHistory
): AgentHistory {
  let dirty = false;

  for (const [key, entry] of Object.entries(allSessions)) {
    // Extract the session UUID from the key
    const parts = key.split(":");
    const sessionId = parts[parts.length - 1];

    // Determine which agent owns this session
    let agentId: string | null = null;

    if (key === "agent:main:main") {
      agentId = "bob";
    } else if (key.includes(":discord:") || key.includes(":cron:")) {
      agentId = "bob";
    } else if (key.includes(":subagent:")) {
      const label = entry.label || "";
      agentId = extractAgentFromLabel(label) || "bob";
    }

    if (!agentId) continue;

    // Initialise history entry if missing
    if (!history.agents[agentId]) {
      history.agents[agentId] = {
        firstSeen: null,
        lastSeen: null,
        sessionsTracked: [],
        tasksCompleted: 0,
      };
    }

    const rec = history.agents[agentId];

    // Skip if already tracked
    if (rec.sessionsTracked.includes(sessionId)) continue;

    // Only count completed sessions as tasks
    const isRunning = entry.status === "running";
    const isDone = !isRunning && (entry.status === "done" || (!entry.status && entry.updatedAt > 0));

    rec.sessionsTracked.push(sessionId);
    if (isDone) rec.tasksCompleted++;

    const ts = entry.updatedAt;
    if (ts > 0) {
      if (rec.firstSeen === null || ts < rec.firstSeen) rec.firstSeen = ts;
      if (rec.lastSeen === null || ts > rec.lastSeen) rec.lastSeen = ts;
    }

    dirty = true;
  }

  if (dirty) {
    history.lastSyncedAt = Date.now();
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch {
      // Non-fatal — we still use the in-memory history for this request
    }
  }

  return history;
}

/**
 * Format a firstSeen timestamp as 'Mar 22' or 'never'.
 */
function formatActiveSince(firstSeen: number | null): string {
  if (!firstSeen) return "never";
  return new Date(firstSeen).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Extract agent name from a session label.
 * Handles formats:
 *   'gilfoyle-mc-live-agents'          → 'gilfoyle'
 *   'Charles — Essay Research Review'  → 'charles'
 *   'Joyce - Essay Editorial Review'   → 'joyce'
 *   Case-insensitive matching.
 */
function extractAgentFromLabel(label: string): string | null {
  if (!label) return null;
  // Strip leading emoji/symbols (anything before the first ASCII letter)
  const stripped = label.replace(/^[^\p{L}]+/u, "");
  const lower = stripped.toLowerCase();

  for (const agent of KNOWN_AGENTS) {
    if (lower === agent) return agent;
    // 'agentname-task' (no space before hyphen)
    if (lower.startsWith(agent + "-")) return agent;
    // 'AgentName — Task' (em dash with spaces)
    if (lower.startsWith(agent + " \u2014 ")) return agent;
    // 'AgentName - Task' (hyphen with spaces)
    if (lower.startsWith(agent + " - ")) return agent;
    // 'AgentName: Task' (colon with space)
    if (lower.startsWith(agent + ": ")) return agent;
    // 'AgentName:Task' (colon without space)
    if (lower.startsWith(agent + ":")) return agent;
  }

  // Cron labels like "Cron: Morning Briefing" — those are Bob
  if (lower.startsWith("cron:")) return "bob";
  return null;
}

/**
 * Build a map of agentId → live data including uptime tracking.
 */
function buildAgentLiveData(
  activeSessions: OpenClawSession[],
  allSessions: Record<string, SessionEntry>
) {
  const agentData: Record<string, {
    runningSessions: number;
    lastUpdatedAt: number;
    earliestUpdatedAt: number;
    currentTask: string | null;
    completedCount: number;
    totalTokens: number;
    model: string | null;
  }> = {};

  const init = (id: string) => {
    if (!agentData[id]) {
      agentData[id] = {
        runningSessions: 0,
        lastUpdatedAt: 0,
        earliestUpdatedAt: Infinity,
        currentTask: null,
        completedCount: 0,
        totalTokens: 0,
        model: null,
      };
    }
  };

  const updateTimestamps = (d: typeof agentData[string], ts: number) => {
    if (ts > 0) {
      if (ts < d.earliestUpdatedAt) d.earliestUpdatedAt = ts;
      if (ts > d.lastUpdatedAt) d.lastUpdatedAt = ts;
    }
  };

  // Initialize all known agents
  for (const agent of KNOWN_AGENTS) init(agent);

  // Process active sessions from CLI output (these have real-time status)
  for (const session of activeSessions) {
    const key = session.key;

    // Bob = main session
    if (key === "agent:main:main") {
      init("bob");
      const d = agentData["bob"];
      if (session.status === "running") d.runningSessions++;
      updateTimestamps(d, session.updatedAt);
      d.model = session.model || d.model;
      d.totalTokens += session.totalTokens || 0;
      continue;
    }

    // Cron sessions are Bob's responsibility
    if (key.includes(":cron:")) {
      init("bob");
      const d = agentData["bob"];
      const cronEntry = allSessions[key];
      const cronRunning = session.status === "running" || cronEntry?.status === "running";
      if (cronRunning) d.runningSessions++;
      updateTimestamps(d, session.updatedAt);
      continue;
    }

    // Subagent sessions — look up label and status from allSessions
    if (key.includes(":subagent:")) {
      const entry = allSessions[key];
      const label = entry?.label || session.label || "";
      const agentId = extractAgentFromLabel(label);

      if (agentId) {
        init(agentId);
        const d = agentData[agentId];
        // CLI doesn't include status on subagents; check sessions.json
        const isRunning = session.status === "running" || entry?.status === "running";
        if (isRunning) {
          d.runningSessions++;
          // Extract task from label
          if (label && !d.currentTask) {
            // For 'agentname-task' format
            const dashTask = label.replace(new RegExp(`^${agentId}-`, "i"), "");
            // For 'AgentName — Task' or 'AgentName - Task' format
            const emDashTask = label.replace(new RegExp(`^${agentId}\\s*[—-]\\s*`, "i"), "");
            const taskPart = dashTask !== label ? dashTask : (emDashTask !== label ? emDashTask : label);
            d.currentTask = taskPart || label;
          }
        }
        updateTimestamps(d, session.updatedAt);
        d.model = session.model || d.model;
        d.totalTokens += session.totalTokens || 0;
      }
    }
  }

  // Process ALL sessions for completed counts, historical lastActive, and uptime
  for (const [key, entry] of Object.entries(allSessions)) {
    // Main session = Bob
    if (key === "agent:main:main") {
      init("bob");
      updateTimestamps(agentData["bob"], entry.updatedAt);
      continue;
    }

    // Discord sessions = Bob (conversations he handles)
    if (key.includes(":discord:")) {
      init("bob");
      const d = agentData["bob"];
      updateTimestamps(d, entry.updatedAt);
      // Each discord channel session counts as completed work
      if (entry.updatedAt > 0) d.completedCount++;
      continue;
    }

    // Cron sessions = Bob
    if (key.includes(":cron:")) {
      init("bob");
      const d = agentData["bob"];
      updateTimestamps(d, entry.updatedAt);
      const isStillRunning = entry.status === "running";
      if (!isStillRunning && entry.updatedAt > 0) d.completedCount++;
      continue;
    }

    if (!key.includes(":subagent:")) continue;

    const label = entry.label || "";
    const agentId = extractAgentFromLabel(label);

    // Unlabeled subagents belong to Bob (he spawned them)
    const resolvedAgent = agentId || "bob";

    init(resolvedAgent);
    const d = agentData[resolvedAgent];

    // Track timestamps for uptime calculation
    updateTimestamps(d, entry.updatedAt);

    // Count completed sessions
    const isStillRunning = entry.status === "running";
    if (!isStillRunning && (entry.status === "done" || (!entry.status && entry.updatedAt > 0))) {
      d.completedCount++;
    }
  }

  return agentData;
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Load static metadata
    const staticData = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
    const agentMetas: AgentMeta[] = staticData.agents || [];

    // Gather live data in parallel
    const [gatewayAlive, activeSessions] = await Promise.all([
      checkGatewayHealth(),
      Promise.resolve(getActiveSessions()),
    ]);

    const allSessions = getAllSessions();
    const cronJobs = getCronJobs();
    const agentLive = buildAgentLiveData(activeSessions, allSessions);
    const now = Date.now();

    // Sync sessions into persistent history and read the result
    const history = syncHistoryFromSessions(allSessions, getAgentHistory());

    // Merge live data onto static metadata
    const liveAgents = agentMetas.map((agent) => {
      const live = agentLive[agent.id];
      const lastUpdatedAt = live?.lastUpdatedAt || 0;
      const isRunning = (live?.runningSessions || 0) > 0;
      const recentlyActive = lastUpdatedAt > 0 && (now - lastUpdatedAt) < ACTIVE_THRESHOLD_MS;

      // Determine status
      let status: string;
      if (agent.id === "bob") {
        status = gatewayAlive && (isRunning || recentlyActive) ? "active" : "idle";
      } else {
        status = isRunning || recentlyActive ? "active" : "idle"; // change 2nd active to idle.
      }

      // Use persistent history for firstSeen and tasksCompleted
      const agentHist = history.agents[agent.id];
      const activeSince = formatActiveSince(agentHist?.firstSeen ?? null);
      const tasksCompleted = agentHist?.tasksCompleted ?? live?.completedCount ?? 0;

      // Build the enriched agent object
      const enriched: Record<string, unknown> = {
        ...agent,
        status,
        currentTask: isRunning ? (live?.currentTask || null) : null,
        lastActive: lastUpdatedAt > 0 ? new Date(lastUpdatedAt).toISOString() : null,
        tasksCompleted,
        activeSince,
      };

      // Attach cron jobs to Bob
      if (agent.id === "bob") {
        enriched.cronJobs = cronJobs.map((job) => ({
          id: job.id,
          name: job.name,
          enabled: job.enabled,
          schedule: job.schedule,
          lastRunStatus: job.state?.lastRunStatus || null,
          lastRunAtMs: job.state?.lastRunAtMs || null,
          nextRunAtMs: job.state?.nextRunAtMs || null,
          consecutiveErrors: job.state?.consecutiveErrors || 0,
          lastError: job.state?.lastError || null,
        }));
      }

      return enriched;
    });

    return NextResponse.json({
      agents: liveAgents,
      gateway: { healthy: gatewayAlive },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("agents API error:", err);
    // Fallback to static data
    try {
      const staticData = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
      return NextResponse.json({
        agents: staticData.agents || [],
        gateway: { healthy: false },
        timestamp: new Date().toISOString(),
        error: "Live data unavailable, showing static fallback",
      });
    } catch {
      return NextResponse.json({ agents: [], gateway: { healthy: false } });
    }
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
    const idx = data.agents.findIndex((a: { id: string }) => a.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    data.agents[idx] = { ...data.agents[idx], ...body };
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(data, null, 2));
    return NextResponse.json(data.agents[idx]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
