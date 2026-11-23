import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Media storage.
 *
 * Two drivers behind one interface:
 *  - "cloudinary" — used when Cloudinary credentials are present (production).
 *  - "local"      — development fallback that writes under /public/uploads and is
 *                   clearly labelled as a development-only driver.
 */

export type StoredFile = {
  url: string;
  publicId: string | null;
  width?: number | null;
  height?: number | null;
  driver: "local" | "cloudinary";
};

const MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALLOWED_DOC_TYPES = ["application/pdf"];

export function driverName(): "local" | "cloudinary" {
  const configured = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  return configured === "cloudinary" && process.env.CLOUDINARY_CLOUD_NAME ? "cloudinary" : "local";
}

export async function storeUpload(
  file: File,
  folder = "rentops",
  options?: { resourceType?: "image" | "video" | "raw" },
): Promise<StoredFile> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is larger than 10MB.");
  }

  const resourceType = options?.resourceType ?? "image";

  if (resourceType === "image" && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported image format. Use JPG, PNG, WEBP or AVIF.");
  }
  if (resourceType === "video" && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error("Unsupported video format. Use MP4 or WEBM.");
  }
  if (resourceType === "raw" && !ALLOWED_DOC_TYPES.includes(file.type)) {
    throw new Error("Unsupported document format. Use PDF.");
  }

  if (driverName() === "cloudinary") {
    return storeToCloudinary(file, folder, resourceType);
  }
  return storeLocally(file, folder);
}

async function storeLocally(file: File, folder: string): Promise<StoredFile> {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "bin";
  const filename = `${randomUUID()}.${extension ?? "bin"}`;
  const relativeDir = path.join("uploads", folder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, filename), buffer);

  return {
    url: `/${relativeDir}/${filename}`.replace(/\\/g, "/"),
    publicId: `${folder}/${filename}`,
    driver: "local",
  };
}

async function storeToCloudinary(
  file: File,
  folder: string,
  resourceType: "image" | "video" | "raw",
): Promise<StoredFile> {
  const cloudinary = (await import("cloudinary")).v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const arrayBuffer = await file.arrayBuffer();
  const base64 = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder: `rentops/${folder}`,
    resource_type: resourceType,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? null,
    height: result.height ?? null,
    driver: "cloudinary",
  };
}

export async function deleteUpload(publicId: string | null, resourceType: "image" | "video" | "raw" = "image") {
  if (!publicId) return;
  if (driverName() !== "cloudinary") return;

  try {
    const cloudinary = (await import("cloudinary")).v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    // Deletion is best-effort; the record is removed either way.
  }
}
