# 📱 Plano da Versão Mobile — Clínica Mais Saúde (Fase 4)

> App **React Native simplificado e exclusivo para pacientes**, consumindo a mesma API REST do sistema web.
> Base de decisão da Fase 4. Complementa `ANALISE_PROJETO.md` (§12).
> Criado: 2026-08-02. Decisões aprovadas pelo usuário nesta data.

---

## 1. Princípio norteador

No **web**, o paciente é um perfil **secundário** de um sistema de gestão (com recepção/admin por trás).
No **mobile**, o app **é toda a relação do paciente com a clínica** — não existe balcão por trás da tela.

➡️ Regra de escopo: **manter todas as funções realmente do paciente**, **adaptar** as que são artefato de layout de desktop, e **promover** as que hoje estão negligenciadas. Não copiar o web 1:1, nem cortar para um MVP mínimo.

---

## 2. Inventário do paciente × decisão mobile

| Função (web hoje) | Decisão | Motivo |
|---|---|---|
| Login + refresh transparente + logout | **Manter** | Base de tudo. Backend pronto. |
| Auto-cadastro + aceite de termos/política | **Manter** | Único onboarding (sem recepção). |
| Triagem por IA (sintomas → sugestão) | **Manter e promover a caminho principal** | Diferencial; guia o leigo. Respeitar limite 5/dia. |
| Agendar — modo **manual** (tipoProf/tipoConsulta/especialidade na mão) | **Manter, rebaixar a "avançado"** | IA deve conduzir; manual vira fallback. |
| Escolha de data/horário (`horarios-disponiveis`) | **Manter** | Núcleo. Vira picker nativo. |
| Fluxo de **retorno** (herda profissional) | **Manter** | Regra de negócio; custo baixo. |
| Minhas Consultas — lista | **Manter** | Núcleo. |
| Minhas Consultas — cancelar / remarcar | **Manter** | Ações essenciais. |
| Minhas Consultas — toggle **tabela/agenda** + painel de filtros denso | **Adaptar (simplificar)** | UX de desktop. Mobile = lista rolável + chips (Próximas/Histórico) + busca simples. |
| Notificações (listar/ler/remover) | **Manter + repensar transporte** | Ver §4 (push nativo). |
| Perfil — dados (nome/email/telefone) + foto + trocar senha | **Manter** | Foto passa a câmera/galeria nativas. |
| Perfil — **`temProblemaMemoria` editável** | **Cortar do self-service (read-only ou remover)** | Paciente edita insumo do próprio cálculo de risco de falta; "gameável" e é dado clínico-sensível. |
| Perfil — **Excluir minha conta** | **Manter e IMPLEMENTAR de verdade** | Apple/Google **exigem** exclusão in-app quando há auto-cadastro. Vira requisito. |
| Probabilidade de falta | **N/A (não é do paciente)** | `AgendamentoVisualizador.tsx:237` só mostra a não-pacientes. Recurso interno de profissional/admin. |

---

## 3. Os 4 julgamentos que importam

1. **`temProblemaMemoria` — cortar do self-service.** Único ponto onde o paciente edita um insumo do algoritmo de risco de falta dele mesmo (+20%). Tornar read-only no app (ou marcado só pela clínica). Baixo custo, ganho de integridade.
2. **Excluir conta — promover a requisito.** Hoje desabilitado ("em breve"). Com auto-cadastro nas lojas, exclusão in-app é obrigatória. Exige endpoint real (`DELETE` de conta com **soft-delete**, coerente com o §1.6 já feito).
3. **Modo manual de agendamento — rebaixar, não remover.** IA como fluxo padrão (1 campo → sugestão → confirmar); manual atrás de "não sei / prefiro escolher".
4. **Filtros de Minhas Consultas — simplificar.** Sem toggle tabela/agenda nem multi-filtro. Lista + chips + busca.

---

## 4. O que o mobile *adiciona* (net-new)

- **Push nativo (FCM/APNs) — decisão de arquitetura central.** O **SignalR** (implementado no §2.6) cobre tempo real **com o app aberto/em foreground**. Notificação com **app fechado/background** exige **push nativo disparado pelo backend**.
  - Arquitetura alvo: **SignalR para realtime em tela + FCM/APNs para background.**
  - Implica: endpoint novo para **registrar device token** por usuário + integração do backend com FCM/APNs (disparar no mesmo ponto onde a `Notificacao` é criada — reaproveita `INotificadorTempoReal` como segundo canal).
