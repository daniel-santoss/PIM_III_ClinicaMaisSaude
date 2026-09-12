# Análise Crítica da Arquitetura e Trabalhos Futuros — Clínica Mais Saúde

Seção de **análise crítica** da arquitetura do sistema (insumo das rubricas 05/06 — Web/Mobile e 08 —
qualidade). Diferente de [`ARQUITETURA.md`](ARQUITETURA.md), que descreve a solução *como está*, este
documento avalia criticamente a aderência a **Clean Architecture**, **SOLID** e **padrões de projeto**,
registra as **refatorações de qualidade** já aplicadas e aponta **trabalhos futuros**. A autocrítica
fundamentada é um indicador de maturidade de engenharia.

> Método: análise estática de todo o código-fonte do backend (`.csproj`, camadas Domain/Application/
> Infrastructure/API), com evidência por `arquivo:linha`. As notas seguem uma escala A–D por dimensão.

---

## 1. Veredito geral

**Nota global: B — arquitetura sólida e acima da média, com dívidas técnicas identificadas e endereçáveis.**

A fundação está correta: separação em quatro camadas com dependências na direção certa, injeção de
dependência por construtor, entidades com comportamento e padrões clássicos aplicados. Os pontos de
atenção são de **consistência** e de **responsabilidade única (SRP)**, não de estrutura — o projeto
demonstra saber aplicar o padrão correto (o `AgendamentoService` é a prova), mas não o aplica de forma
uniforme em toda a base.

| Dimensão | Nota | Síntese |
|----------|:----:|---------|
| Clean Architecture (regra de dependência) | **A−** | Grafo de projetos impecável; vazamentos pontuais nos detalhes |
| SRP (*Single Responsibility*) | **C** | Classes de serviço acumulando 5–8 responsabilidades |
| OCP (*Open/Closed*) | **B−** | `switch`/enum em pontos de extensão obrigam tocar código existente |
| LSP (*Liskov*) | **B+** | Sem abuso de herança; nada quebra substituição |
| ISP (*Interface Segregation*) | **B** | Interfaces coesas por recurso; uma ou outra levemente gorda |
| DIP (*Dependency Inversion*) | **B−** | Abstrações em quase tudo, exceto serviços presos ao `DbContext` concreto |
| Padrões de projeto | **B** | Repository, UoW, State, Factory, Adapter, Result Object aplicados |

---

## 2. Clean Architecture — o que está correto

- **Regra de dependência respeitada no nível de projeto** (a regra-mãe da Clean Architecture). Verificado
  nos `.csproj`: `Domain` não referencia nenhum projeto; `Application → Domain`; `Infrastructure →
  Domain + Application`; `API → Application + Infrastructure`. As dependências apontam para dentro.
- **Inversão de dependência no consumo**: todas as interfaces de serviço vivem em `Application/Interfaces`
  e as de repositório em `Domain/Interfaces` — as camadas externas dependem de abstrações definidas pelas
  internas.
- **Tratamento de erros centralizado**: `GlobalExceptionHandler` (API) mapeia exceções tipadas da
  Application para *status* HTTP (RFC 7807 / *ProblemDetails*), sem vazar detalhes internos em erros 500.
- **Domain services puros e testáveis**: `MaquinaEstadosAgendamento` (regras de transição de status) e
  `ConflitoHorario` (interseção de horários) não dependem de EF/infra — recebem a entidade e o instante
  como parâmetros, o que os torna determinísticos e testáveis sem banco.

---

## 3. Dívidas técnicas identificadas (por severidade)

### 🔴 Alta

1. **God classes (violação de SRP).** Três serviços acumulavam responsabilidades demais:
   - `DashboardService` — consulta a dados **+** estatística **+** geração de Excel **+** geração de PDF.
     _(saldada — ver §4)_
   - `ConsultaService` — *rate-limit* **+** chamada HTTP externa (Gemini) **+** moderação/punição por IA
     **+** cancelamento em cascata **+** notificação **+** auditoria. _(parcialmente saldada — *gateway* de IA
     isolado e punição unificada; ver §4)_
   - `AutoCadastroService` — validação **+** anti-fraude **+** persistência **+** *templates* de e-mail.
2. **Entidade central anêmica.** `Agendamento` tem *setters* privados, mas `AlterarStatus` apenas atribui
   o novo status **sem validar a transição** — a máquina de estados vive fora da entidade, deixando a
   invariante exposta a quem chamar o método diretamente.

### 🟠 Média

3. **Inconsistência do padrão Repository.** Apenas o `AgendamentoService` (em Application) usa
   repositórios; os demais serviços (em Infrastructure) acessam o `ClinicaDbContext` diretamente — são
   "repositórios disfarçados". Convivem dois estilos na mesma base.
4. **Repositório com efeito colateral.** `NotificacaoRepository.AdicionarAsync` grava **e** dispara push
   em tempo real (SignalR) — dupla responsabilidade num componente de acesso a dados.
