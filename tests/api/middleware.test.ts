import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/tasks", { headers });
}

describe("middleware", () => {
  const originalSecret = process.env.MISSION_CONTROL_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.MISSION_CONTROL_SECRET;
    } else {
      process.env.MISSION_CONTROL_SECRET = originalSecret;
    }
  });

  it("requires bearer token when MISSION_CONTROL_SECRET is set", async () => {
    process.env.MISSION_CONTROL_SECRET = "secret";

    const rejected = middleware(request({ authorization: "Bearer wrong" }));
    await expect(rejected.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(rejected.status).toBe(401);

    const accepted = middleware(request({ authorization: "Bearer secret" }));
    expect(accepted.status).toBe(200);
  });

  it("allows localhost traffic without a secret", () => {
    delete process.env.MISSION_CONTROL_SECRET;

    expect(middleware(request({ "x-forwarded-for": "127.0.0.1" })).status).toBe(200);
    expect(middleware(request()).status).toBe(200);
  });

  it("rejects remote traffic without a secret", async () => {
    delete process.env.MISSION_CONTROL_SECRET;

    const response = middleware(request({ "x-forwarded-for": "203.0.113.10" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized — set MISSION_CONTROL_SECRET for remote access",
    });
  });
});
