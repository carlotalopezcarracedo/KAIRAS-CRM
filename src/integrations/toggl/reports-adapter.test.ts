import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TogglReportsClient, TogglReportsError } from "./reports-adapter";
import { getLastTogglQuota } from "./adapter";

function group(overrides: Partial<{
  project_id: number | null;
  billable: boolean;
  description: string | null;
  time_entries: Array<{ id: number; seconds: number; start: string; stop: string | null; at: string }>;
}> = {}) {
  return {
    project_id: 222,
    billable: true,
    description: "Trabajo de prueba",
    time_entries: [
      { id: 1, seconds: 3600, start: "2026-05-11T09:00:00+02:00", stop: "2026-05-11T10:00:00+02:00", at: "2026-05-11T08:00:01Z" },
    ],
    ...overrides,
  };
}

describe("TogglReportsClient", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "secret-token-123");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sin token configurado, no llega a hacer ninguna petición", async () => {
    vi.stubEnv("TOGGL_API_TOKEN", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      new TogglReportsClient().getDetailedTimeEntries({
        workspaceId: 111,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("usa Basic Auth con el token como usuario y 'api_token' como contraseña, contra la URL del Reports API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.track.toggl.com/reports/api/v3/workspace/111/search/time_entries",
    );
    expect(String(url)).not.toContain("secret-token-123");
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("secret-token-123:api_token").toString("base64")}`,
    );
    expect(options?.method).toBe("POST");
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ start_date: "2026-05-01", end_date: "2026-05-31" });
  });

  it("aplana los grupos: cada ocurrencia de time_entries[] se convierte en una TogglTimeEntry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          group({
            project_id: 222,
            billable: false,
            description: "Reunión",
            time_entries: [
              { id: 10, seconds: 1800, start: "2026-05-11T16:00:00+02:00", stop: "2026-05-11T16:30:00+02:00", at: "2026-05-18T14:46:27Z" },
              { id: 11, seconds: 900, start: "2026-05-12T16:00:00+02:00", stop: "2026-05-12T16:15:00+02:00", at: "2026-05-19T14:46:27Z" },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const entries = await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: 10,
      workspaceId: 111,
      projectId: 222,
      description: "Reunión",
      billable: false,
      durationSeconds: 1800,
      running: false,
      deletedAt: null,
    });
    expect(entries[1]).toMatchObject({ id: 11, durationSeconds: 900 });
  });

  it("marca 'running' cuando stop es null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([group({ time_entries: [{ id: 20, seconds: 0, start: "2026-05-11T09:00:00Z", stop: null, at: "2026-05-11T09:00:00Z" }] })]),
        { status: 200 },
      ),
    );
    const entries = await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(entries[0]).toMatchObject({ running: true, stop: null });
  });

  it("pagina de verdad: sigue X-Next-ID/X-Next-Row-Number hasta que la cabecera desaparece, sin duplicar ni saltarse filas", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify([group({ time_entries: [{ id: 1, seconds: 60, start: "a", stop: "b", at: "c" }] })]), {
            status: 200,
            headers: { "x-next-id": "1", "x-next-row-number": "2" },
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify([group({ time_entries: [{ id: 2, seconds: 60, start: "a", stop: "b", at: "c" }] })]), {
            status: 200,
            headers: { "x-next-id": "2", "x-next-row-number": "3" },
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify([group({ time_entries: [{ id: 3, seconds: 60, start: "a", stop: "b", at: "c" }] })]), {
            status: 200, // sin cabeceras de siguiente página: última.
          }),
      );

    const entries = await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      pageSize: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(entries.map((e) => e.id)).toEqual([1, 2, 3]); // ninguna duplicada, ninguna perdida

    // La 2ª y 3ª petición deben llevar el cursor que devolvió la anterior.
    const body2 = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body));
    expect(body2).toMatchObject({ first_id: 1, first_row_number: 2 });
    const body3 = JSON.parse(String(fetchMock.mock.calls[2]![1]?.body));
    expect(body3).toMatchObject({ first_id: 2, first_row_number: 3 });
  });

  it("sin cabecera de siguiente página, no hace una segunda llamada", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([group()]), { status: 200 }));
    await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMITED"],
    [402, "RATE_LIMITED"],
    [500, "UNAVAILABLE"],
    [503, "UNAVAILABLE"],
  ])("HTTP %i se traduce a %s", async (status, code) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status }));
    await expect(
      new TogglReportsClient().getDetailedTimeEntries({
        workspaceId: 111,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code });
  });

  it("un JSON ilegible se traduce a INVALID_RESPONSE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no es json", { status: 200 }));
    await expect(
      new TogglReportsClient().getDetailedTimeEntries({
        workspaceId: 111,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("una estructura inesperada (no es un array de grupos) se traduce a INVALID_RESPONSE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ not: "an array" }), { status: 200 }),
    );
    await expect(
      new TogglReportsClient().getDetailedTimeEntries({
        workspaceId: 111,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("un fallo de red se traduce a UNAVAILABLE, nunca deja pasar el error crudo de fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(
      new TogglReportsClient().getDetailedTimeEntries({
        workspaceId: 111,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      }),
    ).rejects.toBeInstanceOf(TogglReportsError);
  });

  it("nunca revela el token en el mensaje de un error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const err = await new TogglReportsClient()
      .getDetailedTimeEntries({ workspaceId: 111, startDate: "2026-05-01", endDate: "2026-05-31" })
      .catch((e) => e);
    expect(String(err.message)).not.toContain("secret-token-123");
  });

  it("alimenta el mismo singleton de cuota que Track API (misma cuenta, misma cuota)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-toggl-quota-remaining": "17", "x-toggl-quota-resets-in": "123" },
      }),
    );
    await new TogglReportsClient().getDetailedTimeEntries({
      workspaceId: 111,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(getLastTogglQuota()?.remaining).toBe(17);
  });
});
