import { NextResponse } from "next/server";

const SHEETS_WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

const memoryLimiter = new Map<string, { count: number; resetAt: number }>();

function getIP(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

function rateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 2;

  const entry = memoryLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryLimiter.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) return { ok: false };

  entry.count += 1;
  memoryLimiter.set(ip, entry);
  return { ok: true };
}

async function verifyTurnstile(token: string, ip?: string) {
  if (!TURNSTILE_SECRET_KEY) return false;

  const formData = new FormData();
  formData.append("secret", TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    return false;
  }

  const data = (await resp.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(req: Request) {
  try {
    if (!SHEETS_WEBHOOK_URL || !TURNSTILE_SECRET_KEY) {
      console.error("Missing required env vars: SHEETS_WEBHOOK_URL or TURNSTILE_SECRET_KEY");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const ip = getIP(req);
    const rl = rateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await req.json();

    if (body.company && String(body.company).trim()) {
      return NextResponse.json({ ok: true });
    }

    const token = String(body.turnstileToken || "").trim();
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });

    const isHuman = await verifyTurnstile(token, ip);
    if (!isHuman) return NextResponse.json({ ok: false }, { status: 400 });

    const payload = {
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      message: String(body.message || "").trim(),
      source: "Website Quote Form",
      campaign: "Quote Request",
      location: String(body.location || "").trim(),
    };

    const sheetsResp = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!sheetsResp.ok) {
      console.error("Sheets webhook failed", await sheetsResp.text());
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
