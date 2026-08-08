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
