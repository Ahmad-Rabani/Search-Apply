import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export async function saveUploadedCvFile(params: {
  userId: string;
  originalName: string;
  buffer: Buffer;
}): Promise<{ filePath: string; relativePath: string }> {
  const safeUser = params.userId.replace(/[^\w-]/g, "");
  const dir = path.join(config.storageDir, "cvs", safeUser);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(params.originalName || "").toLowerCase() || ".bin";
  const base = path
    .basename(params.originalName || "cv", ext)
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 60);
  const filename = `${Date.now()}-${base || "cv"}${ext}`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, params.buffer);
  return {
    filePath,
    relativePath: path.join("cvs", safeUser, filename),
  };
}

export async function readStoredCvFile(
  filePathOrRelative: string
): Promise<Buffer | null> {
  if (!filePathOrRelative) return null;
  const candidates = [
    filePathOrRelative,
    path.isAbsolute(filePathOrRelative)
      ? filePathOrRelative
      : path.join(config.storageDir, filePathOrRelative),
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(p);
    } catch {
      /* try next */
    }
  }
  return null;
}
