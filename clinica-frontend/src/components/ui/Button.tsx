import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white border border-brand-600 hover:bg-brand-800 hover:border-brand-800",
  secondary: "bg-white text-body border border-line hover:bg-canvas",
  outline: "bg-white text-brand-600 border border-brand-600 hover:bg-brand-50",
  danger: "bg-white text-danger border border-danger-border hover:bg-danger hover:text-white",
  ghost: "bg-transparent text-body border border-transparent hover:bg-canvas",
};

const SIZES: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Botão do design system (h-10/rounded-md, variantes semânticas). */
export default function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
