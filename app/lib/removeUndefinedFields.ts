// Firestore rejeita valores undefined em set/update ("Unsupported field value").
// Campos opcionais vazios (ex.: description de template) devem ser omitidos.
export function removeUndefinedFields<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  ) as Partial<T>;
}
