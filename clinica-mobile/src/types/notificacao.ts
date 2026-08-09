// Espelha o NotificacaoResponse do backend (JSON camelCase).
export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
  link: string | null;
  lida: boolean;
  dtCriado: string;
}
