import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const FEEDBACK_FILE = path.join(OPENCLAW_WORKSPACE, "feedback.json");

export interface FeedbackEntry {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  taskId?: string;
  taskTitle?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  category: "quality" | "speed" | "accuracy" | "creativity" | "general";
  status: "pending" | "reviewed" | "actioned";
}

function readFeedback(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8")) as FeedbackEntry[];
  } catch {
    return [];
  }
}

function writeFeedback(feedback: FeedbackEntry[]): void {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
}

export async function GET() {
  const feedback = readFeedback();
  feedback.sort((a, b) => b.timestamp - a.timestamp);
  return NextResponse.json({ feedback });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<FeedbackEntry>;

  if (!body.agentName || typeof body.agentName !== "string") {
    return NextResponse.json({ error: "Missing required field: agentName (string)" }, { status: 400 });
  }
  if (!body.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "Missing required field: comment (string)" }, { status: 400 });
  }
  if (body.comment.length > 1000) {
    return NextResponse.json({ error: "Field too long: comment must be 1000 characters or fewer" }, { status: 400 });
  }
  if (body.taskTitle !== undefined && typeof body.taskTitle === "string" && body.taskTitle.length > 1000) {
    return NextResponse.json({ error: "Field too long: taskTitle must be 1000 characters or fewer" }, { status: 400 });
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "Invalid field: rating must be an integer 1–5" }, { status: 400 });
    }
  }

  const feedback = readFeedback();

  const entry: FeedbackEntry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    agentId: body.agentId || "unknown",
    agentName: body.agentName || "Agent",
    taskId: body.taskId,
    taskTitle: body.taskTitle,
    rating: body.rating ?? 3,
    comment: body.comment || "",
    category: body.category || "general",
    status: "pending",
  };

  feedback.push(entry);
  writeFeedback(feedback);
  return NextResponse.json({ feedback: entry });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Partial<FeedbackEntry> & { id: string };
  const feedback = readFeedback();

  const idx = feedback.findIndex((f) => f.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  feedback[idx] = { ...feedback[idx], ...body };
  writeFeedback(feedback);
  return NextResponse.json({ feedback: feedback[idx] });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const feedback = readFeedback().filter((f) => f.id !== id);
  writeFeedback(feedback);
  return NextResponse.json({ success: true });
}
