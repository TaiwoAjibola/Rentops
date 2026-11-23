import { NextResponse } from "next/server";

import { storeUpload } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Media upload endpoint.
 *
 * Accepts multipart uploads and delegates to the configured storage driver
 * (local development driver or Cloudinary). Access is limited to signed-in users
 * so the endpoint cannot be used as an anonymous file drop.
 */

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "properties").replace(/[^a-z0-9\-_/]/gi, "") || "properties";
  const resourceType = (String(form.get("resourceType") ?? "image") as "image" | "video" | "raw") ?? "image";

  if (!file || typeof file === "string" || typeof file.name !== "string" || typeof file.size !== "number") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 10MB limit." }, { status: 413 });
    }

    const stored = await storeUpload(file, folder, { resourceType });
    return NextResponse.json({ url: stored.url, publicId: stored.publicId, driver: stored.driver });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
