# Lógica de Negócio — Módulo de Agendamentos

## Entidades

### Profissional
```
enum TipoProfissional { Enfermeira, Medico }
```

### Tipo de Consulta
```
enum TipoConsulta { Triagem, Exame, Vacina, ConsultaMedica, Retorno }
```

### Status do Agendamento
```
enum StatusAgendamento {
  Agendado,
  EmAtendimento,
  AguardandoRetorno,
  RetornoAgendado,
  Finalizado
}
```

---

## Matriz de Permissões (Profissional × Tipo de Consulta)

| Tipo de Consulta | Enfermeira | Médico |
|---|---|---|
| Triagem          | ✅ | ❌ |
| Exame            | ✅ | ❌ |
| Vacina           | ✅ | ❌ |
| Consulta Médica  | ❌ | ✅ |
| Retorno          | ❌ | ✅ |

> Regra: a combinação Profissional + TipoConsulta é validada antes de salvar.

---

## Fluxo de Status (Máquina de Estados)

```
Agendado
   ↓
EmAtendimento
   ↓
AguardandoRetorno  ←──── (opcional, apenas se médico decidir)
   ↓
RetornoAgendado    ←──── (apenas se vier de AguardandoRetorno)
   ↓
Finalizado
```

### Transições permitidas

| De                  | Para                 | Condição                              |
|---|---|---|
| Agendado            | EmAtendimento        | Sempre permitido                      |
| EmAtendimento       | AguardandoRetorno    | Apenas TipoConsulta = ConsultaMedica  |
| EmAtendimento       | Finalizado           | Qualquer tipo                         |
| AguardandoRetorno   | RetornoAgendado      | Novo agendamento de Retorno criado    |
| RetornoAgendado     | Finalizado           | Sempre permitido                      |

> Regra: qualquer transição fora da tabela acima deve ser rejeitada com erro explícito.

---

## Validações

### Ao Criar Agendamento

```
ValidarCriacao(agendamento):
  1. profissional.Tipo × agendamento.TipoConsulta → checar Matriz de Permissões
     → ERRO: "Profissional não habilitado para este tipo de consulta."

  2. SE TipoConsulta = Retorno:
     → buscar consulta inicial do mesmo paciente
     → SE não existir consulta com Status = AguardandoRetorno:
        → ERRO: "Retorno só pode ser agendado após uma consulta inicial pendente."

  3. Conflito de horário:
     → buscar agendamentos do mesmo profissional na mesma data/hora
     → SE existir:
        → ERRO: "Profissional já possui agendamento neste horário."

  4. DataHora não pode ser no passado.
     → ERRO: "Não é possível agendar em datas passadas."
```

### Ao Atualizar Status

```
ValidarTransicao(agendamentoAtual, novoStatus):
  1. Checar tabela de transições permitidas
     → SE transição inválida:
        → ERRO: "Transição de '{statusAtual}' para '{novoStatus}' não é permitida."

  2. SE novoStatus = AguardandoRetorno:
     → verificar se TipoConsulta = ConsultaMedica
     → ERRO: "Apenas consultas médicas podem gerar retorno."

  3. SE novoStatus = RetornoAgendado:
     → verificar se existe agendamento de Retorno vinculado ao paciente
     → ERRO: "Nenhum retorno foi agendado para este paciente."
```

---

## Fluxo Completo (Narrativa)

```
1. Recepcionista cria agendamento
   → valida profissional + tipo de consulta
   → valida conflito de horário
   → Status inicial: Agendado

2. Profissional inicia atendimento
   → Status: Agendado → EmAtendimento

3a. Atendimento simples (Triagem, Exame, Vacina):
    → Status: EmAtendimento → Finalizado

3b. Consulta médica sem retorno:
    → Status: EmAtendimento → Finalizado

3c. Consulta médica com retorno necessário:
    → Status: EmAtendimento → AguardandoRetorno
    → Recepcionista agenda novo Retorno para o paciente
    → Status: AguardandoRetorno → RetornoAgendado

4. Retorno é realizado:
   → Status: RetornoAgendado → EmAtendimento → Finalizado
```

---

## Sugestões de Melhoria

### 1. Prioridade na Fila
Adicionar campo `Prioridade (Normal, Urgente)` no agendamento. Triagens urgentes sobem na fila do médico automaticamente.

### 2. Vincular Agendamentos
Criar campo `AgendamentoOrigemId (Guid?)` na entidade. Retornos referenciam a consulta inicial, criando rastreabilidade do histórico do paciente.

### 3. Duração por Tipo
Cada `TipoConsulta` tem uma duração padrão em minutos:
- Triagem: 15 min
- Vacina: 10 min
- Exame: 30 min
- Consulta Médica: 30 min
- Retorno: 20 min

Usar para validar sobreposição de horários com mais precisão (hoje valida só o horário exato).

### 4. Notificação de Retorno Pendente
Se um agendamento ficar em `AguardandoRetorno` por mais de X dias sem um retorno ser marcado, exibir alerta na interface.
```
