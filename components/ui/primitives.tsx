/**
 * Small presentational primitives shared by the shell and route pages.
 *
 * These are intentionally thin: they encode the visual system (panel, chip,
 * page header, empty state) without adding behaviour or pretending a feature
 * works.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/helpers";

export function Panel({
  children,
  className,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <section className={cn(elevated ? "sf-panel-elevated" : "sf-panel", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 border-b px-5 py-4",
        className,
      )}
      style={{ borderColor: "var(--sf-border)" }}
    >
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--sf-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--sf-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type ChipTone = "default" | "accent" | "planned";

export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  const toneClass =
    tone === "accent" ? "sf-chip-accent" : tone === "planned" ? "sf-chip-planned" : "";
  return <span className={cn("sf-chip", toneClass, className)}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="sf-grid-bg flex flex-col items-center justify-center rounded-[var(--sf-radius)] border border-dashed px-8 py-14 text-center">
      <div
        aria-hidden
        className="mb-5 h-10 w-10 rounded-[10px] border"
        style={{
          borderColor: "var(--sf-border-strong)",
          background: "rgba(255,255,255,0.02)",
        }}
      />
      <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-[12px] leading-relaxed text-[var(--sf-text-muted)]">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  type = "button",
  disabled,
  className,
  title,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--sf-radius-sm)] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary:
      "border border-transparent text-[#0b0d12] bg-[var(--sf-accent)] hover:bg-[#7f99ff]",
    secondary:
      "border text-[var(--sf-text)] bg-[rgba(255,255,255,0.02)] hover:bg-[var(--sf-surface-hover)]",
    ghost: "border border-transparent text-[var(--sf-text-muted)] hover:text-[var(--sf-text)]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(base, variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function StatusRow({
  label,
  value,
  status = "planned",
}: {
  label: string;
  value: string;
  status?: "available" | "planned" | "unavailable";
}) {
  const tone =
    status === "available" ? "var(--sf-success)" : status === "planned" ? "var(--sf-warning)" : "var(--sf-text-subtle)";
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-3 last:border-b-0" style={{ borderColor: "var(--sf-border)" }}>
      <div className="min-w-0">
        <p className="text-[12px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-[var(--sf-text-muted)]">{value}</p>
      </div>
      <span className="flex items-center gap-2 text-[11px] text-[var(--sf-text-subtle)]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
        {status}
      </span>
    </div>
  );
}
