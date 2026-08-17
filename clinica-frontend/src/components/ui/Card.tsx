import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Superfície do design system: branca, borda #E2E8F0, raio 8px (sem sombra). */
export default function Card({ children, className = "" }: CardProps) {
  return <section className={`bg-white border border-line rounded-lg ${className}`}>{children}</section>;
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

/** Cabeçalho de card: título 16/600, subtítulo muted, ação opcional à direita. */
export function CardHeader({ title, subtitle, right, className = "" }: CardHeaderProps) {
  return (
    <div className={`px-6 py-5 border-b border-line flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-semibold text-base text-ink">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
