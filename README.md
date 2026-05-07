# 🏥 Clínica Mais Saúde — Sistema de Gestão Inteligente

![Status](https://img.shields.io/badge/STATUS-EM%20DESENVOLVIMENTO-0078D4?style=for-the-badge)
![.NET](https://img.shields.io/badge/.NET-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/REACT-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Architecture](https://img.shields.io/badge/ARCHITECTURE-CLEAN%20ARCHITECTURE-A4C639?style=for-the-badge)

O **Clínica Mais Saúde** é uma plataforma full-stack de gestão clínica projetada para centralizar o fluxo de atendimento médico, desde a triagem inteligente de sintomas até a gestão administrativa de indicadores de desempenho. O sistema resolve gargalos operacionais como o absenteísmo e a desorganização de agendas através de automação e regras de negócio robustas.

## 🛠️ Stack Tecnológica

### Backend (API Restful)
- **Runtime:** .NET 10 (ASP.NET Core)
- **Persistência:** Entity Framework Core (SQL Server)
- **Segurança:** Autenticação e Autorização via JWT com RBAC (*Role-Based Access Control*)
- **Padrões:** Clean Architecture, Repository Pattern, Dependency Injection e DTOs.

### Frontend (SPA)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Estilização:** Tailwind CSS (Design responsivo com Glassmorphism)
- **Iconografia:** Lucide React

---

## 🏗️ Arquitetura do Sistema

O projeto adota os princípios da **Clean Architecture**, garantindo que a lógica de negócio seja independente de frameworks e camadas de interface:

1.  **Domain:** Núcleo do sistema. Contém as entidades, interfaces de repositório e regras de negócio puras.
2.  **Application:** Contém os casos de uso (Services), mapeamentos de DTOs e validações.
3.  **Infrastructure:** Gerencia o acesso ao banco de dados (Migrations, Context) e serviços externos.
4.  **API (Web):** Ponto de entrada que gerencia as Controllers, Middlewares e Injeção de Dependência.

---

## 🚀 Implementações Técnicas e Resultados

### 1. Paginação Server-Side (Escalabilidade)
Substituição da paginação em memória (client-side) por processamento nativo no banco de dados.
- **Implementação:** Utilização dos métodos `.Skip()` e `.Take()` no EF Core integrados a DTOs de resposta com metadados de paginação.
- **Resultado:** Redução drástica no payload da rede e consumo de RAM estável no servidor.

### 2. Hardening de Segurança
Remoção de vulnerabilidades de configuração e acoplamento direto.
- **Implementação:** Extração de chaves JWT e strings de conexão para variáveis de ambiente. Desacoplamento entre Controllers e DbContext através da camada de Service.
- **Resultado:** Eliminação de credenciais expostas no código e aumento da testabilidade do sistema.

### 3. Modernização da UX e Tratamento de Erros
Migração de interações síncronas para fluxos assíncronos fluidos.
- **Implementação:** Tratamento global de exceções no React com modais estilizados e feedback visual de *loading*.
- **Resultado:** Solução definitiva para travamentos de tela (White Screen of Death) durante requisições.

---

## 📊 Funcionalidades Chave

* **Triagem Inteligente:** Algoritmo que sugere a especialidade médica adequada com base nos sintomas inseridos.
* **Dashboard de Gestão:** Monitoramento em tempo real da **Taxa de Absenteísmo** e volume de atendimentos.
* **RBAC (Controle por Perfil):** Acesso granulado onde Médicos gerenciam apenas suas agendas e Administradores possuem visão macro.
* **Trilha de Auditoria:** Rastreabilidade total de alterações, cancelamentos e remarcações de consultas.

---

## ⚙️ Como Executar

### Pré-requisitos
- .NET 10 SDK
- Node.js (v18+)
- SQL Server

### Passo a Passo
1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/clinica-mais-saude.git](https://github.com/seu-usuario/clinica-mais-saude.git)
