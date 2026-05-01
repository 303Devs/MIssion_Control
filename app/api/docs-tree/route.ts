import { NextResponse } from "next/server";
import { getDocsTree } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tree: getDocsTree() });
}
