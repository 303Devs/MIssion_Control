import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const AGENTS_FILE = path.join(process.cwd(), "data", "agents.json");
const HOME = process.env.HOME || "/Users/anthony";
const SESSIONS_FILE = path.join(HOME, ".openclaw/agents/main/sessions/sessions.json");
const GATEWAY_URL = "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";
const CLINT_TODO = path.join(HOME, ".openclaw/workspace/clint-todo.md");

// Known workspace paths → agent IDs
const AGENT_WORKSPACE_MAP: Record<string, string> = {
  "mission-control": "clint-drifter",
  "303devs": "clint-drifter",
  "campingbuddy": "clint-drifter",
};

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
      headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
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

function getActiveClaudeProcesses(): string[] {
  // Get running claude CLI processes (not Claude.app desktop)
  const output = runCmd(
    "ps aux | grep -i 'claude' | grep -v grep | grep -v 'Claude.app' | grep -v 'chrome-native-host'"
  );
  if (!output) return [];

  const agentIds: string[] = [];
  for (const line of output.split("\n").filter(Boolean)) {
    // Look for workspace paths in the command
    for (const [pathFragment, agentId] of Object.entries(AGENT_WORKSPACE_MAP)) {
      if (line.toLowerCase().includes(pathFragment.toLowerCase())) {
        if (!agentIds.includes(agentId)) agentIds.push(agentId);
      }
    }
    // If it's a claude process in the current working dir
    if (line.includes(process.cwd())) {
      if (!agentIds.includes("clint-drifter")) agentIds.push("clint-drifter");
    }
  }
  return agentIds;
}

function getBobSessionStatus(): { active: boolean; lastTask?: string } {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return { active: false };
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));

    let mostRecent = 0;
    for (const session of Object.values(sessions) as { updatedAt?: number }[]) {
      const t = session.updatedAt || 0;
      if (t > mostRecent) mostRecent = t;
    }

    const ageMs = Date.now() - mostRecent;
    // Active if session updated within 30 minutes
    return { active: ageMs < 30 * 60 * 1000 };
  } catch {
    return { active: false };
  }
}

function getClintCurrentTask(): string | null {
  try {
    if (!fs.existsSync(CLINT_TODO)) return null;
    const content = fs.readFileSync(CLINT_TODO, "utf-8");
    // Extract first Priority task
    const prioritySection = content.match(/##\s*Priority([\s\S]*?)(?=##|$)/);
    if (prioritySection) {
      const taskMatch = prioritySection[1].match(/\d+\.\s+\*\*([^*]+)\*\*/);
      if (taskMatch) return taskMatch[1].trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
    const agents = data.agents || [];

    // Gather live data in parallel
    const [gatewayAlive, activeProcessAgents] = await Promise.all([
      checkGatewayHealth(),
      Promise.resolve(getActiveClaudeProcesses()),
    ]);

    const bobSession = getBobSessionStatus();
    const clintTask = getClintCurrentTask();

    // Overlay live status
    const liveAgents = agents.map((agent: {
      id: string;
      status: string;
      currentTask: string | null;
    }) => {
      let status = "idle";
      let currentTask = agent.currentTask;

      if (agent.id === "bob") {
        // Bob is active if gateway is alive and has recent session activity
        if (gatewayAlive && bobSession.active) {
          status = "active";
        } else if (gatewayAlive) {
          status = "idle";
        } else {
          status = "idle";
        }
      } else if (agent.id === "clint-drifter") {
        // Clint is active if there's a claude process in a known workspace,
        // OR if we're currently running (this very API call exists, so Clint is working)
        if (activeProcessAgents.includes("clint-drifter")) {
          status = "active";
          if (clintTask) currentTask = clintTask;
        } else {
          // Check if there's any claude process running at all that could be us
          const anyClaudeProcess = runCmd(
            "ps aux | grep -c 'claude' | grep -v grep"
          );
          const count = parseInt(anyClaudeProcess) || 0;
          // If we have claude processes beyond just the app, Clint might be active
          if (count > 2) {
            status = "active";
            if (clintTask) currentTask = clintTask;
          }
        }
      }

      return { ...agent, status, currentTask };
    });

    return NextResponse.json({ agents: liveAgents });
  } catch {
    return NextResponse.json({ agents: [] });
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
