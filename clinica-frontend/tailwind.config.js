/** @type {import('tailwindcss').Config} */

// ============================================================================
// DESIGN SYSTEM — "Clínica Mais Saúde" (navy + slate, flat, Inter)
// Extraído dos arquivos-base do redesign. Ver DESIGN_SYSTEM.md para os padrões
// de componente. Cor primária #2C5282 (brand-600), hover #152D5C (brand-800).
// Raios: rounded-md=6px (botões/inputs), lg=8px (cards), xl=12px (modais).
// Superfícies são planas: borda #E2E8F0 no lugar de sombra (sombra só em modal).
// ============================================================================

// Escala da marca (navy). Os stops-chave batem com o mock:
// 50 = tint (#EBF8FF), 200 = tint-border (#BEE3F8), 600 = primária (#2C5282),
// 800 = hover/escuro (#152D5C).
const brand = {
  50: "#EBF8FF",
  100: "#D6EEFC",
  200: "#BEE3F8",
  300: "#93C5E8",
  400: "#5B9BD5",
  500: "#3C6FA0",
  600: "#2C5282",
  700: "#1F3F66",
  800: "#152D5C",
  900: "#102344",
  950: "#0A1730",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand,
        // Alias: telas ainda em migração usam classes `purple-*`; apontamos para
        // a marca navy para não haver dois roxos/azuis divergentes no interim.
        purple: brand,

        // Tokens semânticos do DS.
        canvas: "#F8FAFC", // fundo da aplicação
        ink: "#0F172A", // texto primário (slate-900)
        body: "#475569", // texto secundário (slate-600)
        muted: "#94A3B8", // texto terciário / labels (slate-400)
        line: "#E2E8F0", // bordas (slate-200)
        "line-soft": "#F1F5F9", // divisórias suaves (slate-100)

        success: { DEFAULT: "#059669", tint: "#ECFDF3", border: "#C6EED8" },
        warning: { DEFAULT: "#D97706", text: "#B45309", tint: "#FEF3E2", border: "#FCE3C2" },
        danger: { DEFAULT: "#DC2626", tint: "#FEF2F2", border: "#FBD5D5" },
      },
      boxShadow: {
        // Única sombra do sistema (diálogos). Superfícies normais usam borda.
        modal: "0 20px 50px rgba(15,23,42,.25)",
        focus: "0 0 0 3px rgba(44,82,130,.12)",
      },
      ringColor: {
        DEFAULT: brand[600],
      },
    },
  },
  plugins: [],
}