- **Login biométrico** (Face/Touch ID) com refresh token no **secure storage** do device.
- **Adicionar consulta ao calendário nativo** + lembrete local (redundância boa quando o push falha).
- **Deep link** da notificação abrindo a consulta — o `link` já vem no payload do §2.6 (`agendamentos?id=...`); falta o roteamento nativo consumir.

---

## 5. Implicações de backend / arquitetura

- **Bom:** backend já expõe todo o fluxo básico do paciente. App v1 consome a mesma API REST **sem endpoints novos — exceto**:
  1. **Exclusão de conta** (`DELETE` com soft-delete + trilha de auditoria).
  2. **Registro de device token** (para push nativo).
- **Convenções mudam:** restrições do SPA web (proibido Axios/Redux/React Router) são **do projeto web**. No React Native, **React Navigation** é padrão de fato. Definir um guia de convenções **separado** para o mobile, não herdar as regras do web.
- **Foto Base64:** já isolada em tabela (§1.2). No mobile a imagem da câmera é pesada — avaliar upload como arquivo/URL em vez de Base64 embutido (evolução futura).

---

## 6. Organização do repositório (decisão desta etapa)

**Decisão: monorepo.** O app mobile entra como **`clinica-mobile/`**, irmão de `clinica-frontend/`, dentro do próprio `PIM_III`.

- O web **já está** bem separado (subpasta `clinica-frontend/`); separação por **pasta** já existe — não é preciso repositório separado.
- Vantagens do monorepo aqui: um só lugar (API + web + mobile), docs compartilhados, commits atômicos entre API e clientes, demonstra o sistema inteiro como **um** entregável de portfólio/PIM.
- `.gitignore` e tooling são por subpasta; garantir ignore de `clinica-mobile/node_modules`, `android/`, `ios/` (build/pods) e artefatos do Metro.

⚠️ **Alerta prático — OneDrive.** O projeto está em `C:\Users\buzzy\OneDrive\Documentos\PIM_III`. React Native (Metro file-watching + node_modules gigante + builds nativos android/ios) **conflita com a sincronização do OneDrive** (locks, lentidão, rebuilds). Recomendação forte: **mover o projeto para fora do OneDrive** (ex.: `C:\dev\PIM_III` ou `C:\Users\buzzy\Projetos\PIM_III`) antes de iniciar o mobile — ou, no mínimo, excluir as pastas pesadas da sincronização. Isso também elimina de vez os "arquivos bloqueados" que já vimos no build .NET.

---

## 7. Escopo por versão

**v1 (MVP publicável):**
- Login / cadastro / **biometria**
- Agendar via **IA** (+ manual como avançado) + retorno
- Minhas Consultas: lista + **cancelar** + **remarcar**
- Notificações com **push nativo**
- Perfil: dados + senha + foto
- **Exclusão de conta**

**v2:**
- Calendário nativo + lembretes locais
- Deep links refinados
- Modo offline de leitura
- Refinos de UX do wizard de agendamento

**Cortados/limitados de propósito:** toggle tabela/agenda, filtros densos, `temProblemaMemoria` editável.

---

## 8. Próximos passos sugeridos (quando iniciar a Fase 4)

1. ~~Decidir base RN~~ → **Expo** (com Expo Router). ✅
2. ~~Mover repo para fora do OneDrive~~ → clonado em `C:\dev\PIM_III`. ✅
3. ~~Scaffold + camada de API~~ ✅
4. Backend: ~~endpoint de exclusão de conta~~ ✅ · registro de device token + disparo FCM/APNs (backlog). ⏳
5. Implementar telas na ordem do v1: auth ✅, consultas ✅, agendar ✅, avisos ✅, perfil ✅, exclusão ✅, biometria ✅. **Falta: auto-cadastro.**

---

## 9. Progresso (log da Fase 4)

Tudo na branch `teste`, no monorepo `C:\dev\PIM_III`, commitado e com push no origin.

