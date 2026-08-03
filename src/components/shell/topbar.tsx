import { Suspense } from "react";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import Image from "next/image";
import { Plus, LogOut } from "lucide-react";
import { signOut } from "@/server/auth";
import { getActiveTimer } from "@/server/services/time-service";
import { initials } from "@/lib/utils";
import { TimerWidget, type ActiveTimerData } from "./timer-widget";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

async function ActiveTimer({ userId }: { userId: string }) {
  let activeTimer: ActiveTimerData = null;
  let timer;
  try {
    timer = await getActiveTimer(userId);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "active_timer_load_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return <TimerWidget active={null} />;
  }
  if (timer) {
    activeTimer = {
      id: timer.id,
      startedAt: timer.startedAt.toISOString(),
      accumulatedSeconds: timer.accumulatedSeconds,
      title: timer.currentTitle,
      billable: timer.billable,
    };
  }
  return <TimerWidget active={activeTimer} />;
}

function TimerFallback() {
  return (
    <span
      aria-hidden="true"
      className="h-9 w-9 animate-pulse rounded-full border border-line bg-surface"
    />
  );
}

export function Topbar({ user }: { user: { id: string; name: string } }) {
  const isProduction = process.env.APP_ENV === "production";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard" className="lg:hidden">
          <Image
            src="/brand/kairas-logo-horizontal.png"
            alt="KAIRAS"
            width={107}
            height={16}
            priority
            className="h-4 w-auto"
          />
        </Link>
        {!isProduction ? (
          <span
            title="Estás en el entorno local de desarrollo. Los datos NO están en la nube ni tienen backups automáticos."
            className="rounded-full border border-warn/40 bg-warn-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-warn"
          >
            Local
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        <Suspense fallback={<TimerFallback />}>
          <ActiveTimer userId={user.id} />
        </Suspense>
        <Link
          href="/leads/new"
          prefetch={false}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet px-4 text-xs font-semibold text-white transition-colors hover:bg-violet/85"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nuevo lead</span>
          <span className="sm:hidden">Lead</span>
        </Link>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold text-lavender"
          title={user.name}
        >
          {initials(user.name || "K")}
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-faint transition-colors hover:bg-raise hover:text-foam"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
