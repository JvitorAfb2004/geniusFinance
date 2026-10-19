// Códigos de validação de documentos gerados (QRCode público).
// Alfabeto sem caracteres ambíguos (I/L/O/0/1) para leitura em voz alta e digitação.
export const VALIDATION_CODE_LENGTH = 5;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;

export function isValidValidationCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

// Aceita "7k2f9", " 7K2F9 " e devolve sempre a forma canônica em maiúsculas.
export function normalizeValidationCode(value: string): string {
  return value.trim().toUpperCase();
}

// Inteiro uniforme em [0, max) via crypto, sem viés de módulo (rejection sampling).
function secureRandomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

// Código de 5 caracteres. Colisão (~1 em 28 milhões) é resolvida pelo índice único
// da coleção document_validations/{code}.
export function newValidationCode(random: (max: number) => number = secureRandomInt): string {
  let code = '';
  for (let index = 0; index < VALIDATION_CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  }
  return code;
}

// URL pública lida pelo QRCode: {origem}/validar/{codigo}
export function buildValidationUrl(code: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/validar/${normalizeValidationCode(code)}`;
}
