import type { StorageDriver } from "./adapter";

/**
 * Driver Supabase Storage (bucket privado) vía REST con la service role
 * key. Sin SDK: menos dependencias, todo server-side. La key NUNCA sale
 * del servidor; a la usuaria solo llegan URLs firmadas de corta duración.
 */

function config() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "kairas-files";
  if (!url || !key) throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  return { url: url.replace(/\/$/, ""), key, bucket };
}

export const supabaseStorageDriver: StorageDriver = {
  name: "supabase",

  async upload(key, data, contentType) {
    const { url, key: apiKey, bucket } = config();
    const response = await fetch(
      `${url}/storage/v1/object/${bucket}/${encodeURI(key)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": contentType || "application/octet-stream",
          "x-upsert": "false",
        },
        body: new Uint8Array(data),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`SUPABASE_UPLOAD_${response.status}: ${body.slice(0, 200)}`);
    }
  },

  async getSignedUrl(key, expiresInSeconds) {
    const { url, key: apiKey, bucket } = config();
    const response = await fetch(
      `${url}/storage/v1/object/sign/${bucket}/${encodeURI(key)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`SUPABASE_SIGN_${response.status}: ${body.slice(0, 200)}`);
    }
    const json = (await response.json()) as { signedURL?: string };
    if (!json.signedURL) throw new Error("SUPABASE_SIGN_EMPTY");
    return `${url}/storage/v1${json.signedURL}`;
  },

  async read(): Promise<Buffer> {
    // No se usa: con Supabase la descarga va por URL firmada (redirect).
    throw new Error("SUPABASE_READ_NOT_SUPPORTED");
  },

  async delete(key) {
    const { url, key: apiKey, bucket } = config();
    const response = await fetch(
      `${url}/storage/v1/object/${bucket}/${encodeURI(key)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } },
    );
    // 404 = ya no existe: aceptable para borrado idempotente
    if (!response.ok && response.status !== 404) {
      const body = await response.text().catch(() => "");
      throw new Error(`SUPABASE_DELETE_${response.status}: ${body.slice(0, 200)}`);
    }
  },
};
