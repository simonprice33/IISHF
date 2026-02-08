import { NextResponse } from "next/server";
import https from "https";

const UMBRACO_BASE = (process.env.UMBRACO_BASE_URL ?? "https://localhost:44395").replace(/\/+$/, "");

// Next 16: params is a Promise
type Ctx = { params: Promise<{ path?: string[] }> };

function buildProxiedPath(pathSegments: string[] | undefined): string {
  const segs = (pathSegments ?? []).filter(Boolean);

  // Nothing specified -> treat as "/umbraco"
  if (segs.length === 0) return "/umbraco";

  const first = (segs[0] ?? "").toLowerCase();

  // If the request already targets an Umbraco-rooted path, keep it as-is.
  // Examples:
  //  - /api/umbraco/umbraco/delivery/api/v2/content  -> /umbraco/delivery/api/v2/content
  //  - /api/umbraco/umbraco/api/...                 -> /umbraco/api/...
  if (first === "umbraco") return "/" + segs.join("/");

  // Media is NOT under /umbraco
  // Example: /api/umbraco/media/xyz.jpg -> /media/xyz.jpg
  if (first === "media") return "/" + segs.join("/");

  // Common case: caller uses /api/umbraco/delivery/... but upstream requires /umbraco/delivery/...
  // So we prefix /umbraco/
  return "/umbraco/" + segs.join("/");
}

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const url = new URL(req.url);

  const proxiedPath = buildProxiedPath(path);
  const targetUrl = `${UMBRACO_BASE}${proxiedPath}${url.search}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        // Forward what matters (keep it minimal, but correct)
        Accept: req.headers.get("accept") ?? "application/json",
        Authorization: req.headers.get("authorization") ?? "",
      },
      ...(process.env.NODE_ENV === "development"
        ? { agent: new https.Agent({ rejectUnauthorized: false }) }
        : {}),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "application/json";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": contentType,
        // Helpful debug header (remove later if you want)
        "x-umbraco-proxy-target": targetUrl,
      },
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
