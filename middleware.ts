import { NextRequest, NextResponse } from "next/server";

/**
 * Auth middleware for all /api/* routes.
 * If MISSION_CONTROL_SECRET is set, require Bearer token.
 * Otherwise, restrict to localhost only.
 */
export function middleware(req: NextRequest) {
  const secret = process.env.MISSION_CONTROL_SECRET;

  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // No secret — localhost only
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const isLocal = !ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost";

  if (!isLocal) {
    return NextResponse.json(
      { error: "Unauthorized — set MISSION_CONTROL_SECRET for remote access" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
