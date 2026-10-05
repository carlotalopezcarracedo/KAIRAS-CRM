"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Status = "unsupported" | "checking" | "denied" | "off" | "on";

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushNotificationsForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    }
    check();
  }, []);

  async function enable() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("Notificaciones no configuradas en el servidor");
      return;
    }
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error();
      setStatus("on");
      toast.success("Notificaciones activadas");
    } catch {
      toast.error("No se pudieron activar las notificaciones");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
      toast.success("Notificaciones desactivadas");
    } catch {
      toast.error("No se pudieron desactivar");
    } finally {
      setPending(false);
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-mist">
        Este navegador no soporta notificaciones push. En iPhone, añade KAIRAS a
        la pantalla de inicio desde Safari (Compartir → Añadir a pantalla de
        inicio) y vuelve a entrar desde ahí.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-mist">
        Bloqueaste los avisos para esta web. Actívalos en los ajustes de
        notificaciones del navegador o del sistema para recibir recordatorios de
        tareas y seguimientos.
      </p>
    );
  }

  if (status === "checking") {
    return <p className="text-sm text-faint">Comprobando…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-mist">
        Avisa en este dispositivo cuando llegue la hora de un recordatorio de
        tarea o de un seguimiento de lead.
      </p>
      {status === "on" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger"
          disabled={pending}
          onClick={disable}
        >
          <BellOff className="h-4 w-4" />
          Desactivar en este dispositivo
        </Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={enable}>
          {pending ? <BellRing className="h-4 w-4 animate-pulse" /> : <Bell className="h-4 w-4" />}
          {pending ? "Activando…" : "Activar en este dispositivo"}
        </Button>
      )}
    </div>
  );
}
