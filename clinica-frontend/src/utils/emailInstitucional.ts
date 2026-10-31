// E-mail institucional: médicos e enfermeiras usam obrigatoriamente o domínio da clínica
// (a API valida a mesma regra; aqui é só para ajudar quem digita).
export const DOMINIO_CLINICA = "@clinicamaissaude.com.br";

/** Completa o domínio que falta: "maria.souza" ou "maria.souza@cli" viram "maria.souza@clinicamaissaude.com.br". */
export function completarDominio(email: string): string {
  const valor = email.trim();
  const arroba = valor.indexOf("@");
  if (!valor || arroba === 0) return valor;
  if (arroba < 0) return valor + DOMINIO_CLINICA;
  return DOMINIO_CLINICA.startsWith(valor.slice(arroba).toLowerCase()) ? valor.slice(0, arroba) + DOMINIO_CLINICA : valor;
}

export function ehEmailInstitucional(email: string): boolean {
  const valor = email.trim().toLowerCase();
  return valor.length > DOMINIO_CLINICA.length
    && valor.endsWith(DOMINIO_CLINICA)
    && valor.indexOf("@") === valor.length - DOMINIO_CLINICA.length;
}
