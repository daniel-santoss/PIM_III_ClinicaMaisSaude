// Máscaras e validações — espelham clinica-frontend/src/utils/validators.ts
// para manter paridade de comportamento entre web e mobile.

export function soDigitos(valor?: string | null): string {
  return (valor ?? '').replace(/\D/g, '');
}

export function mascaraTelefone(valor?: string | null): string {
  const nums = soDigitos(valor).slice(0, 11);
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{4})$/, '$1-$2');
  }
  return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{4})$/, '$1-$2');
}

export function mascaraCpf(valor?: string | null): string {
  const nums = soDigitos(valor).slice(0, 11);
  return nums
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Telefone brasileiro: fixo (10) ou celular (11 dígitos).
export function isTelefoneValido(telefone: string): boolean {
  const n = soDigitos(telefone).length;
  return n === 0 || n === 10 || n === 11; // vazio é permitido (telefone opcional)
}
