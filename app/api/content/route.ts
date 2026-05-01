import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { OPENCLAW_WORKSPACE } from "@/lib/agent-paths";

export const dynamic = "force-dynamic";

const WORKSPACE = OPENCLAW_WORKSPACE;

function resolveWithin(base: string, filePath: string): string | null {
  const resolved = path.resolve(base, filePath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

export interface ContentFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  mtime?: number;
  preview?: string;
}

function scanDir(dir: string, prefix: string = "", depth: number = 0): ContentFile[] {
  const files: ContentFile[] = [];
  if (depth > 2) return files;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push({ name: entry.name, path: relativePath, type: "directory" });
      files.push(...scanDir(fullPath, relativePath, depth + 1));
    } else if (
      entry.isFile() &&
      /\.(md|json|txt|yaml|yml)$/.test(entry.name)
    ) {
      try {
        const st = fs.statSync(fullPath);
        let preview = "";
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          preview = raw.slice(0, 160).replace(/\n+/g, " ").trim();
        } catch {}
        files.push({
          name: entry.name,
          path: relativePath,
          type: "file",
          size: st.size,
          mtime: st.mtimeMs,
          preview,
        });
      } catch {}
    }
  }

  return files;
}

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");

  if (filePath) {
    const resolved = resolveWithin(WORKSPACE, filePath);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    try {
      const stat = fs.statSync(resolved);
      if (stat.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
      }
      const content = fs.readFileSync(resolved, "utf-8");
      return NextResponse.json({ content, path: filePath });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  const files = scanDir(WORKSPACE);
  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ files });
}
