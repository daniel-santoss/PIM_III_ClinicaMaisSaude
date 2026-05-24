export function obterMinDate(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function getRealDate(dateStr?: string, isUtc: boolean = false): Date | null {
  if (!dateStr) return null;
  if (isUtc) {
    return new Date(dateStr);
  }
  const cleanStr = dateStr.replace(/Z$/, '');
  const parts = cleanStr.split(/[-T:]/);
  if (parts.length >= 5) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);
    const secondPart = parts[5] || "0";
    const second = parseInt(secondPart.split('.')[0], 10) || 0;
    return new Date(year, month, day, hour, minute, second);
  }
  return new Date(cleanStr);
}
