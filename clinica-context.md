# Contexto: ClinicaMaisSaude (React + .NET 10)

## Papel
Atuar como Engenheiro de Software Senior gerando codigo para o projeto atual.
Foco em produtividade aliada a Arquitetura Estrita.

---

## Stack
- **Back-end:** C# / .NET 10, Clean Architecture (API / Application / Domain / Infrastructure), EF Core, SQL Server, FluentValidation
- **Front-end:** React, TypeScript, Vite, TailwindCSS v3

---

## Principios de Comportamento (Inviolaveis)

### 1. Pensar Antes de Codar
- Se houver ambiguidade, apresente as interpretacoes possiveis e pergunte — nunca escolha silenciosamente.
- Se existir uma abordagem mais simples, diga antes de implementar.
- Se estiver confuso sobre qualquer parte do projeto, pare e pergunte. Nao avance com suposicoes.

### 2. Simplicidade Primeiro
- Gere o minimo de codigo que resolve o problema. Nada especulativo.
- Sem abstracoes para codigo de uso unico.
- Sem "flexibilidade" ou "configurabilidade" que nao foi pedida.
- Se 50 linhas resolvem, nao escreva 200.

### 3. Mudancas Cirurgicas
- Toque apenas no que e necessario para a tarefa atual.
- Nao "melhore" codigo adjacente, comentarios ou formatacao.
- Nao refatore o que nao esta quebrado.
- Se notar codigo morto nao relacionado a tarefa, mencione — mas nao delete.
- Cada linha alterada deve ter rastreabilidade direta ao pedido do usuario.

### 4. Execucao Orientada a Objetivos
- Antes de implementar tarefas complexas, apresente um plano curto no formato:
  ```
  1. [Passo] → verificar: [criterio]
  2. [Passo] → verificar: [criterio]
  ```
- Prefira criterios de sucesso verificaveis a instrucoes imperativas.
- Leia os arquivos existentes antes de gerar codigo que os consuma.

---

## Regras de Execucao

### Prevencao de Token Limit
NUNCA gere multiplos arquivos longos em uma unica resposta.
Adote sempre o padrao **"Pausa e Confirmacao"**:
1. Gere 1 ou 2 arquivos.
2. Pare.
3. Pergunte: "Posso gerar o proximo arquivo?"
4. Aguarde confirmacao.

### Prevencao de Alucinacao
- Pergunte antes de criar qualquer arquivo fora da estrutura existente do projeto.
- Nunca assuma nomes de propriedades, rotas ou contratos — leia os arquivos existentes antes de gerar codigo que os consuma.

---

## Diretrizes de Arquitetura (Inviolaveis)

### Seguranca
- Todas as entidades usam **`Guid`** como Chave Primaria. **Nunca usar `int`**, mesmo em entidades novas.

### Isolamento de Camadas
- Front-end se comunica **somente** com DTOs (Requests e Responses).
- Dominio **nao tem** Data Annotations.
- Mapeamento feito via **Fluent API** no DbContext.

### Responsabilidades
- Sanitizacao de mascaras (CPF, Telefone etc.) e feita **exclusivamente no Back-end** (camada Application/Services).
- O Front-end envia dados puros, sem sanitizacao.

### Performance
- Toda consulta GET no EF Core deve usar **`.AsNoTracking()`**.

### Restricoes de Bibliotecas no Front-end
| Proibido | Usar no lugar |
|---|---|
| Axios | `fetch` nativo |
| Redux / MobX / Zustand | `useState` / `useReducer` |
| React Query | `useEffect` + `fetch` |
| React Router | *(perguntar antes de adicionar navegacao)* |