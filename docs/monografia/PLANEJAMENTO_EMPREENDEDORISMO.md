# Planejamento e Empreendedorismo — Clínica Mais Saúde

Seção da monografia do PIM IV (rubrica 03). Apresenta o problema, os objetivos, o público-alvo, a proposta
de valor e os diferenciais do produto, sob uma ótica empreendedora.

---

## 1. Problema

Clínicas de atenção ambulatorial enfrentam três dores estruturais: **absenteísmo** (pacientes que faltam e
ociosam a agenda), **ineficiência do agendamento manual** (conflitos de horário, distribuição desigual de
carga entre profissionais) e **baixa autonomia do paciente** (processos presenciais, sem canal digital).
Some-se a isso a **exigência legal** de proteger dados sensíveis de saúde (LGPD) e a necessidade de
**inclusão** de públicos com deficiência. O resultado é perda de receita, sobrecarga da recepção e uma
experiência aquém do esperado.

## 2. Objetivos

**Objetivo geral:** desenvolver uma plataforma integrada (web + mobile) de gestão clínica que otimize o
agendamento, reduza o absenteísmo e amplie o acesso do paciente, com segurança e conformidade legal.

**Objetivos específicos:**
- Automatizar o agendamento com **validação de conflito** e **balanceamento de carga** entre profissionais.
- Oferecer **triagem por IA** para acelerar a classificação do atendimento.
- Reduzir faltas com **previsão de absenteísmo** e **lembretes automáticos**.
- Prover **canal digital ao paciente** (portal + app + auto-cadastro remoto moderado).
- Garantir **segurança e conformidade** (JWT, BCrypt, RBAC, auditoria, LGPD).
- Promover **acessibilidade e inclusão** (VLibras, apoio à memória, leitor de tela).

## 3. Público-alvo

| Segmento | Perfil | Necessidade |
|----------|--------|-------------|
| **Pacientes** | Comunidade atendida — inclui idosos, pessoas com deficiência e com baixa familiaridade digital | Agendar e acompanhar consultas com autonomia e acessibilidade |
| **Profissionais** (Médicos/Enfermeiras) | Corpo clínico | Agenda organizada, sem conflitos, com carga equilibrada |
| **Administração** | Gestão da clínica | Indicadores, controle de absenteísmo e rastreabilidade |

## 4. Proposta de valor

> **"Menos filas e faltas, mais acesso e controle."**

A plataforma entrega, para a clínica, **eficiência operacional** (agenda otimizada, menos no-show,
relatórios de gestão) e, para o paciente, **autonomia e acessibilidade** (agendar pelo celular, triagem
assistida, auto-cadastro remoto, Libras). Tudo sobre uma base **segura e em conformidade com a LGPD**.

## 5. Diferenciais competitivos

1. **Triagem por IA com segurança** — sugestão de atendimento a partir de sintomas, com escudo
   anti-injeção e auditoria de abuso (uso ético e supervisionado da IA).
2. **Agendamento inteligente** — auto-delegação do profissional com **balanceamento de carga** e regras
   clínicas (matriz de permissões, carência por especialidade, limites diários).
3. **Previsão de absenteísmo** — heurística explicável que prioriza lembretes e reduz faltas.
4. **Auto-cadastro moderado** — o paciente inicia o cadastro remotamente (com verificação de e-mail e
   consentimento LGPD), e a clínica aprova após avaliação — equilíbrio entre autonomia e segurança.
5. **Acessibilidade real** — VLibras (Libras), apoio à memória e rótulos de leitor de tela.
6. **Plataforma única web + mobile** sobre uma API REST — consistência e menor custo de evolução.

## 6. Modelo de negócio (visão)

- **Modelo:** SaaS B2B para clínicas/consultórios (licença por unidade/usuário), com o app do paciente
  gratuito como canal de acesso.
- **Custos-chave:** hospedagem em nuvem, cota de API de IA, e-mail transacional, manutenção.
- **Fontes de valor:** redução de perdas por absenteísmo, ganho de produtividade da recepção e do corpo
  clínico, e diferenciação por acessibilidade e experiência digital.
- **Evolução:** múltiplas unidades (multi-tenant), push nativo, telemedicina e integrações (ex.: laboratórios).

## 7. Viabilidade técnica

O produto já está **implementado e validado** em suas funcionalidades centrais (web + mobile + IA +
auto-cadastro), com testes automatizados, CI e artefatos de *deploy* prontos (Docker/compose/DEPLOY.md),
demonstrando viabilidade técnica. A publicação em nuvem e o pipeline de entrega contínua são os próximos
passos para operação em escala (ver [`ARQUITETURA.md`](ARQUITETURA.md) e a documentação ágil em
[`../agil/`](../agil/)).

## 8. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Dependência de provedor de IA (cota/custo) | *Rate limiting*, cache e isolamento da IA numa única camada (troca de provedor sem tocar o domínio) |
| Vazamento de dados sensíveis (LGPD) | Criptografia, consentimento registrado, RBAC, auditoria e minimização de dados |
| Baixa adoção pelo paciente | UX simples (wizard), acessibilidade e app mobile gratuito |
| Uso indevido da IA | Escudo anti-injeção + penalidades + auditoria |