5. **Vazamentos pontuais de camada:** atributo de persistência (`[NotMapped]`/`DataAnnotations`) dentro do
   Domain (`LoginPortal`); `BCrypt`/`IConfiguration` como dependências da Application; *middleware* da API
   consultando o `DbContext` diretamente.
6. **Ausência de *Value Objects*.** CPF, e-mail e telefone trafegam como `string` crua; o `Cpf` é uma
   classe utilitária estática, não um tipo com invariante garantida.

### 🟡 Baixa

7. Regras de negócio embutidas em consultas de repositório (ex.: limiar de "risco alto"); dez entidades
   *lookup* anêmicas no Domain (opção pragmática para ter FK + rótulo no banco); *code smells* menores.

---

## 4. Refatorações de qualidade aplicadas (*sprint* de arquitetura)

Como resposta direta a esta análise, foi executada uma sequência de refatorações **sem alterar o contrato
HTTP** (build e testes verdes a cada passo — a suíte cresceu de 109 para 112 com a cobertura da moderação por IA):

| Refatoração | Efeito | Princípio |
|-------------|--------|-----------|
| **Base controller** (`ClinicaControllerBase`) | Centraliza a leitura de *claims* do token; remove *plumbing* duplicado em 10 controllers | DRY |
| **Helpers `Buscar*`** | Elimina a repetição do "carrega-ou-lança-404" em 12 pontos | DRY |
| **Posse centralizada** (`GarantirPacienteDonoAsync`) | Unifica a autorização de recurso (paciente só age no próprio registro), mantida na borda | SRP na borda |
| **Divisão do `DashboardService`** | Extrai `DashboardExcelReport` e `DashboardPdfReport` (formatadores puros); serviço cai de 548 → 339 linhas | SRP |
| **Isolamento do *gateway* de IA** | Extrai `ITriagemIaGateway`/`GeminiTriagemGateway` (prompt, HTTP, *parse*, detecção de segurança); `ConsultaService` passa a interpretar só o desfecho normalizado e cai de 503 → ~430 linhas | DIP + SRP |
| **Unificação da punição por IA** | Deduplica os dois blocos idênticos de banimento por injeção em `PunirInjecaoAsync` e separa a moderação em `PenalizarSintomasInvalidosAsync` | DRY + SRP |

### Convenção de nomenclatura adotada

Para eliminar ambiguidade de contrato entre métodos que retornam nulo e métodos que lançam exceção,
padronizou-se:

> **`Buscar*`** — garante que a entidade existe (senão lança `NotFoundException` → 404).
> **`Obter*`** — pode devolver `null`; cabe ao chamador tratar a ausência.

### Princípio de projeto: abstração com parcimônia

Uma decisão consciente do *sprint* foi **não criar abstrações para tarefas simples**. Aplicou-se a regra:

- **Separar responsabilidades** (dividir uma classe que faz muitas coisas) é quase sempre válido — e foi
  feito com **classes concretas**, sem interfaces (ex.: os geradores de relatório do Dashboard).
- **Adicionar uma interface** só se justifica quando há uma **fronteira externa** (rede, e-mail, IA),
  **≥2 implementações** reais ou necessidade de teste/troca — caso contrário é cerimônia (indireção sem
  ganho). Por isso **não** se criaram repositórios para todas as entidades: o `DbContext` já cumpre o papel
  de *Unit of Work*, e a simetria pela simetria pioraria a legibilidade.

---

## 5. Trabalhos futuros (priorizados)

1. **Extrair *templates* de e-mail** dos serviços transacionais para um componente dedicado.
2. **Uniformizar as exceções**: eliminar os lançamentos de exceções de *framework* (`KeyNotFoundException`)
   em favor das exceções tipadas da Application.
3. **Documentar/normalizar a estratégia de acesso a dados** (Repository em casos complexos; `DbContext`
   direto nos simples — como decisão explícita).
4. **Reforço de DDD tático** (opcional): mover a validação de transição para dentro de `Agendamento`;
   introduzir *Value Objects* (`Cpf`, `Email`) caso a evolução exija.

> **Já concluído:** o *gateway* Gemini foi isolado atrás de `ITriagemIaGateway` (fronteira externa real —
> habilita teste sem rede e troca de provedor) e a lógica de moderação/punição por IA foi separada e
> deduplicada — ver §4.

---

## 6. Conclusão

A arquitetura cumpre os objetivos de manutenibilidade e testabilidade propostos, com uma base de Clean
Architecture correta e padrões de projeto bem aplicados. As dívidas identificadas são típicas de um
sistema que cresceu por incrementos e — criticamente — **foram diagnosticadas com evidência e parcialmente
saldadas** dentro do próprio ciclo de desenvolvimento, sem regressão (112 testes automatizados verdes). O
equilíbrio buscado — **separar responsabilidades sem inflar a abstração** — é, em si, uma decisão
arquitetural: privilegia a clareza e o custo de manutenção real sobre a pureza teórica.
