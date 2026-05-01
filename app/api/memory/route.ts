import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  LONG_TERM_MEMORY_FILE,
  MEMORY_DIR,
  normalizePreview,
  readTextFile,
  resolveWithin,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const type = searchParams.get("type");

  // Read long-term memory
  if (type === "longterm") {
    try {
      const content = readTextFile(LONG_TERM_MEMORY_FILE);
      return NextResponse.json({ content, path: LONG_TERM_MEMORY_FILE });
    } catch {
      return NextResponse.json({ content: "# Long-term Memory\n\nNo long-term memory file found.", path: null });
    }
  }

  // Read specific file
  if (file) {
    try {
      const filePath = resolveWithin(MEMORY_DIR, file);
      if (!filePath || path.extname(filePath) !== ".md") {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      const content = readTextFile(filePath);
      return NextResponse.json({ content, file });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // List all memory files
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      return NextResponse.json({ files: [] });
    }
    const files = fs.readdirSync(MEMORY_DIR)
      .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
      .map((f) => {
        const stat = fs.statSync(path.join(MEMORY_DIR, f));
        const preview = normalizePreview(readTextFile(path.join(MEMORY_DIR, f)), 200);
        return {
          name: f,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          preview,
        };
      })
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: String(err), files: [] });
  }
}
