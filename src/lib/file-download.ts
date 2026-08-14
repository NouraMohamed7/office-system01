// src/lib/file-download.ts

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/zip": "zip",
  "application/json": "json",
  "text/plain": "txt",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

// الأنواع اللي المتصفح يقدر يعرضها مباشرة جوه تاب جديد
const INLINE_VIEWABLE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
]);

function guessExtFromName(name: string): string | null {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function stripExt(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]+$/, "");
}

/**
 * ملف المكتبة بيتخزن في الـ storage من غير امتداد (storage_id بس UUID).
 * الدالة دي بتجيب الملف الحقيقي، تقرأ الـ Content-Type بتاعه، وتبني
 * اسم ملف بامتداد صح. لو النوع قابل للعرض المباشر (صورة/PDF/فيديو/صوت)
 * بتفتحه في تاب جديد، غير كده بتنزّله باسمه الصح (xlsx, docx, zip..الخ).
 */
export async function openOrDownloadFile(url: string, titleForFile: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("تعذر الوصول للملف");
    const blob = await res.blob();
    const mime = blob.type || res.headers.get("content-type") || "";
    const ext = MIME_TO_EXT[mime] ?? guessExtFromName(titleForFile) ?? "";
    const safeTitle = stripExt(titleForFile) || "file";
    const fileName = ext ? `${safeTitle}.${ext}` : safeTitle;

    const objectUrl = URL.createObjectURL(blob);

    if (INLINE_VIEWABLE.has(mime)) {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // نسيب وقت كافي للمتصفح يفتح/ينزل الملف قبل ما نلغي الـ URL
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // fallback لو حصل أي مشكلة (شبكة/CORS) — نفتح الرابط الأصلي زي ما هو
    window.open(url, "_blank", "noopener,noreferrer");
  }
}