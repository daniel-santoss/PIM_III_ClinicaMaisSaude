# Design System — Clínica Mais Saúde (redesign navy)

Extraído dos arquivos-base do redesign (`Clinica Mais Saude.dc.html`). Estilo **plano e
profissional**: superfícies brancas com **borda** (não sombra), tipografia **Inter**,
cor primária **navy `#2C5282`**. Use estes padrões para TODA tela/modal/componente,
inclusive os não mostrados nos mocks (extrapolar rigorosamente).

## Tokens (em `tailwind.config.js`)

| Papel | Valor | Classe util |
|---|---|---|
| Fundo app | `#F8FAFC` | `bg-canvas` |
| Superfície | `#FFFFFF` | `bg-white` |
| Borda | `#E2E8F0` | `border-line` |
| Divisória suave | `#F1F5F9` | `border-line-soft` / `bg-line-soft` |
| Texto primário | `#0F172A` | `text-ink` |
| Texto secundário | `#475569` | `text-body` |
| Texto terciário / label | `#94A3B8` | `text-muted` |
| **Primária** | `#2C5282` | `bg-brand-600` `text-brand-600` |
| Primária hover | `#152D5C` | `hover:bg-brand-800` |
| Primária tint | `#EBF8FF` | `bg-brand-50` |
| Primária tint borda | `#BEE3F8` | `border-brand-200` |
| Sucesso | `#059669` / tint `#ECFDF3` / borda `#C6EED8` | `text-success` `bg-success-tint` `border-success-border` |
| Aviso | `#D97706` (texto forte `#B45309`) / tint `#FEF3E2` / borda `#FCE3C2` | `text-warning` `bg-warning-tint` |
| Perigo | `#DC2626` / tint `#FEF2F2` / borda `#FBD5D5` | `text-danger` `bg-danger-tint` |

**Raios:** `rounded-md` (6px) botões/inputs/badges · `rounded-lg` (8px) cards/tabelas ·
`rounded-xl` (12px) modais e card do wizard.
**Sombra:** só em modal → `shadow-modal`. Foco de input → `focus:border-brand-600 focus:shadow-focus`.
**Fonte:** Inter (`font-sans`), pesos 400/500/600/700. Sem `uppercase black` — títulos são `600`.

## Layout
- **Sidebar** 248px, branca, `border-r border-line`, sticky altura total.
- **Topbar** 64px, branca, `border-b border-line`, sticky. Esquerda: título `600 20px` + subtítulo `400 13px muted`.
- **Main** `padding: 28px`, `max-width: 1180px`, centralizado. Gap entre seções `24px`.

## Componentes

**Input** — `h-10 px-3 text-sm text-ink bg-white border border-line rounded-md outline-none`;
foco `focus:border-brand-600 focus:shadow-focus`. **Label** `block text-[13px] font-medium text-body mb-1`.

**Botões** (`h-10`, `rounded-md`, `font-semibold text-sm`):
- Primário: `bg-brand-600 text-white hover:bg-brand-800 px-[18px]`
- Secundário: `bg-white text-body border border-line px-4`
- Outline-primário: `bg-white text-brand-600 border border-brand-600 px-4`
- Perigo-outline: `bg-white text-danger border border-danger-border hover:bg-danger hover:text-white`
- Icon-button 32px: `w-8 h-8 grid place-items-center bg-white border border-line rounded-md text-body`

**Card / Section** — `bg-white border border-line rounded-lg`. Header interno:
`px-6 py-5 border-b border-line` com `h2` `font-semibold text-base text-ink`.

**Metric card (COMPACTO)** — `bg-white border border-line rounded-lg px-4 py-[11px]`.
Topo: tile de ícone 32px (`rounded-lg bg-brand-50 text-brand-600`) + label UPPERCASE
`font-semibold text-[11px] tracking-wide text-muted` (space-between). Valor
`font-bold text-[22px] text-ink mt-0.5`. Sub `text-xs text-muted mt-0.5`. **Nada de quebra
de linha nos textos; padding enxuto.**

**Badge** — `inline-flex items-center font-semibold text-[11px] tracking-wide px-2.5 py-1 rounded-md uppercase`,
com par bg/borda/texto por variante:
- Navy (Agendado): `bg-brand-50 border-brand-200 text-brand-600`
- Sucesso (Finalizado): `bg-success-tint border-success-border text-success`
- Aviso (Em triagem): `bg-warning-tint border-warning-border text-warning-text`
- Perigo (Faltou/Grave): `bg-danger-tint border-danger-border text-danger`
- Neutro (Médico/tipo): `bg-line-soft border-line text-body`

**Tabela** — `<thead>` linha `bg-canvas`; `th` `text-left font-semibold text-[11px] uppercase tracking-wide text-muted px-5 py-3`;
`td` `px-5 py-3.5`; linha `border-t border-line`. Rodapé `px-5 py-3 bg-canvas border-t border-line text-xs text-muted`.

**Modal** — overlay `bg-[#0F172A]/45 backdrop-blur-[2px]`; diálogo `bg-white rounded-xl shadow-modal`.
Header `px-6 py-5 border-b border-line`, footer `px-6 py-4 border-t border-line flex justify-end gap-2.5`.
Botão fechar = icon-button 32px `bg-canvas`.

**Sidebar nav item** — `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium`.
Ativo `bg-brand-600 text-white`; inativo `text-body hover:bg-canvas`.

**Toggle (persona / list-card)** — trilho `bg-canvas border border-line rounded-md p-[3px]`;
botão ativo `bg-brand-600 text-white rounded-[5px]`, inativo `text-body`.

**Stepper (wizard)** — círculo 38px `rounded-lg`; ativo `bg-brand-600 text-white`, concluído
`bg-brand-50 text-brand-600`, futuro `bg-[#EEF2F7] text-muted`. Conector 2px `bg-line`
(concluído `bg-brand-600`). Label `font-semibold text-[11px] uppercase`.
