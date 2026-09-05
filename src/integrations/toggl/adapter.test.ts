import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TogglApiError,
  TogglClient,
  getTogglConfig,
  getLastTogglQuota,
  isTogglQuotaLow,
  LOW_TOGGL_QUOTA_THRESHOLD,
  TOGGL_CREATED_WITH,
} from "./adapter";

const togglEntry = {
  id: 123456789,
  workspace_id: 111,
  project_id: 222,
  description: "Maquetar home",
  start: "2026-08-01T09:00:00Z",
  stop: "2026-08-01T11:00:00Z",
  duration: 7200,
  tags: ["kairas"],
  billable: true,
  at: "2026-08-01T11:00:01Z",
};

describe("getTogglConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("no está configurado sin token", () => {
    vi.stubEnv("TOGGL_API_TOKEN", "");
    expect(getTogglConfig().configured).toBe(false);
  });

  it("está configurado con token", () => {
    vi.stubEnv("TOGGL_API_TOKEN", "secret-token");
    expect(getTogglConfig().configured).toBe(true);
  });
});

describe("TogglClient", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "secret-token-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("usa Basic Auth con el token como usuario y 'api_token' como contraseña, y nunca lo expone en la URL", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));

    await new TogglClient().getMe();

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.track.toggl.com/api/v9/me");
    expect(String(url)).not.toContain("secret-token-123");
    const headers = options?.headers as Record<string, string>;
    const expected = `Basic ${Buffer.from("secret-token-123:api_token").toString("base64")}`;
    expect(headers.Authorization).toBe(expected);
  });

  it("getMe() mapea la respuesta y no filtra el token en el resultado", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, email: "carlota@kairas.es", fullname: "Carlota", default_workspace_id: 111 }),
        { status: 200 },
      ),
    );
    const me = await new TogglClient().getMe();
    expect(me).toEqual({
      id: 1,
      email: "carlota@kairas.es",
      fullname: "Carlota",
      defaultWorkspaceId: 111,
    });
    expect(JSON.stringify(me)).not.toContain("secret-token-123");
  });

  it("getWorkspaces() y getProjects() consultan las rutas correctas", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 111, name: "Carlota's workspace" }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: 222, workspace_id: 111, name: "Proyecto Kairas", active: true }]),
          { status: 200 },
        ),
      );

    const client = new TogglClient();
    const workspaces = await client.getWorkspaces();
    const projects = await client.getProjects(111);

    expect(workspaces).toEqual([{ id: 111, name: "Carlota's workspace" }]);
    expect(projects).toEqual([{ id: 222, workspaceId: 111, name: "Proyecto Kairas", active: true }]);
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://api.track.toggl.com/api/v9/me/workspaces");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("/workspaces/111/projects");
  });

  it("getTimeEntries() mapea entradas y marca 'running' cuando stop es null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([togglEntry, { ...togglEntry, id: 2, stop: null, duration: -1700000000 }]), {
        status: 200,
      }),
    );

    const entries = await new TogglClient().getTimeEntries({ startDate: "2026-08-01", endDate: "2026-08-31" });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: 123456789, running: false, durationSeconds: 7200 });
    expect(entries[1]).toMatchObject({ id: 2, running: true, stop: null });
  });

  it("getTimeEntries() clasifica el 400 'start_date must not be earlier than X' como RANGE_TOO_OLD, no como error genérico", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('"start_date must not be earlier than 2026-06-05"', { status: 400 }),
    );
    await expect(
      new TogglClient().getTimeEntries({ startDate: "2024-01-01", endDate: "2024-01-31" }),
    ).rejects.toMatchObject({ code: "RANGE_TOO_OLD" });
  });

  it("getTimeEntries() con un 400 sin ese mensaje concreto sigue siendo un error genérico (no RANGE_TOO_OLD)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('"invalid parameter"', { status: 400 }),
    );
    const result = await new TogglClient()
      .getTimeEntries({ startDate: "2024-01-01", endDate: "2024-01-31" })
      .catch((e) => e);
    expect(result.code).not.toBe("RANGE_TOO_OLD");
  });

  it("getCurrentTimeEntry() devuelve null si no hay cronómetro activo en Toggl", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("null", { status: 200 }));
    await expect(new TogglClient().getCurrentTimeEntry()).resolves.toBeNull();
  });

  it("createTimeEntry() envía created_with = 'Kairas CRM'", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(togglEntry), { status: 200 }));

    await new TogglClient().createTimeEntry(111, {
      description: "Prueba",
      start: "2026-08-01T09:00:00Z",
      durationSeconds: -1,
      projectId: 222,
      billable: true,
    });

    const [, options] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(options?.body));
    expect(body.created_with).toBe(TOGGL_CREATED_WITH);
    expect(body.workspace_id).toBe(111);
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMITED"],
    [500, "UNAVAILABLE"],
  ] as const)("mapea HTTP %i a %s", async (status, code) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status }));
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code });
  });

  it("un error no incluye nunca el token en el mensaje", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    try {
      await new TogglClient().getMe();
      throw new Error("no debería llegar aquí");
    } catch (err) {
      expect(err).toBeInstanceOf(TogglApiError);
      expect((err as Error).message).not.toContain("secret-token-123");
    }
  });

  it("JSON inválido produce INVALID_RESPONSE, no una excepción sin controlar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{no-es-json", { status: 200 }));
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("una respuesta que no cumple el contrato también es INVALID_RESPONSE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sinCamposEsperados: true }), { status: 200 }),
    );
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("sin token configurado lanza NOT_CONFIGURED sin llamar a fetch", async () => {
    vi.stubEnv("TOGGL_API_TOKEN", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("timeout de red produce TIMEOUT", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      const err = new Error("timeout");
      err.name = "TimeoutError";
      return Promise.reject(err);
    });
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});

describe("cuota (x-toggl-quota-*)", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "secret-token-123");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lee la cuota de una respuesta 2xx real, sin hacer ninguna llamada extra", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { "x-toggl-quota-remaining": "42", "x-toggl-quota-resets-in": "1000" },
      }),
    );
    await new TogglClient().getMe();
    expect(fetchMock).toHaveBeenCalledTimes(1); // ninguna petición adicional para leer la cuota
    const quota = getLastTogglQuota();
    expect(quota?.remaining).toBe(42);
    expect(quota?.resetsInSeconds).toBe(1000);
  });

  it("también la lee de una respuesta de error (p.ej. 429)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 429,
        headers: { "x-toggl-quota-remaining": "0", "x-toggl-quota-resets-in": "30" },
      }),
    );
    await expect(new TogglClient().getMe()).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(getLastTogglQuota()?.remaining).toBe(0);
  });

  it("isTogglQuotaLow() refleja el umbral sin persistir nada en BD", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: {
          "x-toggl-quota-remaining": String(LOW_TOGGL_QUOTA_THRESHOLD),
          "x-toggl-quota-resets-in": "5",
        },
      }),
    );
    await new TogglClient().getMe();
    expect(isTogglQuotaLow()).toBe(true);
  });

  it("una respuesta sin esas cabeceras no rompe nada y conserva la última cuota conocida", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { "x-toggl-quota-remaining": "7", "x-toggl-quota-resets-in": "9" },
      }),
    );
    await new TogglClient().getMe();
    expect(getLastTogglQuota()?.remaining).toBe(7);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }), // sin cabeceras de cuota
    );
    await new TogglClient().getMe();
    expect(getLastTogglQuota()?.remaining).toBe(7); // no se pisó con "nada"
  });
});
