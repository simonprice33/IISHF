import { NextResponse } from "next/server";

const UMBRACO_BASE = (
  process.env.UMBRACO_BASE_URL ?? "http://localhost:32424"
).replace(/\/+$/, "");

export async function GET() {
  try {
    const res = await fetch(`${UMBRACO_BASE}/api/todaysgames`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: "Failed to load today's games", message: e?.message },
      { status: 500 }
    );
  }
}
