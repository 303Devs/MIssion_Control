import { NextRequest, NextResponse } from "next/server";
import { readTextFile, resolveWorkspaceMarkdownPath } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedPath = searchParams.get("path");

  if (!requestedPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const resolvedPath = resolveWorkspaceMarkdownPath(requestedPath);
  if (!resolvedPath) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const content = readTextFile(resolvedPath);
    return NextResponse.json({ content, path: requestedPath });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
