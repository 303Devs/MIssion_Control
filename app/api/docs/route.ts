import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DOCS_DIRS = [
  path.join(process.env.HOME || "/Users/anthony", ".openclaw/workspace"),
  path.join(process.env.HOME || "/Users/anthony", "Projects/mission-control"),
];

interface DocFile {
  name: string;
  path: string;
  relativePath: string;
  dir: string;
  size: number;
  mtime: string;
  preview: string;
}

function scanDocs(dir: string, baseDir: string, depth = 0): DocFile[] {
  if (depth > 3) return [];
  const results: DocFile[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanDocs(fullPath, baseDir, depth + 1));
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".txt")) {
        const stat = fs.statSync(fullPath);
        const preview = fs.readFileSync(fullPath, "utf-8").slice(0, 300).replace(/\n/g, " ").trim();
        results.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(baseDir, fullPath),
          dir: path.relative(baseDir, dir) || ".",
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          preview,
        });
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (filePath) {
    // Security: only allow files within known dirs
    const allowed = DOCS_DIRS.some((d) => filePath.startsWith(d));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // List all docs
  const allDocs: DocFile[] = [];
  for (const dir of DOCS_DIRS) {
    if (fs.existsSync(dir)) {
      allDocs.push(...scanDocs(dir, dir));
    }
  }

  // Sort by mtime desc
  allDocs.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

  return NextResponse.json({ files: allDocs });
}
