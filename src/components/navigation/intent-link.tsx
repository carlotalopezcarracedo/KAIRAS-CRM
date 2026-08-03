"use client";

import Link from "next/link";
import { useRef, useState, type ComponentProps } from "react";

type IntentLinkProps = Omit<
  ComponentProps<typeof Link>,
  | "href"
  | "prefetch"
  | "onFocus"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onPointerDown"
> & {
  href: string;
  /** `false` desactiva incluso la preparación por intención. */
  prefetch?: boolean | null;
};

/**
 * Evita tormentas de red: solo prepara una ruta completa cuando el usuario
 * pasa el cursor o enfoca su enlace.
 */
export function IntentLink({
  href,
  prefetch,
  children,
  ...props
}: IntentLinkProps) {
  const [prefetchHref, setPrefetchHref] = useState<string | null>(
    prefetch === true ? href : null,
  );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIsPressing = useRef(false);

  function clearHoverTimer() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }

  function prepareOnHover() {
    if (prefetch === false || prefetchHref === href || hoverTimer.current) return;
    hoverTimer.current = setTimeout(() => {
      setPrefetchHref(href);
      hoverTimer.current = null;
    }, 150);
  }

  function prepareOnFocus() {
    if (pointerIsPressing.current) return;
    if (prefetch !== false) setPrefetchHref(href);
  }

  function handlePointerDown() {
    clearHoverTimer();
    pointerIsPressing.current = true;
    setTimeout(() => {
      pointerIsPressing.current = false;
    }, 0);
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch === false ? false : prefetchHref === href}
      onMouseEnter={prepareOnHover}
      onMouseLeave={clearHoverTimer}
      onPointerDown={handlePointerDown}
      onFocus={prepareOnFocus}
    >
      {children}
    </Link>
  );
}
