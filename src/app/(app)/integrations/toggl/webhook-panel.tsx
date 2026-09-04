"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Radio, Trash2, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  configureWebhookAction,
  pingWebhookAction,
  refreshWebhookAction,
  removeWebhookAction,
} from "./actions";

type WebhookStatus = "not_configured" | "pending_validation" | "active" | "error";

export type WebhookPanelProps = {
  status: WebhookStatus;
  subscriptionId: number | null;
  callbackUrl: string | null;
  expectedCallbackUrl: string | null;
  validatedAt: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  lastEnvelope: string | null;
  secretConfigured: boolean;
  appUrlConfigured: boolean;
  canManage: boolean;
};

const LABEL: Record<WebhookStatus, string> = {
  not_configured: "No configurado",
  pending_validation: "Pendiente de validación",
  active: "Activo",
  error: "Error",
};

const TONE: Record<WebhookStatus, "ok" | "info" | "warn" | "danger"> = {
  not_configured: "warn",
  pending_validation: "info",
  active: "ok",
  error: "danger",
};

export function WebhookPanel(props: WebhookPanelProps) {
  const [pending, startTransition] = useTransition();
  const [showEnvelope, setShowEnvelope] = useState(false);
  const router = useRouter();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, okMessage: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "No se ha podido completar la acción.");
        return;
      }
      toast.success(okMessage);
      router.refresh();
    });

  const missingRequirements: string[] = [];
  if (!props.secretConfigured) missingRequirements.push("TOGGL_WEBHOOK_SECRET");
  if (!props.appUrlConfigured) missingRequirements.push("APP_URL");

  const urlMismatch =
    props.callbackUrl &&
    props.expectedCallbackUrl &&
    props.callbackUrl !== props.expectedCallbackUrl;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={TONE[props.status]}>{LABEL[props.status]}</Badge>
            {props.subscriptionId ? (
              <span className="text-xs text-faint">Suscripción #{props.subscriptionId}</span>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-faint">
            Sin webhook, los cambios hechos en Toggl solo llegan al pulsar
            &quot;Sincronizar ahora&quot;.
          </p>
        </div>
      </div>

      {missingRequirements.length > 0 ? (
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          Falta configurar en el servidor: {missingRequirements.join(" y ")}. El webhook no se
          puede activar hasta entonces.
        </p>
      ) : null}

      {urlMismatch ? (
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          La suscripción apunta a <code>{props.callbackUrl}</code> pero APP_URL es{" "}
          <code>{props.expectedCallbackUrl}</code>. Vuelve a configurarla.
        </p>
      ) : null}

      <dl className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mist">URL de destino</dt>
          <dd className="truncate text-right text-xs text-faint">
            {props.callbackUrl ?? props.expectedCallbackUrl ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mist">Validada</dt>
          <dd className="text-xs text-faint">
            {props.validatedAt ? formatDateTime(new Date(props.validatedAt)) : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mist">Último evento</dt>
          <dd className="text-xs text-faint">
            {props.lastEventAt ? formatDateTime(new Date(props.lastEventAt)) : "Ninguno todavía"}
          </dd>
        </div>
      </dl>

      {props.lastError ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {props.lastError}
        </p>
      ) : null}

      {props.canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending || missingRequirements.length > 0}
            onClick={() => run(configureWebhookAction, "Webhook configurado en Toggl")}
          >
            <PlugZap className="h-3.5 w-3.5" />
            {props.subscriptionId ? "Reconfigurar" : "Configurar webhook"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || !props.subscriptionId}
            onClick={() => run(pingWebhookAction, "Ping enviado a Toggl")}
          >
            <Radio className="h-3.5 w-3.5" />
            Probar / Ping
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || !props.subscriptionId}
            onClick={() => run(refreshWebhookAction, "Estado actualizado")}
          >
            <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Revalidar estado
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || !props.subscriptionId}
            onClick={() => run(removeWebhookAction, "Webhook eliminado")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      ) : (
        <p className="text-xs text-faint">Solo la propietaria puede configurar el webhook.</p>
      )}

      {props.lastEnvelope ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowEnvelope((v) => !v)}
            className="text-xs font-semibold text-faint transition-colors hover:text-foam"
          >
            {showEnvelope ? "Ocultar" : "Ver"} el último evento recibido
          </button>
          {showEnvelope ? (
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-line bg-ink/60 p-3 text-[11px] leading-relaxed text-mist">
              {props.lastEnvelope}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