**✅ Concluído**
- **Scaffold Expo** (`clinica-mobile/`, SDK **54**, Expo Router, TypeScript), irmão de `clinica-frontend/`.
- **Camada de API** (`src/lib/api.ts`): `apiFetch` com refresh transparente single-flight (espelha o `fetchInterceptor` do web) + `setOnSessionExpired`. Tokens em `expo-secure-store` (`src/lib/storage.ts`). `EXPO_PUBLIC_API_URL` para o endereço da API.
- **Auth flow**: `AuthContext` (login/logout, restaura sessão no boot, **bloqueia não-pacientes**), grupos Expo Router `(auth)`/`(app)` com guard na raiz, tela de **Login**. Login ponta a ponta validado no device.
- **Navegação por abas** (`(app)` = Tabs): Consultas · Agendar · Perfil.
- **Minhas Consultas** (CRUD completo, validado no device): lista via `GET /Agendamentos`, chips Próximas/Histórico, badges de status. **Menu ⋮ (3 pontinhos)** por card abre bottom-sheet de ações (`AcoesConsultaModal`, estruturado como lista para crescer): **Remarcar** (`RemarcarModal` → `PATCH /{id}/remarcar`, motivo obrigatório) e **Cancelar** (`PATCH /{id}/status`). Pull-to-refresh.
- **Agendar via IA** (wizard 3 passos, validado): sintomas → `POST /Consultas/sugerir-tipo` (trata injeção→logout) → sugestão → dias úteis + `GET /horarios-disponiveis` → `POST /Agendamentos`.
- **Notificações** (aba "Avisos"): lista via `GET /Notificacoes`, tocar → `PATCH /{id}/lida` (otimista) + navega p/ Consultas se houver `agendamentoId`, lixeira → `DELETE /{id}`, carimbo relativo, pull-to-refresh.
- **Perfil completo**: editar dados via `PATCH /Perfil` (garante `temProblemaMemoria` read-only por design), **foto** via `expo-image-picker` → `POST /Perfil/foto` (multipart), **trocar senha** (`PATCH /Perfil/senha`, bottom-sheet), CPF + `temProblemaMemoria` read-only. Exclusão de conta desabilitada ("em breve") — falta endpoint.
- **Exclusão de conta** (self-service, requisito de loja): backend `DELETE /api/Perfil { senha }` (soft-delete + revoga refresh tokens; login passa a bloquear paciente inativo) + `ExcluirContaModal` no app. **v1 funcionalmente completo** (falta só push FCM).
- **CI (GitHub Actions)** verde: build .NET + testes + build web + tsc mobile a cada push. **⚠️ Corrigido:** o `.slnx` não incluía os projetos de teste → o CI rodava 0 testes; agora executa a suíte de verdade.

**⚙️ Aprendizados de setup (importantes)**
- **Pinar no Expo SDK 54** — o `create-expo-app` puxou SDK 57, à frente do Expo Go dos aparelhos (SDK 54). Não subir sem confirmar o Expo Go do device.
- **React Compiler desativado** (`experiments.reactCompiler`) — experimental do template, quebrava em runtime após o downgrade.
- **Rodar com `npx expo start -c --tunnel`** — LAN direto falha com firewall do Windows (portas 8081 do Metro e 5045 da API). Túnel resolve o Metro; para a **API**, liberar a porta no firewall / subir com `--urls http://0.0.0.0:5045`.
- No SDK 54, `ThemeProvider`/`DarkTheme`/`DefaultTheme` vêm de `@react-navigation/native` (não do expo-router).

