import * as React from "react";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none cursor-pointer";

const variants = {
  primary: "bg-violet text-white hover:bg-violet/85",
  secondary:
    "bg-surface text-foam border border-line hover:border-line-strong hover:bg-raise",
  ghost: "text-mist hover:text-foam hover:bg-raise",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
} as const;

const sizes = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-sm",
  icon: "h-9 w-9 p-0",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
