import { NextResponse } from "next/server";

/**
 * Handles the newsletter form in the global footer.
 *
 * Nothing is stored by RentOps here — the request is acknowledged and the guest
 * is returned to the page they came from so the flow never dead-ends on a blank
 * response. API clients receive a 200 with `{ ok: true }`.
 */
export async function POST(request: Request) {
  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const target = new URL(referer);
      target.searchParams.set("subscribed", "1");
      return NextResponse.redirect(target, 303);
    } catch {
      // Fall through to the plain acknowledgement below.
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
