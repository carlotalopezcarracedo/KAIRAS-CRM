"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type ComponentProps } from "react";

type IntentLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch" | "onFocus" | "onMouseEnter" | "onPointerDown"
> & {
  href: string;
  /** Prepara la ruta al aparecer. El resto solo se prepara cuando hay intencion. */
  priorityPrefetch?: boolean;
};

/**
 * Evita la tormenta de prefetch de navegaciones grandes y conserva una respuesta
 * instantanea: la ruta se calienta al pasar el cursor, enfocarla o tocarla.
 */
export function IntentLink({
  href,
  priorityPrefetch = false,
  children,
  ...props
}: IntentLinkProps) {
  const router = useRouter();
  const warmedHref = useRef<string | null>(priorityPrefetch ? href : null);
  const warmRoute = useCallback(() => {
    if (warmedHref.current === href) return;
    warmedHref.current = href;
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={priorityPrefetch}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onPointerDown={warmRoute}
    >
      {children}
    </Link>
  );
}
