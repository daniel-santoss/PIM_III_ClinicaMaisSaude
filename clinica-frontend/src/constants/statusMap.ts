import { statusAgendamento } from "./status";

export const MapNomesStatus: Record<string, string> = {
  [statusAgendamento.agendado]: "Agendado",
  [statusAgendamento.emAtendimento]: "Em Atendimento",
  [statusAgendamento.aguardandoRetorno]: "Aguardando Retorno",
  [statusAgendamento.retornoAgendado]: "Retorno Agendado",
  [statusAgendamento.finalizado]: "Finalizado",
  [statusAgendamento.faltou]: "Faltou",
  [statusAgendamento.cancelado]: "Cancelado"
};

export const MapNomesTipoConsulta: Record<string, string> = {
  "Triagem": "Triagem",
  "Exame": "Exame",
  "Vacina": "Vacina",
  "ConsultaMedica": "Consulta Médica",
  "Retorno": "Retorno",
};

export const MapNomesEspecialidade: Record<string, string> = {
  "ClinicaGeral": "Clínica Geral",
  "MedicinaDeFamilia": "Medicina de Família",
  "Pediatria": "Pediatria",
  "GinecologiaEObstetricia": "Ginecologia e Obstetrícia",
  "Cardiologia": "Cardiologia",
  "Dermatologia": "Dermatologia",
  "Endocrinologia": "Endocrinologia",
  "Gastroenterologia": "Gastroenterologia",
  "Neurologia": "Neurologia",
  "OrtopediaETraumatologia": "Ortopedia e Traumatologia",
  "Psiquiatria": "Psiquiatria",
  "Otorrinolaringologia": "Otorrinolaringologia",
  "Oftalmologia": "Oftalmologia",
  "Urologia": "Urologia",
  "Pneumologia": "Pneumologia",
  "Reumatologia": "Reumatologia",
  "Geriatria": "Geriatria",
  "MedicinaEsportiva": "Medicina Esportiva"
};
