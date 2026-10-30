import { supabaseUrl } from "@/lib/supabase/env";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // keep in sync with the bucket limit

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

const EXTENSIONS: Record<ImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Detects the real image type from the first bytes of the file ("magic
 * numbers"). The browser-provided `file.type` comes from the file name and
 * can be anything the client wants, so we never trust it alone.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  // RIFF....WEBP
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

/** `<user-id>/avatar-<timestamp>.<ext>`: a new name per upload busts every cache. */
export function avatarObjectPath(userId: string, type: ImageType, now = Date.now()): string {
  return `${userId}/avatar-${now}.${EXTENSIONS[type]}`;
}

/** Public URL of an avatar in the public bucket, or null when there is none. */
export function avatarPublicUrl(path: string | null | undefined): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
