# 🏥 Clínica Mais Saúde - Sistema de Gestão Inteligente

## 🎯 Objetivo e Problema Resolvido
O **Clínica Mais Saúde** é uma plataforma moderna de gestão clínica desenvolvida para resolver os gargalos comuns no atendimento e administração da saúde. Clínicas tradicionais sofrem frequentemente com agendamentos desorganizados, alto índice de absenteísmo (faltas) de pacientes e comunicação descentralizada entre a equipe médica e os pacientes. 

O objetivo principal deste projeto é centralizar e automatizar o fluxo de atendimento de ponta a ponta: desde a marcação autônoma de consultas até a triagem inteligente de sintomas. O sistema atende a múltiplos perfis (Pacientes, Médicos, Enfermeiras e Administradores), oferecendo uma experiência de usuário (UX) premium, ágil e altamente responsiva.

## 💻 Tecnologias Utilizadas
O projeto adota uma arquitetura full-stack moderna e escalável, fundamentada nos princípios da **Clean Architecture**:

**Backend (API Restful):**
- **C# / .NET 10 (ASP.NET Core):** Fornece alta performance, segurança e forte tipagem.
- **Entity Framework Core:** ORM robusto com otimização nativa de queries SQL (uso de `.AsNoTracking()`, delegação ao banco de dados).
- **Autenticação e Autorização JWT:** Segurança rigorosa baseada em *roles* (perfis) e *claims*.
- **Arquitetura Limpa:** Padrão arquitetural dividido rigorosamente em camadas de Domínio, Aplicação, Infraestrutura e API.

**Frontend (Single Page Application):**
- **React 19 com TypeScript:** Interfaces modulares, tipadas para evitar erros de runtime e fáceis de manter.
- **Vite:** Build tool ultrarrápido que garante performance extrema no ambiente de desenvolvimento e produção.
- **Tailwind CSS:** Estilização focada em design moderno, utilizando utilitários para criar interfaces complexas, responsivas e visualmente atraentes (Glassmorphism e gradientes).
- **Lucide React:** Iconografia leve e escalável.

## 🚀 Minha Contribuição e Resultados Alcançados
Atuei na resolução de dívidas técnicas críticas, elevando o projeto do nível conceitual a uma aplicação pronta para produção:

1. **Implementação de Paginação Server-Side Otimizada:** 
   - Substituição da paginação simulada (feita na memória do cliente) por paginação nativa de banco de dados (`.Skip()` e `.Take()`).
   - **Resultado Alcançado:** O sistema agora tem escalabilidade garantida. O consumo de memória do servidor foi drasticamente reduzido, bem como o *payload* da rede, permitindo o carregamento de listagens em frações de segundo, mesmo com milhares de pacientes e consultas registrados.

2. **Auditoria Arquitetural e Blindagem de Segurança:**
   - **Resultado Alcançado:** Erradicação de vazamentos de senhas/chaves secretas removendo JWTs *hardcoded* para variáveis de ambiente seguras (`appsettings`). Remoção completa do acoplamento direto entre *Controllers* e o banco de dados, transferindo o peso das regras de negócio para as camadas de *Service* e *Repository*.

3. **Modernização da UX/UI e Tratamento de Exceções:**
   - **Resultado Alcançado:** Todos os alertas nativos e feios (`alert()`) foram trocados por modais estilizados e fluídos. As interações do usuário agora são assíncronas, impedindo travamentos de tela durante requisições via internet (White Screen of Death solucionada).

## 📊 Funcionalidades Relevantes e Impacto Prático

- **Triagem Inteligente:** Funcionalidade que analisa os sintomas digitados pelo usuário e sugere a especialidade médica adequada ou alerta sobre a necessidade imediata de triagem (Enfermaria) antes da consulta médica.
- **Dashboard de Gestão em Tempo Real:** 
  - Cálculo instantâneo da **Taxa de Absenteísmo** (ex: pacientes que faltaram na última semana vs o total de consultas).
  - Métricas de atendimentos diários e distribuição histórica de status (Finalizados x Agendados x Cancelados).
- **Controle de Acesso Baseado em Perfis (RBAC):** 
  - Médicos visualizam e controlam em tempo real apenas suas respectivas agendas.
  - Médicos podem avançar status dinâmicos (*Em Atendimento* ➡️ *Aguardando Retorno* ➡️ *Finalizado*).
- **Auditoria de Histórico Intacta:** Total rastreabilidade das ações do sistema. Qualquer remarcação ou cancelamento gera uma trilha detalhada (*Quem* fez a alteração, de qual data para qual data, e o motivo registrado), entregando transparência absoluta na gerência clínica.
