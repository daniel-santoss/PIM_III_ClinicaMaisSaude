# Responsabilidade Social, Diversidade e Inclusão

Seção de responsabilidade social do projeto **Clínica Mais Saúde** (PIM IV — rubrica 04). Descreve como o
produto incorpora inclusão, acessibilidade e proteção de dados como requisitos — não como enfeite.

---

## 1. Compromisso

A Clínica Mais Saúde atende um público diverso, incluindo **idosos, pessoas com deficiência e pessoas com
baixa familiaridade digital**. O sistema foi desenhado para que o acesso à saúde não seja barrado por
limitações sensoriais, cognitivas ou de letramento digital. As decisões de produto abaixo materializam
esse compromisso.

## 2. Inclusão de pessoas surdas — VLibras

O portal integra o **VLibras**, o tradutor oficial de português para **Libras** (Língua Brasileira de
Sinais) do Governo Federal. Um avatar em 3D traduz o conteúdo selecionado, permitindo que pessoas surdas
— para quem o português escrito é uma segunda língua — compreendam informações de saúde, termos de
consentimento e instruções de agendamento. É a mesma tecnologia adotada nos portais gov.br, o que garante
qualidade linguística e manutenção contínua.

## 3. Acessibilidade cognitiva — apoio à memória

O cadastro registra o sinal **"Tenho dificuldade de memória e posso precisar de apoio"**
(`TemProblemaMemoria`). Esse dado:
- **Orienta a equipe** a oferecer apoio no atendimento (confirmação de horários, lembretes reforçados);
- É **read-only ao paciente** por design (evita manipulação para burlar cálculos de falta) e tratado como
  informação de cuidado, não de julgamento.

É um gancho concreto de acessibilidade cognitiva embutido na regra de negócio, não apenas na interface.

## 4. Redução de barreiras de acesso — auto-cadastro moderado

O **auto-cadastro remoto** (web e mobile) permite que a pessoa inicie o cadastro de casa, sem precisar se
deslocar até a recepção — relevante para pessoas com **mobilidade reduzida**, que moram longe ou têm pouca
disponibilidade. O fluxo em **wizard com etapas curtas** (termos → dados → confirmação de e-mail →
declaração de saúde) reduz a carga cognitiva, e a **avaliação presencial** posterior preserva a segurança
clínica. Mensagens de erro são **claras e textuais** (não dependem de cor), e a confirmação por e-mail dá
previsibilidade ao processo.

## 5. Proteção de dados e dignidade — LGPD

- **Consentimento explícito** dos termos (registro de `TermosAceitosEm` + versão) antes de coletar dados de
  saúde — dados sensíveis nos termos da **LGPD (Lei nº 13.709/2018)**.
- **Verificação de e-mail por código** antes de concluir o cadastro (garante titularidade do contato).
- Dados de saúde tratados com **finalidade específica** (avaliação e atendimento), armazenados com
  segurança (senhas com BCrypt, tokens com hash, comunicação autenticada por JWT).
- Direito à **exclusão da conta** disponível ao próprio paciente pelo app (*soft-delete* com revogação de
  sessões), respeitando o direito de eliminação previsto na LGPD.

## 6. Diversidade no acesso — multiplataforma

A oferta de **web (desktop) e app mobile** amplia o alcance: quem não tem computador usa o celular, e
vice-versa. O app foi construído com **alvos de toque generosos**, **rótulos de navegação textuais** e
respeito à **escala de fonte do sistema**, favorecendo pessoas com baixa visão ou dificuldade motora fina.

## 7. Uso responsável de Inteligência Artificial

A triagem por IA inclui um **escudo contra injeção de prompt** e **auditoria de uso indevido**, protegendo
os usuários de respostas manipuladas e registrando abusos de forma transparente. A IA **assiste** a
decisão (sugere tipo de atendimento), sem substituir a avaliação profissional — uso ético e supervisionado.

---

## 8. Próximos passos de inclusão

- Concluir o **backlog de remediação de acessibilidade** (ver [`ACESSIBILIDADE.md`](ACESSIBILIDADE.md)),
  em especial os rótulos de leitor de tela no mobile e a auditoria de contraste AA.
- Avaliar **VLibras no aplicativo** (via SDK nativo ou WebView) para estender a tradução em Libras ao mobile.
- Testes de usabilidade com **usuários reais** representando os públicos-alvo (idosos, pessoas com deficiência).