- **Home + badge** (feito em outro notebook): aba **"Início"** (saudação + próxima consulta + atalhos); "Minhas Consultas" virou a aba **Consultas**; badge de não-lidas em Avisos via `NaoLidasContext`. 5 abas: Início·Consultas·Agendar·Avisos·Perfil.
- **Biometria (app-lock) robusto + "Lembrar usuário"** (mobile + web): app-lock por biometria ao **voltar do segundo plano** (listener de `AppState` no `AuthContext`), não só no cold boot; tela de bloqueio (`TelaBloqueio`) com fallback **"Usar senha"** (revalida no servidor) e "Sair". Correção de travamento do prompt nativo: disparo só com o app `active` + guard síncrono por `ref` + **lock de módulo em `lib/biometria`** (uma chamada a `authenticateAsync` por vez; concorrentes travavam o diálogo no Android). **"Sair" = logout real** (sem re-login biométrico); preferência **"Lembrar usuário"** (checkbox no login) mantém identificador/nome → login pede só a senha, com "Entrar com outra conta". Logout completo (`esquecer`) na exclusão de conta e no bloqueio por injeção de IA. **Web:** mesmo checkbox "Lembrar usuário" (pré-preenche e-mail/CPF, com máscara).
- **Re-skin "navy"** (alinha ao desktop): paleta roxa antiga → navy `#2C5282` (+ tints `#EEF2F7`/`#F1F5F9`, borda `#E2E8F0`) em todas as telas; `src/constants/tema.ts` é a fonte de verdade das cores. Status "Agendado/Retorno" de roxo → navy; marca do login em navy.
- **Validação no Perfil**: `lib/validadores.ts` (espelha `utils/validators.ts` do web) — máscara de telefone `(00) 00000-0000` ao digitar, validação de e-mail (normaliza minúsculas) e de telefone (DDD 10/11 dígitos ou vazio) no salvar; comparação "alterou" por dígitos. CPF read-only via `mascaraCpf`.

**📦 Backlog (adiado por complexidade)**
- **Push nativo FCM** (background) ligado ao SignalR (§2.6): endpoint de registro de device token + integração FCM no backend + **dev build** (sai do Expo Go, exige projeto Firebase).
- Futuro/LGPD: avaliar anonimização de PII na exclusão de conta (hoje é soft-delete puro).

**⏳ Próximo** (retomar por aqui — tarefas simples, rodam no Expo Go)
- ~~Login biométrico~~ ✅ · ~~Máscara/validação no Perfil~~ ✅
- **Auto-cadastro** (gap de v1 — só existe login hoje): tela de cadastro de paciente + aceite de termos, consumindo o endpoint de cadastro. **Sugerido como próxima feature** (já reaproveita `lib/validadores.ts`).
- Estados de erro/vazio mais polidos (ilustrações/mensagens + botão de ação).

⚠️ **Ambiente (importante para retomar):** o banco local (LocalDB `ClinicaMaisSaudeDb`) precisou ser **recriado** após o refactor de modelagem (Fases 1-8): `dotnet ef database drop --force` + `dotnet ef database update` (migrations foram squashadas → banco antigo não "atualiza", tem que recriar). Rodar a **API** com `--urls http://0.0.0.0:5045` para o device alcançar. O `.env` do mobile (`EXPO_PUBLIC_API_URL`) usa o **IP LAN da máquina** — muda a cada rede (ex.: `http://10.23.21.186:5045`). Em clone novo, rodar `npx expo start` uma vez antes do `tsc` (regenera `.expo/types/router.d.ts`). `npm ci` para o frontend/mobile (`.npmrc` do mobile já fixa `legacy-peer-deps`).

⚠️ **Nota importante:** houve um **grande refactor de modelagem do banco** (Fases 1-8, ver `ESPEC_MODELAGEM_BANCO.md`) feito em paralelo — identidade (Nome/Cpf/Telefone/Email) saiu de Paciente/Profissional e foi para o `Usuario`; `Paciente.Ativo` (bool) virou `SituacaoCliente` (Ativo/Desativado/Excluido/Banido). **Verificado em 2026-08-18: os contratos de API usados pelo mobile não mudaram** (GET /api/Pacientes/{id}, PATCH /api/Perfil, LoginResponse) — build e testes do backend seguem verdes, `tsc` do mobile limpo (após regenerar o cache de rotas do Expo Router, ver abaixo).

⚠️ **Gotcha de ambiente (não é bug):** em um clone/notebook novo, `.expo/types/router.d.ts` (gitignored, gerado) pode estar desatualizado e o `tsc --noEmit` acusa rotas inválidas (ex.: `"/(app)/consultas"`). Resolve rodando `npx expo start` por ~15s (deixa o Metro subir) e encerrando — o typegen se regenera sozinho.

Relacionado: `ANALISE_PROJETO.md` (§12), `MELHORIAS_TECNICAS.md`.
