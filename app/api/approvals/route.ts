import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const APPROVALS_FILE = path.join(OPENCLAW_WORKSPACE, "approvals.json");

export interface ApprovalRequest {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  action: string;
  description: string;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  data?: Record<string, unknown>;
  resolvedAt?: number;
  resolvedBy?: string;
}

function readApprovals(): ApprovalRequest[] {
  try {
    if (!fs.existsSync(APPROVALS_FILE)) return [];
    return JSON.parse(fs.readFileSync(APPROVALS_FILE, "utf-8")) as ApprovalRequest[];
  } catch {
    return [];
  }
}

function writeApprovals(approvals: ApprovalRequest[]): void {
  const dir = path.dirname(APPROVALS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2));
}

export async function GET() {
  const approvals = readApprovals();
  approvals.sort((a, b) => b.timestamp - a.timestamp);
  return NextResponse.json({ approvals });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ApprovalRequest>;

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json({ error: "Missing required field: action (string)" }, { status: 400 });
  }
  if (body.agentId !== undefined && typeof body.agentId !== "string") {
    return NextResponse.json({ error: "Invalid field: agentId must be a string" }, { status: 400 });
  }
  if (body.agentName !== undefined && typeof body.agentName !== "string") {
    return NextResponse.json({ error: "Invalid field: agentName must be a string" }, { status: 400 });
  }
  const validRisks = ["low", "medium", "high"];
  if (body.risk !== undefined && !validRisks.includes(body.risk)) {
    return NextResponse.json({ error: "Invalid field: risk must be 'low', 'medium', or 'high'" }, { status: 400 });
  }

  const approvals = readApprovals();

  const newApproval: ApprovalRequest = {
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    agentId: body.agentId || "unknown",
    agentName: body.agentName || "Agent",
    action: body.action || "Unspecified action",
    description: body.description || "",
    risk: body.risk || "low",
    status: "pending",
    data: body.data,
  };

  approvals.push(newApproval);
  writeApprovals(approvals);
  return NextResponse.json({ approval: newApproval });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { id: string; status: "approved" | "rejected"; resolvedBy?: string };

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing required field: id (string)" }, { status: 400 });
  }
  const validStatuses = ["approved", "rejected"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid field: status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const approvals = readApprovals();

  const idx = approvals.findIndex((a) => a.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  approvals[idx] = {
    ...approvals[idx],
    status: body.status,
    resolvedAt: Date.now(),
    resolvedBy: body.resolvedBy || "user",
  };

  writeApprovals(approvals);
  return NextResponse.json({ approval: approvals[idx] });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const approvals = readApprovals().filter((a) => a.id !== id);
  writeApprovals(approvals);
  return NextResponse.json({ success: true });
}
