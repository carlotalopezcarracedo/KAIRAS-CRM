import { localStorageDriver } from "./local-storage";
import { supabaseStorageDriver } from "./supabase-storage";

/**
 * Almacenamiento de archivos — capa de adaptadores.
 *
 * Reglas:
 * - Los binarios NUNCA van a PostgreSQL: solo metadata + storageKey.
 * - Nada de URLs públicas permanentes: la descarga pasa siempre por
 *   /files/[id]/download (autenticada) que sirve el archivo o redirige a
 *   una URL firmada de corta duración.
 *
 * Drivers:
 * - "supabase": bucket PRIVADO de Supabase Storage vía REST con la
 *   service role key (solo servidor). Se activa con SUPABASE_URL +
 *   SUPABASE_SERVICE_ROLE_KEY.
 * - "local": sistema de archivos (.uploads/, fuera de git). Fallback de
 *   desarrollo; en Vercel NO persiste (filesystem efímero).
 */
export type StorageDriver = {
  name: "local" | "supabase";
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  /** URL de descarga temporal (supabase) o null si hay que servir en streaming (local). */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string | null>;
  /** Lectura directa para streaming (solo driver local). */
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

export function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "kairas-files";
  const maxFileMb = Number(process.env.MAX_FILE_MB ?? 4);
  const supabaseConfigured = !!(supabaseUrl && serviceKey);
  return {
    driver: (supabaseConfigured ? "supabase" : "local") as "supabase" | "local",
    supabaseUrl,
    serviceKey,
    bucket,
    maxFileMb: Number.isFinite(maxFileMb) && maxFileMb > 0 ? maxFileMb : 4,
  };
}

export function getStorage(): StorageDriver {
  const config = getStorageConfig();
  return config.driver === "supabase" ? supabaseStorageDriver : localStorageDriver;
}

/** Tipos permitidos: extensión → MIME esperados. */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  svg: ["image/svg+xml"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  odt: ["application/vnd.oasis.opendocument.text"],
  txt: ["text/plain"],
  md: ["text/plain", "text/markdown"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ods: ["application/vnd.oasis.opendocument.spreadsheet"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

export function validateFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
): { ok: true; extension: string } | { ok: false; error: string } {
  const { maxFileMb } = getStorageConfig();
  if (sizeBytes > maxFileMb * 1024 * 1024) {
    return {
      ok: false,
      error: `El archivo supera el límite de ${maxFileMb} MB.`,
    };
  }
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed = ALLOWED_FILE_TYPES[extension];
  if (!allowed) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido (.${extension}). Permitidos: ${Object.keys(ALLOWED_FILE_TYPES).join(", ")}.`,
    };
  }
  // El MIME del navegador puede variar; la extensión manda, el MIME avisa.
  if (mimeType && !allowed.includes(mimeType) && mimeType !== "application/octet-stream") {
    return {
      ok: false,
      error: `El contenido (${mimeType}) no coincide con la extensión .${extension}.`,
    };
  }
  return { ok: true, extension };
}
