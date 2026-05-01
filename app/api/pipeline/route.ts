import { NextResponse } from "next/server";
import { ORG_FILE, parsePipelineStages, readTextFile } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = readTextFile(ORG_FILE);
    const stages = parsePipelineStages(content);
    return NextResponse.json({ stages, source: ORG_FILE });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), stages: [] },
      { status: 500 }
    );
  }
}
