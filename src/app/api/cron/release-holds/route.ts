import { NextResponse } from "next/server";

import { releaseExpiredHolds } from "@/lib/reservations";

/**
 * Releases reservations whose inventory hold has expired.
 *
 * An unexpired hold blocks the unit for a short window so the customer can pay.
 * When the window lapses the reservation becomes EXPIRED and, via the database
 * trigger, the unit is released for someone else. Protected by a shared secret so
 * it can be called by an external scheduler (cron) without being publicly
 * triggerable.
 */

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const provided = request.headers.get("authorization") ?? "";

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const released = await releaseExpiredHolds();
  return NextResponse.json({ ok: true, released });
}

export async function POST(request: Request) {
  return GET(request);
}

export const dynamic = "force-dynamic";
