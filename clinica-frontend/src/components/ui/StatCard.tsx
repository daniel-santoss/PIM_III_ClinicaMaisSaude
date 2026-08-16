import type { ReactNode } from "react";

type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

const TILE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-[#EEF2F7] text-body",
};

const VALUE_TONE: Record<Tone, string> = {
  brand: "text-ink",
  success: "text-success",
  warning: "text-warning-text",
  danger: "text-danger",
  neutral: "text-ink",
};

interface StatCardProps {
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  /** Cor do tile do ícone. */
  tone?: Tone;
  /** Cor do número principal (default: ink). */
  valueTone?: Tone;
  /** "spread" = ícone à esquerda e label à direita; "inline" = ícone + label juntos. */
  layout?: "spread" | "inline";
  /** Corpo customizado no lugar de value/sub (Equipe, Distribuição, Risco...). */
  children?: ReactNode;
  className?: string;
}

/**
 * Card de métrica compacto do design system: superfície branca com borda,
 * padding enxuto (px-4 py-[11px]), tile de ícone 32px e hierarquia label → valor → sub.
 */
export default function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "brand",
  valueTone,
  layout = "spread",
  children,
  className = "",
}: StatCardProps) {
  const tile = icon && (
    <div className={`w-8 h-8 shrink-0 rounded-lg grid place-items-center ${TILE[tone]}`}>{icon}</div>
  );
  const rotulo = (
    <span className="font-semibold text-[11px] tracking-wide text-muted uppercase">{label}</span>
  );

  return (
    <div className={`bg-white border border-line rounded-lg px-4 py-[11px] ${className}`}>
      {layout === "inline" ? (
        <div className="flex items-center gap-2.5">
          {tile}
          {rotulo}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          {tile}
          {rotulo}
        </div>
      )}

      {children ?? (
        <>
          {value !== undefined && (
            <div className={`font-bold text-[22px] leading-tight mt-0.5 ${VALUE_TONE[valueTone ?? "brand"]}`}>
              {value}
            </div>
          )}
          {sub !== undefined && <div className="text-xs text-muted mt-0.5">{sub}</div>}
        </>
      )}
    </div>
  );
}
