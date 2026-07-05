import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./adapter";

/**
 * Driver local: guarda en .uploads/ (gitignored). Solo para desarrollo:
 * en Vercel el filesystem es efímero y los archivos se PIERDEN.
 * La clave se sanea para impedir path traversal.
 */
const ROOT = path.join(process.cwd(), ".uploads");

function safePath(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9._/-]/g, "_");
  const resolved = path.resolve(ROOT, cleaned);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    throw new Error("STORAGE_INVALID_KEY");
  }
  return resolved;
}

export const localStorageDriver: StorageDriver = {
  name: "local",

  async upload(key, data) {
    const filePath = safePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  },

  async getSignedUrl() {
    return null; // local: se sirve en streaming desde la ruta de descarga
  },

  async read(key) {
    return readFile(safePath(key));
  },

  async delete(key) {
    try {
      await unlink(safePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },
};
