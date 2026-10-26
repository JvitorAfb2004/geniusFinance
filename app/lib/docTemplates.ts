// Tokens de variável do gerador de documentos: {{cliente}}, {{valor}}, {{data}}...
// O corpo do template é HTML (contentEditable); os tokens ficam na forma
// <span class="gh-var" data-var="cliente">{{cliente}}</span> para destaque visual.

const VAR_TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nomes de variável em ordem de aparição, sem duplicar.
export function extractTemplateVars(body: string): string[] {
  const seen = new Set<string>();
  const vars: string[] = [];
  for (const match of body.matchAll(VAR_TOKEN)) {
    const name = match[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      vars.push(name);
    }
  }
  return vars;
}

// Envolvomar tokens soltos (ex.: colados de outro editor) com o span de destaque.
export function annotateTemplateVars(body: string): string {
  return body.replace(/(\{\{\s*[^{}]+?\s*\}\})(?![^<]*<\/span>)/g, (token) => {
    const name = token.slice(2, -2).trim();
    return `<span class="gh-var" data-var="${escapeHtml(name)}">{{${name}}}</span>`;
  });
}

// Variável que é só uma data ganha seletor de data. Nomes compostos como
// "local e data" continuam texto livre — senão o usuário não consegue escrever
// a cidade junto da data.
const DATE_VAR = /data|date|prazo|venc|validade/i;
const PLACE_VAR = /local|cidade|lugar|endere|foro|pra[cç]a/i;

export function isDateVariable(name: string): boolean {
  return DATE_VAR.test(name) && !PLACE_VAR.test(name);
}

// Valor ISO do <input type="date"> (aaaa-mm-dd) vira dd/mm/aaaa no documento.
export function formatDateForDocument(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
}

// Caminho inverso: valor antigo salvo como dd/mm/aaaa volta ao seletor de data.
export function toDateInputValue(value: string): string {
  const trimmed = value.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
}

// Substitui os tokens pelos valores preenchidos. Token sem valor vira
// <span class="gh-var gh-var-missing">{{nome}}</span> (realce no preview).
export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(VAR_TOKEN, (token, name) => {
    const key = name.trim();
    const value = values[key];
    if (value) return `<span class="gh-var-filled">${escapeHtml(value)}</span>`;
    return `<span class="gh-var gh-var-missing">{{${key}}}</span>`;
  });
}

// Observação livre digitada na hora de criar/editar o documento: entra no fim
// do corpo como seção própria. Vazio devolve '' (nada é anexado).
export function renderNotesSection(notes: string): string {
  const text = notes.trim();
  if (!text) return '';
  return `<h3>Observações</h3><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}
