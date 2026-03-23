import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const PROJECTS_DIR = path.join(process.env.HOME || '/Users/anthony', 'Projects');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectPath = path.join(PROJECTS_DIR, id);

  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // List top-level files
  const entries = fs.readdirSync(projectPath, { withFileTypes: true });
  const files = entries
    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
    .map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' as const : 'file' as const,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // Recent commits
  let recentCommits: string[] = [];
  try {
    const { stdout } = await execAsync(
      `cd "${projectPath}" && git log --oneline -10 2>/dev/null`,
      { timeout: 5000 }
    );
    recentCommits = stdout.trim().split('\n').filter(Boolean);
  } catch {}

  // README
  let readme: string | null = null;
  const readmePaths = ['README.md', 'readme.md', 'README', 'README.txt'];
  for (const rp of readmePaths) {
    const fullPath = path.join(projectPath, rp);
    if (fs.existsSync(fullPath)) {
      readme = fs.readFileSync(fullPath, 'utf8').substring(0, 5000);
      break;
    }
  }

  return NextResponse.json({ files, recentCommits, readme });
}
