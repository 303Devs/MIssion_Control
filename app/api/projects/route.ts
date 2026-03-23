import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

function runCmd(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 5000,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function detectLanguage(dir: string): string {
  const files = fs.readdirSync(dir).map((f) => f.toLowerCase());
  if (files.includes("package.json")) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    if (pkg.dependencies?.next || pkg.devDependencies?.next) return "Next.js";
    if (pkg.dependencies?.react || pkg.devDependencies?.react) return "React";
    return "Node.js";
  }
  if (files.includes("cargo.toml")) return "Rust";
  if (files.includes("go.mod")) return "Go";
  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) return "Python";
  if (files.includes("pom.xml")) return "Java";
  if (files.some((f) => f.endsWith(".swift"))) return "Swift";
  if (files.some((f) => f.endsWith(".rb"))) return "Ruby";
  if (files.includes("composer.json")) return "PHP";
  return "Unknown";
}

export async function GET() {
  const projectsDir = path.join(process.env.HOME || "/Users/anthony", "Projects");

  try {
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

    const projects = dirs.map((dir) => {
      const fullPath = path.join(projectsDir, dir.name);
      const isGit = fs.existsSync(path.join(fullPath, ".git"));

      let lastCommit = "";
      let lastCommitDate = "";
      let branch = "";
      let status = "clean";
      let commitCount = 0;

      let modifiedFiles = 0;
      if (isGit) {
        lastCommit = runCmd(`git log -1 --pretty=format:"%s" 2>/dev/null`, fullPath);
        lastCommitDate = runCmd(`git log -1 --pretty=format:"%cr" 2>/dev/null`, fullPath);
        branch = runCmd(`git branch --show-current 2>/dev/null`, fullPath);
        const statusOutput = runCmd(`git status --porcelain 2>/dev/null`, fullPath);
        status = statusOutput ? "modified" : "clean";
        modifiedFiles = statusOutput ? statusOutput.split("\n").filter(Boolean).length : 0;
        const countStr = runCmd(`git rev-list --count HEAD 2>/dev/null`, fullPath);
        commitCount = parseInt(countStr) || 0;
      }

      let language = "Unknown";
      try {
        language = detectLanguage(fullPath);
      } catch {
        // ignore
      }

      return {
        id: dir.name,
        name: dir.name,
        path: fullPath,
        isGit,
        lastCommit: lastCommit || "No commits",
        lastCommitDate: lastCommitDate || "—",
        branch: branch || "main",
        status,
        commitCount,
        modifiedFiles,
        language,
      };
    });

    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read projects" },
      { status: 500 }
    );
  }
}
