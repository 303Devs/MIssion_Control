import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const WORKSPACE = OPENCLAW_WORKSPACE;
const MEMORY_DIR = path.join(WORKSPACE, "memory");

const AGENT_NAMES = [
  "Bob",
  "Alice",
  "Jeeves",
  "Gilfoyle",
  "Turing",
  "Ada",
  "Nora",
  "Ive",
  "Joyce",
  "Banksy",
  "Sagan",
  "Orwell",
  "Spangler",
  "Mustafa",
  "Atticus",
  "Thich",
  "Buffett",
];

export interface CouncilEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  agents: string[];
  type: "decision" | "discussion" | "review" | "planning" | "status";
  source: string;
}

function extractEntries(content: string, filename: string): CouncilEntry[] {
  const entries: CouncilEntry[] = [];
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] || new Date().toISOString().split("T")[0];

  // Split on h2/h3 headers
  const sections = content.split(/^#{2,3}\s+/m).filter((s) => s.trim());

  for (let i = 0; i < sections.length; i++) {
    const lines = sections[i].split("\n");
    const title = lines[0]?.replace(/#+\s*/, "").trim() || "Untitled";
    const body = lines.slice(1).join("\n").trim();
    if (!body || body.length < 20) continue;

    const lower = (title + " " + body).toLowerCase();
    let type: CouncilEntry["type"] = "discussion";
    if (lower.includes("decision") || lower.includes("decided") || lower.includes("resolved")) {
      type = "decision";
    } else if (lower.includes("review") || lower.includes("reviewed") || lower.includes("feedback")) {
      type = "review";
    } else if (lower.includes("plan") || lower.includes("next step") || lower.includes("roadmap")) {
      type = "planning";
    } else if (lower.includes("status") || lower.includes("update") || lower.includes("progress")) {
      type = "status";
    }

    const agents = AGENT_NAMES.filter((name) => body.includes(name) || title.includes(name));

    entries.push({
      id: `council-${filename}-${i}`,
      date,
      title,
      content: body.slice(0, 600),
      agents,
      type,
      source: filename,
    });
  }

  return entries;
}

function readFileEntries(filePath: string, filename: string): CouncilEntry[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return extractEntries(content, filename);
  } catch {
    return [];
  }
}

export async function GET() {
  const entries: CouncilEntry[] = [];

  // Key workspace files
  for (const file of ["SOUL.md", "AGENTS.md", "ORG.md", "HEARTBEAT.md"]) {
    entries.push(...readFileEntries(path.join(WORKSPACE, file), file));
  }

  // Recent daily memory files
  try {
    const memFiles = fs
      .readdirSync(MEMORY_DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse()
      .slice(0, 7);

    for (const file of memFiles) {
      entries.push(...readFileEntries(path.join(MEMORY_DIR, file), file));
    }
  } catch {}

  entries.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ entries: entries.slice(0, 60) });
}
