import { NextRequest, NextResponse } from "next/server";

const UMBRACO_BASE = process.env.UMBRACO_BASE_URL ?? "https://localhost:44395";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Build fetch options — disable SSL verification in dev for self-signed certs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchOptions: any = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    };

    if (process.env.NODE_ENV === "development") {
      const https = await import("https");
      fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const upstream = await fetch(`${UMBRACO_BASE}/api/contact`, fetchOptions);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Contact upstream error", upstream.status, text);
      return NextResponse.json(
        { error: "Failed to submit contact form." },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Contact proxy failed", e);
    return NextResponse.json({ error: "Server error — please try again." }, { status: 500 });
  }
}
