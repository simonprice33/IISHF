import { NextResponse } from "next/server";
import https from "https";

const UMBRACO_BASE = process.env.UMBRACO_BASE_URL ?? "https://localhost:44395";

// Next 16: params is a Promise (per your error)
type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;

  const url = new URL(req.url);

  // /api/umbraco/<everything after>
  const proxiedPath = "/" + (path ?? []).join("/"); // safe
  const targetUrl = `${UMBRACO_BASE}${proxiedPath}${url.search}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        // keep it simple; you can forward auth headers later if needed
        Accept: "application/json",
      },
      // Local dev: allow self-signed cert without needing node flags
      // (do NOT do this in production)
      ...(process.env.NODE_ENV === "development"
        ? { agent: new https.Agent({ rejectUnauthorized: false }) }
        : {}),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "application/json";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (err: any) {
    console.error("Umbraco proxy failed", {
      targetUrl,
      message: err?.message,
      code: err?.code,
    });

    return NextResponse.json(
      { error: "Umbraco proxy failed", targetUrl, message: err?.message, code: err?.code },
      { status: 500 }
    );
  }
}
