import { describe, expect, it } from "vitest";
import {
  verifyTogglSignature,
  signTogglPayload,
  parseTogglWebhook,
  webhookEntryToTogglTimeEntry,
  TOGGL_SUBSCRIPTION_DESCRIPTION,
} from "./webhooks";

const SECRET = "test-webhook-secret";

describe("verifyTogglSignature", () => {
  it("acepta una firma válida en formato sha256=<hex>", () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = signTogglPayload(body, SECRET);
    expect(verifyTogglSignature(body, signature, SECRET)).toEqual({ valid: true });
  });

  it("acepta el hex pelado por tolerancia", () => {
    const body = "{}";
    const signature = signTogglPayload(body, SECRET).replace("sha256=", "");
    expect(verifyTogglSignature(body, signature, SECRET)).toEqual({ valid: true });
  });

  it("rechaza una firma incorrecta", () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = signTogglPayload(body, "otro-secreto");
    expect(verifyTogglSignature(body, signature, SECRET)).toEqual({
      valid: false,
      reason: "mismatch",
    });
  });

  it("rechaza si falta la cabecera", () => {
    expect(verifyTogglSignature("{}", null, SECRET)).toEqual({
      valid: false,
      reason: "missing_header",
    });
  });

  it("rechaza si falta el secreto configurado", () => {
    expect(verifyTogglSignature("{}", "sha256=abc", undefined)).toEqual({
      valid: false,
      reason: "missing_secret",
    });
  });

  it("rechaza un formato irreconocible", () => {
    expect(verifyTogglSignature("{}", "no-es-hex", SECRET)).toEqual({
      valid: false,
      reason: "bad_format",
    });
  });

  it("cuadrar sobre JSON.stringify(parsed) en vez del cuerpo crudo NO produce la misma firma", () => {
    // El cuerpo real trae un espacio; re-serializarlo lo elimina, así que
    // firmar sobre el objeto ya parseado da un HMAC distinto. Esto es
    // justamente lo que la ruta pública evita al firmar el texto crudo.
    const rawBody = '{"a": 1}';
    const reserialized = JSON.stringify(JSON.parse(rawBody));
    expect(reserialized).not.toBe(rawBody);
    const signature = signTogglPayload(rawBody, SECRET);
    expect(verifyTogglSignature(reserialized, signature, SECRET)).toEqual({
      valid: false,
      reason: "mismatch",
    });
  });
});

describe("parseTogglWebhook", () => {
  it("reconoce el sobre de validación de la suscripción", () => {
    const parsed = parseTogglWebhook({
      validation_code: "abc123",
      validation_code_url: "https://example/validate",
    });
    expect(parsed).toEqual({
      kind: "validation",
      validationCode: "abc123",
      validationCodeUrl: "https://example/validate",
    });
  });

  it("reconoce un ping", () => {
    expect(parseTogglWebhook({ payload: "ping" })).toEqual({ kind: "ping" });
  });

  it("parsea una entrada creada (metadata.action)", () => {
    const parsed = parseTogglWebhook({
      event_id: 1,
      timestamp: "2026-08-01T10:00:00Z",
      metadata: { action: "time_entry.created", model: "time_entry" },
      payload: {
        id: 999,
        workspace_id: 1,
        start: "2026-08-01T09:00:00Z",
        stop: "2026-08-01T10:00:00Z",
        duration: 3600,
        at: "2026-08-01T10:00:01Z",
      },
    });
    expect(parsed.kind).toBe("time_entry");
    if (parsed.kind === "time_entry") {
      expect(parsed.action).toBe("created");
      expect(parsed.entry.id).toBe(999);
    }
  });

  it("parsea acción desde event_type cuando no hay metadata.action", () => {
    const parsed = parseTogglWebhook({
      event_type: "time_entry.updated",
      payload: {
        id: 1,
        workspace_id: 1,
        start: "2026-08-01T09:00:00Z",
        stop: null,
        duration: -1,
        at: "2026-08-01T10:00:01Z",
      },
    });
    expect(parsed.kind).toBe("time_entry");
    if (parsed.kind === "time_entry") expect(parsed.action).toBe("updated");
  });

  it("ignora modelos que no son time_entry", () => {
    const parsed = parseTogglWebhook({
      metadata: { action: "created", model: "project" },
      payload: { id: 1 },
    });
    expect(parsed).toEqual({ kind: "ignored", reason: "modelo no gestionado: project" });
  });

  it("ignora un payload sin una entrada de tiempo válida", () => {
    const parsed = parseTogglWebhook({
      metadata: { action: "created", model: "time_entry" },
      payload: { no: "es una entrada" },
    });
    expect(parsed.kind).toBe("ignored");
  });

  it("ignora un sobre irreconocible sin lanzar", () => {
    expect(parseTogglWebhook("no soy un objeto")).toEqual({
      kind: "ignored",
      reason: "sobre no reconocible",
    });
    expect(parseTogglWebhook(null)).toEqual({
      kind: "ignored",
      reason: "sobre no reconocible",
    });
  });
});

describe("webhookEntryToTogglTimeEntry", () => {
  it("marca running=true cuando la duración es negativa", () => {
    const mapped = webhookEntryToTogglTimeEntry(
      {
        id: 1,
        workspace_id: 1,
        start: "2026-08-01T09:00:00Z",
        stop: null,
        duration: -1700000000,
        at: "2026-08-01T09:00:01Z",
      },
      "created",
    );
    expect(mapped.running).toBe(true);
    expect(mapped.deletedAt).toBeNull();
  });

  it("marca deletedAt cuando la acción es 'deleted', aunque falte server_deleted_at", () => {
    const mapped = webhookEntryToTogglTimeEntry(
      {
        id: 1,
        workspace_id: 1,
        start: "2026-08-01T09:00:00Z",
        stop: "2026-08-01T10:00:00Z",
        duration: 3600,
        at: "2026-08-01T10:05:00Z",
      },
      "deleted",
    );
    expect(mapped.deletedAt).toBe("2026-08-01T10:05:00Z"); // usa "at" como respaldo
  });
});

describe("TOGGL_SUBSCRIPTION_DESCRIPTION", () => {
  it("es estable y única para no crear suscripciones duplicadas", () => {
    expect(TOGGL_SUBSCRIPTION_DESCRIPTION).toBe("Kairas CRM Time Sync");
  });
});
