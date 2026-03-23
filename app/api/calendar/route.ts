import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const calctlPath =
      process.env.HOME + "/bin/calctl";
    const output = execSync(`${calctlPath} today --json 2>/dev/null || ${calctlPath} today 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 8000,
    }).trim();

    let events = [];
    try {
      events = JSON.parse(output);
    } catch {
      // calctl might return non-JSON format, try to parse lines
      const lines = output.split("\n").filter(Boolean);
      events = lines.map((line, i) => ({ id: i, raw: line }));
    }

    return NextResponse.json({ events, source: "calctl" });
  } catch (err) {
    // Return empty events if calctl not available
    return NextResponse.json({
      events: [],
      source: "calctl",
      error: err instanceof Error ? err.message : "calctl not available",
    });
  }
}
