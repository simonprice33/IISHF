import { NextResponse } from "next/server";
import axios from "axios";

export const runtime = "nodejs";

const UMBRACO_BASE_URL =
  process.env.UMBRACO_BASE_URL ?? "https://localhost:44395";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const url = new URL(req.url);

  const proxiedPath = "/" + path.join("/");
  const targetUrl = `${UMBRACO_BASE_URL}${proxiedPath}${url.search}`;

  try {
    const response = await axios.get(targetUrl, {
      headers: { Accept: "application/json" },
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (err: any) {
    console.error("Umbraco proxy failed", {
      targetUrl,
      message: err?.message,
      code: err?.code,
    });

    return NextResponse.json(
      {
        message: err?.message ?? "Proxy error",
        code: err?.code,
        targetUrl,
      },
      { status: 500 }
    );
  }
}
