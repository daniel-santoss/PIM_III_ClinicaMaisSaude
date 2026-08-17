import type { ReactNode } from "react";

export type BadgeVariant = "brand" | "success" | "warning" | "danger" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  brand: "bg-brand-50 border-brand-200 text-brand-600",
  success: "bg-success-tint border-success-border text-success",
  warning: "bg-warning-tint border-warning-border text-warning-text",
  danger: "bg-danger-tint border-danger-border text-danger",
  neutral: "bg-line-soft border-line text-body",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/** Badge do design system: pílula uppercase com borda, por variante semântica. */
export default function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold text-[11px] tracking-wide px-2.5 py-1 rounded-md border uppercase whitespace-nowrap ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Mapeia os nomes de status do backend para a variante de badge do DS. */
export function variantePorStatus(status?: string): BadgeVariant {
  switch (status) {
    case "Agendado":
    case "RetornoAgendado":
      return "brand";
    case "Finalizado":
      return "success";
    case "EmAtendimento":
    case "Em Atendimento":
    case "AguardandoRetorno":
    case "Aguardando Retorno":
    case "Em triagem":
      return "warning";
    case "Faltou":
      return "danger";
    case "Cancelado":
      return "neutral";
    default:
      return "neutral";
  }
}
