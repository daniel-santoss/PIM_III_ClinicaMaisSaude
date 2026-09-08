# Acessibilidade — Clínica Mais Saúde

Auditoria e plano de acessibilidade do sistema (portal web + app mobile), referenciando as diretrizes
**WCAG 2.1** (níveis A/AA) e as boas práticas nativas de React Native. Artefato do PIM IV
(rubricas 04 — responsabilidade social/diversidade e 08 — qualidade).

**Situação:** ✅ implementado · 🔜 em andamento · 📦 planejado (backlog de remediação)

---

## 1. Recursos de acessibilidade já implementados

| Recurso | Onde | WCAG / referência |
|---------|------|-------------------|
| ✅ **VLibras** (tradução de texto para Libras, avatar oficial do gov.br) | Web (widget global) | 1.1 / inclusão de surdos |
| ✅ **Idioma da página** declarado (`lang="pt-BR"`) | Web (`index.html`) | 3.1.1 Idioma da página |
| ✅ **Skip link** ("Pular para o conteúdo") + landmark `<main id="conteudo-principal">` | Web (`AppLayout`) | 2.4.1 Ignorar blocos |
| ✅ **Hierarquia semântica** (`<header>`, `<nav>`, `<main>`, `<h1>`) | Web (shell) | 1.3.1 / 2.4.6 |
| ✅ **Textos alternativos** em imagens/logos e `aria-label` em ícones-botão (fechar, sino, menu) | Web (~16 componentes) | 1.1.1 Conteúdo não textual |
| ✅ **Foco visível** (anel de foco `focus:ring` nos campos e botões) | Web (design system) | 2.4.7 Foco visível |
| ✅ **Rótulos de formulário** associados e mensagens de erro textuais (não só cor) | Web (login, cadastro, wizard) | 3.3.1 / 3.3.2 |
| ✅ **Alvos de toque generosos** (`hitSlop`, botões ≥ 44px) | Mobile | 2.5.5 Tamanho do alvo |
| ✅ **Rótulos de navegação** por texto nas abas (não dependem só do ícone) | Mobile (`Tabs`) | 1.1.1 / 2.4.6 |
| ✅ **Rótulos e estados de acessibilidade** (`accessibilityRole`/`accessibilityState`) na jornada de auto-cadastro | Mobile (`auto-cadastro.tsx`) | 4.1.2 Nome, função, valor |
| ✅ **Sinal de acessibilidade cognitiva** (`TemProblemaMemoria`) que orienta o atendimento | Domínio (web+mobile) | apoio a deficiência cognitiva |
| ✅ **Contraste do design system "navy"** (texto sobre fundos claros) | Web + mobile | 1.4.3 Contraste (mínimo) |

### VLibras — detalhes
Widget oficial do Governo Federal (`vlibras.gov.br`), embutido via `<script>` no `index.html`. O usuário
seleciona um texto e o avatar 3D o traduz para Libras. Inicialização com *fail-safe* (se o serviço estiver
indisponível, a página segue normal). **Validado** no preview: `window.VLibras` inicializa e o botão de
acesso é renderizado.

---

## 2. Lacunas e backlog de remediação (priorizado)

| Prioridade | Item | Plataforma | WCAG |
|-----------|------|-----------|------|
| 🔜 Alta | **Rótulos de acessibilidade em botões só-ícone** (voltar, menu "⋮", lixeira, olho de senha) nas demais telas | Mobile | 4.1.2 |
| 🔜 Alta | Auditar **contraste AA (4.5:1)** de textos secundários (`muted`/placeholders) com ferramenta | Web + mobile | 1.4.3 |
| 🔜 Média | Garantir **`accessibilityLabel`** em todos os `TouchableOpacity`/`Pressable` só-ícone | Mobile | 1.1.1 |
| 🔜 Média | **Gestão de foco em modais** (mover foco ao abrir, retornar ao fechar, `aria-modal`) | Web | 2.4.3 |
| 📦 Baixa | **VLibras no mobile** (SDK nativo exige *dev build* ou WebView — fora do Expo Go) | Mobile | inclusão surdos |
| 📦 Baixa | Testar navegação **100% por teclado** em todos os fluxos e ordem de tabulação | Web | 2.1.1 / 2.4.3 |
| 📦 Baixa | Suporte a **`prefers-reduced-motion`** (reduzir animações) | Web | 2.3.3 |
| 📦 Baixa | Verificar **leitura por TalkBack/VoiceOver** de ponta a ponta | Mobile | 4.1.2 |

---

## 3. Como testar

**Web**
- Leitor de tela: NVDA (Windows) / VoiceOver (macOS).
- Teclado: navegar com `Tab`/`Shift+Tab`; o primeiro `Tab` deve revelar o **skip link**.
- Contraste: extensão axe DevTools ou Lighthouse (aba Accessibility).
- Libras: clicar no botão flutuante do VLibras e selecionar um texto.

**Mobile**
- Android: **TalkBack**; iOS: **VoiceOver**. Verificar se cada controle anuncia nome + função + estado.
- Alvos de toque e tamanho de fonte do sistema (Dynamic Type / escala de fonte).

---

## 4. Conformidade declarada

O sistema busca conformidade com **WCAG 2.1 nível AA** como meta. Os itens do §1 já atendem a um
conjunto relevante de critérios A/AA; o §2 lista o caminho para fechar as lacunas restantes. A inclusão do
**VLibras** e do sinal de **acessibilidade cognitiva** vai além do mínimo técnico, alinhando o produto à
missão social da clínica (ver [`RESPONSABILIDADE_SOCIAL.md`](RESPONSABILIDADE_SOCIAL.md)).
