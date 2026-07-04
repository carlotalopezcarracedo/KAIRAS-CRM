import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { auth, signOut } from "@/server/auth";
import { getActiveTimer } from "@/server/services/time-service";
import { initials } from "@/lib/utils";
import { TimerWidget, type ActiveTimerData } from "./timer-widget";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export async function Topbar() {
  const session = await auth();
  const name = session?.user?.name ?? "";

  let activeTimer: ActiveTimerData = null;
  if (session?.user?.id) {
    const timer = await getActiveTimer(session.user.id);
    if (timer) {
      activeTimer = {
        id: timer.id,
        startedAt: timer.startedAt.toISOString(),
        accumulatedSeconds: timer.accumulatedSeconds,
        title: timer.currentTitle,
        billable: timer.billable,
      };
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur sm:px-6">
      <Link href="/dashboard" className="lg:hidden">
        <span className="text-sm font-extrabold tracking-[0.3em] text-foam">
          KAIRAS
        </span>
      </Link>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2.5">
        <TimerWidget active={activeTimer} />
        <Link
          href="/leads/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet px-4 text-xs font-semibold text-white transition-colors hover:bg-violet/85"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nuevo lead</span>
          <span className="sm:hidden">Lead</span>
        </Link>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold text-lavender"
          title={name}
        >
          {initials(name || "K")}
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
