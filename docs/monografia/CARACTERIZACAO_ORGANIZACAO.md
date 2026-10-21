# Caracterização da Organização — Clínica Mais Saúde

Seção da monografia do PIM IV (rubrica 02). Caracteriza a organização estudada e o diagnóstico que
motivou a solução. As informações institucionais concretas (razão social, porte, localização, dados de
entrevista) devem ser preenchidas a partir do **relatório do PIM III**; as seções abaixo estruturam a
caracterização e o levantamento de problemas que o sistema endereça.

> **Nota de preenchimento:** onde houver `[…]`, inserir o dado factual do PIM III.

---

## 1. Identificação

- **Nome fantasia:** Clínica Mais Saúde
- **Razão social / CNPJ:** `[preencher do PIM III]`
- **Segmento:** Saúde — atenção **ambulatorial** (consultas, exames, vacinas e triagem).
- **Porte:** `[micro/pequeno/médio — preencher]`
- **Localização:** `[cidade/UF — preencher]`
- **Público atendido:** pacientes da comunidade (diversos perfis etários, incluindo idosos e pessoas com
  deficiência).

---

## 2. Segmento e contexto de mercado

A clínica atua no setor de **serviços de saúde ambulatoriais**, um segmento marcado por alta demanda,
sensibilidade a filas e absenteísmo (faltas de pacientes), forte regulação (LGPD para dados sensíveis de
saúde) e crescente expectativa de **atendimento digital**. Nesse contexto, a eficiência operacional
(uso da agenda dos profissionais) e a qualidade da experiência do paciente são diferenciais competitivos.

---

## 3. Processos organizacionais mapeados

O sistema foi desenhado a partir dos seguintes processos-fim da clínica:

1. **Recepção e cadastro** — registro de pacientes e profissionais, com dados de contato e perfil clínico.
2. **Triagem** — classificação inicial da necessidade do paciente (tipo de atendimento/especialidade).
3. **Agendamento** — marcação de consultas, exames, vacinas e retornos, respeitando disponibilidade e
   regras clínicas (matriz de permissões por profissional, duração por tipo, conflito de horário).
4. **Atendimento** — evolução do status da consulta (início, conclusão, retorno).
5. **Exames e resultados** — acompanhamento de laudos e aviso ao paciente quando disponíveis.
6. **Gestão** — relatórios operacionais (absenteísmo, volume, especialidades) para a administração.

---

## 4. Diagnóstico — problemas identificados

O levantamento (PIM III) apontou dores operacionais típicas do segmento, que orientaram os requisitos:

| Problema | Impacto | Como o sistema endereça |
|----------|---------|--------------------------|
| **Absenteísmo (no-show)** — pacientes que faltam sem avisar | Ociosidade da agenda, perda de receita | Previsão de probabilidade de falta + lembretes automáticos |
| **Agendamento manual e sujeito a erro** (telefone/papel) | Conflitos de horário, sobrecarga de alguns profissionais | Agendamento com validação de conflito + **auto-delegação com balanceamento de carga** |
| **Triagem dependente de pessoal especializado** | Fila e demora na classificação | **Triagem por IA** que sugere tipo/especialidade a partir dos sintomas |
| **Falta de canal digital para o paciente** | Baixa autonomia, tudo presencial | Portal web + **app mobile** + **auto-cadastro remoto moderado** |
| **Ausência de rastreabilidade** das mudanças de consulta | Dificuldade de auditoria e de resolver disputas | **Trilha de auditoria imutável** (histórico + trigger de banco) |
| **Barreiras de acessibilidade** (surdos, idosos, deficiência) | Exclusão de parte do público | **VLibras**, sinal de apoio à memória, alvos de toque, rótulos de leitor de tela |
| **Risco com dados sensíveis de saúde** | Exposição legal (LGPD) | Consentimento registrado, verificação de e-mail, criptografia, controle de acesso |

---

## 5. Justificativa da solução

A informatização desses processos numa **plataforma integrada web + mobile**, com triagem assistida por IA
e regras de agendamento que otimizam a agenda dos profissionais, ataca diretamente as dores mapeadas:
reduz o absenteísmo (previsão + lembretes), elimina o agendamento manual propenso a erro, amplia o acesso
(canal digital e auto-cadastro), garante conformidade (LGPD, auditoria) e promove inclusão
(acessibilidade). A solução alinha-se, assim, ao objetivo estratégico da organização de **ampliar a
capacidade de atendimento sem perder qualidade nem controle**.

---

## 6. Alinhamento com o PIM

O sistema Clínica Mais Saúde é a **solução tecnológica** proposta para a organização caracterizada no PIM
III, integrando as competências de **desenvolvimento web e mobile via APIs**, banco de dados, segurança e
gestão de projetos exigidas pelo PIM IV. As demais seções desta monografia detalham o planejamento
(empreendedorismo), a arquitetura, o banco de dados, a acessibilidade e a gestão ágil do projeto.
