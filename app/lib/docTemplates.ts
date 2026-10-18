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
