import { describe, expect, it } from 'vitest';
import { annotateTemplateVars, extractTemplateVars, formatDateForDocument, isDateVariable, renderNotesSection, renderTemplate, toDateInputValue } from './docTemplates';

describe('extractTemplateVars', () => {
  it('extrai variáveis em ordem sem duplicar', () => {
    const body = '<p>Contrato de {{ cliente }} com {{valor}} e data {{ cliente }}.</p>';
    expect(extractTemplateVars(body)).toEqual(['cliente', 'valor']);
  });

  it('retorna vazio sem tokens', () => {
    expect(extractTemplateVars('<p>Sem variáveis</p>')).toEqual([]);
  });
});

describe('annotateTemplateVars', () => {
  it('envolve token solto com o span de destaque', () => {
    expect(annotateTemplateVars('<p>{{valor}}</p>')).toBe('<p><span class="gh-var" data-var="valor">{{valor}}</span></p>');
  });

  it('não duplica span em tokens já anotados', () => {
    const body = '<span class="gh-var" data-var="valor">{{valor}}</span>';
    expect(annotateTemplateVars(body)).toBe(body);
  });
});

describe('renderTemplate', () => {
  it('substitui preenchidas e mantém realce nas faltantes', () => {
    const body = '<p>{{cliente}} — {{valor}}</p>';
    expect(renderTemplate(body, { cliente: 'Maria' })).toBe(
      '<p><span class="gh-var-filled">Maria</span> — <span class="gh-var gh-var-missing">{{valor}}</span></p>'
    );
  });

  it('escapa valor para não quebrar o HTML', () => {
    expect(renderTemplate('<p>{{nota}}</p>', { nota: '<b>&</b>' })).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
  });
});

describe('isDateVariable', () => {
  it('trata variáveis de data pura como data', () => {
    expect(isDateVariable('data')).toBe(true);
    expect(isDateVariable('vencimento')).toBe(true);
    expect(isDateVariable('Data de emissão')).toBe(true);
  });

  it('mantém livre variável composta com local', () => {
    expect(isDateVariable('local e data')).toBe(false);
    expect(isDateVariable('cidade e data')).toBe(false);
  });

  it('não trata nomes sem relação com data como data', () => {
    expect(isDateVariable('cliente')).toBe(false);
  });
});

describe('formatDateForDocument', () => {
  it('converte ISO em dd/mm/aaaa', () => {
    expect(formatDateForDocument('2026-11-18')).toBe('18/11/2026');
  });

  it('preserva texto que não é ISO', () => {
    expect(formatDateForDocument('São Paulo, 18/11/2026')).toBe('São Paulo, 18/11/2026');
  });
});

describe('toDateInputValue', () => {
  it('converte dd/mm/aaaa de volta para ISO', () => {
    expect(toDateInputValue('18/11/2026')).toBe('2026-11-18');
  });

  it('devolve vazio para texto livre', () => {
    expect(toDateInputValue('São Paulo, 18/11/2026')).toBe('');
  });
});

describe('renderNotesSection', () => {
  it('devolve vazio sem observação', () => {
    expect(renderNotesSection('   ')).toBe('');
  });

  it('cria seção no fim com quebras de linha preservadas', () => {
    expect(renderNotesSection('Linha 1\nLinha 2')).toBe('<h3>Observações</h3><p>Linha 1<br>Linha 2</p>');
  });

  it('escapa HTML digitado pelo usuário', () => {
    expect(renderNotesSection('<script>x</script>')).toContain('&lt;script&gt;x&lt;/script&gt;');
  });
});
