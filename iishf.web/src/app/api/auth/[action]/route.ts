import { NextResponse } from "next/server";

const UMBRACO_BASE = (process.env.UMBRACO_BASE_URL ?? "http://localhost:32424").replace(/\/+$/, "");

type Ctx = { params: Promise<{ action: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  const url = new URL(req.url);
  const target = `${UMBRACO_BASE}/api/memberauth/${action}${url.search}`;

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      credentials: "include",
      cache: "no-store",
    });

    const body = await res.arrayBuffer();
    const response = new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });

    // Forward Set-Cookie headers so auth cookies are set on the browser
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);

    return response;
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: "Auth proxy failed", message: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  const url = new URL(req.url);
  const target = `${UMBRACO_BASE}/api/memberauth/${action}${url.search}`;

  const contentType = req.headers.get("content-type") ?? "application/json";
  const body = await req.arrayBuffer();

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Accept: "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      body,
      credentials: "include",
      cache: "no-store",
    });

    const resBody = await res.arrayBuffer();
    const response = new NextResponse(resBody, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);

    return response;
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: "Auth proxy failed", message: e?.message }, { status: 500 });
  }
}
