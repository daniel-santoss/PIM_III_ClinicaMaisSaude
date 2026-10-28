// Datas vêm da API com sufixo 'Z', mas representam o horário local da clínica
// (o web trata da mesma forma em utils/dates.ts: ignora o fuso e lê os componentes
// como hora local, exibindo exatamente o horário agendado).
export function parseData(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const limpo = dateStr.replace(/Z$/, '');
  const p = limpo.split(/[-T:]/);
  if (p.length >= 5) {
    const seg = parseInt((p[5] ?? '0').split('.')[0], 10) || 0;
    return new Date(+p[0], +p[1] - 1, +p[2], +p[3], +p[4], seg);
  }
  return new Date(limpo);
}

export function formatarDataHora(dateStr?: string | null): string {
  const d = parseData(dateStr);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} às ${hh}:${min}`;
}

// Tempo relativo curto para notificações ("agora", "há 5 min", "há 3 h",
// "há 2 d"); para datas mais antigas cai no dd/mm.
export function tempoRelativo(dateStr?: string | null): string {
  const d = parseData(dateStr);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias} d`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export interface DiaAgenda {
  iso: string; // "YYYY-MM-DD"
  diaSemana: string; // "Seg"
  dia: string; // "07"
  mes: string; // "08"
}

// Gera os próximos N dias a partir de hoje. A clínica abre todos os dias (escala 12x36);
// quem decide se há horário (profissional de plantão, ausências) é o backend.
export function proximosDias(quantidade: number): DiaAgenda[] {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const out: DiaAgenda[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < quantidade) {
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      diaSemana: nomes[d.getDay()],
      dia: String(d.getDate()).padStart(2, '0'),
      mes: String(d.getMonth() + 1).padStart(2, '0'),
    });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
