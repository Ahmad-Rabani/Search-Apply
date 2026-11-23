import {
  extractCvDesignHtml,
  extractTextFromCv,
  parseCvTextToProfile,
  type ParsedProfile,
} from "./cvParse.js";
import { saveUploadedCvFile } from "./cvStorage.js";

export type PreparedCvUpload = ParsedProfile & {
  designHtml: string;
  designSource: "vision" | "docx" | "html" | "text";
  originalFilePath: string;
  originalMimeType: string;
  originalName: string;
};

export async function prepareCvUpload(params: {
  userId: string;
  file: Express.Multer.File;
}): Promise<PreparedCvUpload> {
  const { file } = params;
  const originalName = file.originalname || "cv.pdf";
  const mimeType = file.mimetype || "application/octet-stream";

  const text = await extractTextFromCv(file.buffer, originalName, mimeType);
  const parsed = await parseCvTextToProfile(text);
  const designHtml = await extractCvDesignHtml(
    file.buffer,
    originalName,
    mimeType,
    text
  );

  const { relativePath } = await saveUploadedCvFile({
    userId: params.userId,
    originalName,
    buffer: file.buffer,
  });

  const lower = originalName.toLowerCase();
  let designSource: PreparedCvUpload["designSource"] = "text";
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) designSource = "vision";
  else if (lower.endsWith(".docx") || lower.endsWith(".doc")) designSource = "docx";
  else if (lower.endsWith(".html") || lower.endsWith(".htm")) designSource = "html";

  return {
    ...parsed,
    email: parsed.email || "",
    designHtml,
    designSource,
    originalFilePath: relativePath,
    originalMimeType: mimeType,
    originalName,
  };
}
