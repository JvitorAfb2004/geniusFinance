import { describe, expect, it } from 'vitest';
import { annotateTemplateVars, extractTemplateVars, renderTemplate } from './docTemplates';

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
