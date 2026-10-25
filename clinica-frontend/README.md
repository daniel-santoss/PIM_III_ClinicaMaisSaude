# Clínica Mais Saúde — Frontend Web

SPA em **React 19 + TypeScript + Vite + Tailwind CSS v3**. Atende os quatro perfis (administrador, médico, enfermeira e paciente) e consome a API `ClinicaMaisSaude.API`. O layout é voltado a desktop; o paciente no celular usa o app [`clinica-mobile`](../clinica-mobile/README.md).

## Rodando

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. A API precisa estar no ar (por padrão em `http://localhost:5045`).

Variáveis (opcionais em dev, definidas no build em produção): `VITE_API_URL`, `VITE_ADMIN_EMAIL`, `VITE_MAX_PROMPT_LENGTH`.

## Verificação

```bash
npm run build
```

Roda `tsc -b && vite build` — o mesmo que o CI executa. Não use `tsc --noEmit` na raiz do projeto: o `tsconfig` raiz só tem *project references* e não acusa erros.

## Onde está cada coisa

| Pasta | Conteúdo |
|---|---|
| `src/pages/` | Telas completas (login, auto-cadastro, agendamentos, usuários, relatórios, violações da IA, solicitações de cadastro, editor da Declaração de Saúde) |
| `src/components/` | Componentes reutilizáveis (modais, formulários, perfil, layout) |
| `src/components/ui/` | Primitivos do design system (`Card`, `StatCard`, `Badge`, `Button`, `ModalPortal`) |
| `src/hooks/`, `src/constants/`, `src/utils/` | Hooks, constantes (rotas da API, perfis, status) e utilitários |
| `src/fetchInterceptor.ts` | Refresh automático do token e tratamento global de erros |

Padrões visuais: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Convenções de código: [`../clinica-context.md`](../clinica-context.md).
