"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full h-10 rounded-xl border border-line bg-ink px-3.5 text-sm text-foam placeholder:text-faint focus:border-violet-line transition-colors";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputClass, "h-auto min-h-24 py-2.5 resize-y", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(inputClass, "appearance-none pr-8 bg-no-repeat cursor-pointer", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23e1e8f0' stroke-opacity='0.45' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
        backgroundPosition: "right 0.75rem center",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  error,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="k-label block">
        {label}
        {required ? <span className="text-violet"> *</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : null}
    </label>
  );
}
