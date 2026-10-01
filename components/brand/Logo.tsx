import { cn } from "@/lib/utils/helpers";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/** SlidesForge AI mark: a forged slide stack with an accent edge. */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-[7px] border"
        style={{
          borderColor: "var(--sf-border-strong)",
          background:
            "linear-gradient(150deg, rgba(109,139,255,0.22), rgba(167,139,250,0.14))",
        }}
      >
        <span
          className="absolute h-3 w-3.5 rounded-[2px] border"
          style={{
            borderColor: "var(--sf-accent)",
            transform: "translate(-2px, -2px)",
            opacity: 0.7,
          }}
        />
        <span
          className="absolute h-3 w-3.5 rounded-[2px]"
          style={{
            background: "var(--sf-accent)",
            transform: "translate(2px, 2px)",
          }}
        />
      </span>
      {showWordmark ? (
        <span className="text-[13px] font-semibold tracking-tight">
          SlidesForge<span className="text-[var(--sf-text-subtle)]"> AI</span>
        </span>
      ) : null}
    </span>
  );
}
