import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MEMORY_DIR = path.join(process.env.HOME || "/Users/anthony", ".openclaw/workspace/memory");
const LONG_TERM_MEMORY = path.join(process.env.HOME || "/Users/anthony", ".openclaw/workspace/MEMORY.md");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const type = searchParams.get("type");

  // Read long-term memory
  if (type === "longterm") {
    try {
      const content = fs.readFileSync(LONG_TERM_MEMORY, "utf-8");
      return NextResponse.json({ content, path: LONG_TERM_MEMORY });
    } catch {
      return NextResponse.json({ content: "# Long-term Memory\n\nNo long-term memory file found.", path: null });
    }
  }

  // Read specific file
  if (file) {
    try {
      const filePath = path.join(MEMORY_DIR, file);
      // Prevent path traversal
      if (!filePath.startsWith(MEMORY_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      const content = fs.readFileSync(filePath, "utf-8");
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
        const preview = fs.readFileSync(path.join(MEMORY_DIR, f), "utf-8").slice(0, 200);
        return {
          name: f,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          preview: preview.replace(/\n/g, " ").trim(),
        };
      })
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: String(err), files: [] });
  }
}
