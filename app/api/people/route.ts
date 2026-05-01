import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import agentsData from "@/data/agents.json";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const WORKSPACE = OPENCLAW_WORKSPACE;

export interface Person {
  id: string;
  name: string;
  role: string;
  type: "human" | "agent";
  bio?: string;
  email?: string;
  skills?: string[];
  avatar?: string;
  color?: string;
  model?: string;
  status?: string;
  isOrchestrator?: boolean;
}

function parseUserMd(content: string): Partial<Person> {
  // Look for explicit "Name:" or "What to call them:" field first
  const nameFieldMatch = content.match(/\*?\*?(?:name|what to call[^:]*?)\*?\*?:\*?\*?\s*(.+)$/im);
  const nameMatch = content.match(/^#\s+(.+)$/m);
  const roleMatch = content.match(/(?:role|title|position):\s*(.+)$/im);
  const emailMatch = content.match(/email:\s*(.+)$/im);

  const bioMatch = content.replace(/^#.+$/gm, "").trim().split(/\n\n/)[0];

  const rawName = nameFieldMatch?.[1]?.trim() || nameMatch?.[1]?.trim();
  const name = rawName?.replace(/\*+/g, "").replace(/^USER\.md\s*[-\u2013]\s*/i, "").trim();

  return {
    name,
    role: roleMatch?.[1]?.trim(),
    email: emailMatch?.[1]?.trim(),
    bio: bioMatch?.slice(0, 300).trim(),
  };
}

export async function GET() {
  const people: Person[] = [];

  // Read USER.md for human team members
  try {
    const content = fs.readFileSync(path.join(WORKSPACE, "USER.md"), "utf-8");
    const parsed = parseUserMd(content);
    people.push({
      id: "user-human",
      name: parsed.name || "Anthony",
      role: parsed.role || "Product Owner",
      type: "human",
      bio: parsed.bio,
      email: parsed.email,
      avatar: "👤",
      color: "#6366f1",
    });
  } catch {
    people.push({
      id: "user-human",
      name: "Anthony",
      role: "Product Owner",
      type: "human",
      avatar: "👤",
      color: "#6366f1",
    });
  }

  // Add all agents (agents.json uses description/capabilities not bio/skills)
  interface AgentEntry {
    id: string; name: string; role: string; description?: string;
    status?: string; model?: string; capabilities?: string[];
    avatar?: string; color?: string; isOrchestrator?: boolean;
  }
  for (const agent of (agentsData.agents || agentsData) as AgentEntry[]) {
    people.push({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      type: "agent",
      bio: agent.description,
      skills: agent.capabilities,
      avatar: agent.avatar,
      color: agent.color,
      model: agent.model,
      status: agent.status,
      isOrchestrator: agent.isOrchestrator,
    });
  }

  return NextResponse.json({ people });
}
