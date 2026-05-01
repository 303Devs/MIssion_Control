import { NextResponse } from "next/server";
import { listDailyMemoryFiles } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ files: listDailyMemoryFiles() });
}
