import { NextResponse } from "next/server";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const LOGFILE = "/tmp/paymydine_remote_console.log";
  try {
    const body = await req.json().catch(() => ({} as any));
    const ua = req.headers.get("user-agent") || "";
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    const line = JSON.stringify({
      ts: body?.ts ?? new Date().toISOString(),
      level: String(body?.level || "log"),
      ip,
      ua,
      href: body?.href ?? null,
      message: body?.message ?? null,
      data: body?.data ?? null,
    });

    try { fs.appendFileSync(LOGFILE, line + "\n", { encoding: "utf-8" }); } catch {}
    console.log(`[REMOTE_CONSOLE] ${line}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const errLine = JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      message: e?.message || String(e),
    });
    try { fs.appendFileSync(LOGFILE, errLine + "\n", { encoding: "utf-8" }); } catch {}
    console.log(`[REMOTE_CONSOLE] ${errLine}`);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
