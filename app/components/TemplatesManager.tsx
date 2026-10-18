import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Plus, Trash2, Edit3, Sparkles, Trash } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import TemplateEditor from './TemplateEditor';
import TemplateFillView from './TemplateFillView';
import ConfirmModal from './ConfirmModal';
import { extractTemplateVars } from '../lib/docTemplates';
import type { DocTemplate } from '../types';

type PendingDelete = { kind: 'template'; item: DocTemplate; name: string } | { kind: 'document'; item: { id: string }; name: string };

// Página "Modelos": cria/edita modelos com variáveis, gera documentos
// preenchendo as variáveis e mantém o histórico dos documentos criados.
export default function TemplatesManager() {
  const { templates, documents, addTemplate, updateTemplate, deleteTemplate, deleteGeneratedDocument, loading } = useFinance();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DocTemplate | null>(null);
  const [filling, setFilling] = useState<DocTemplate | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; bodyHtml: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const sortedDocs = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  // Modelos inválidos/vazios não quebram a listagem (body pode faltar em dados antigos).
  const usableTemplates = templates.filter((model) => !!model && typeof model.body === 'string');

  async function createDemo() {
    await addTemplate({
      name: 'Contrato de Prestação de Serviços',
      description: 'Modelo pronto para adaptar (não substitui orientação jurídica).',
      body: '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2><p>CONTRATANTE: <span class="gh-var" data-var="contratante">{{contratante}}</span></p>'
        + '<p>CONTRATADO: <span class="gh-var" data-var="contratado">{{contratado}}</span></p>'
        + '<p>OBJETO: <span class="gh-var" data-var="serviço">{{serviço}}</span></p>'
        + '<p>VALOR: R$ <span class="gh-var" data-var="valor">{{valor}}</span>, com vencimento em <span class="gh-var" data-var="vencimento">{{vencimento}}</span>.</p>'
        + '<p>Local e data: <span class="gh-var" data-var="local e data">{{local e data}}</span>.</p>'
        + '<p>________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;________________</p><p>Contratante&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Contratado</p>',
    });
  }

  if (filling) return <TemplateFillView key={filling.id} template={filling} onClose={() => setFilling(null)} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-primary-dark shadow-sm"><Plus size={16} /> Novo modelo</button>
      </div>

      {usableTemplates.length === 0 && !loading && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-3"><FileText className="text-primary-dark" size={22} /></div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum modelo ainda</h3>
          <p className="text-[0.82rem] text-slate-500 mt-1 leading-relaxed">Crie um contrato, recibo ou qualquer documento com variáveis como {'{{cliente}}'} e {'{{valor}}'}.</p>
          <button onClick={createDemo} className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-50"><Sparkles size={15} /> Começar com contrato de exemplo</button>
        </div>
      )}

      {usableTemplates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {usableTemplates.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[0.95rem] font-bold text-slate-800 truncate">{model.name}</h3>
                  <p className="text-[0.78rem] text-slate-500 mt-0.5 line-clamp-2">{model.description || 'Sem descrição'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0"><FileText className="text-primary-dark" size={18} /></div>
              </div>
              <p className="text-[0.7rem] text-[#8a919d]">{extractTemplateVars(model.body).length} variável(is) · atualizado em {new Date(model.updatedAt).toLocaleDateString('pt-BR')}</p>
              <div className="flex items-center gap-1.5 mt-auto">
                <button onClick={() => setFilling(model)} className="flex-1 px-3 py-2 bg-primary text-white rounded-xl text-[0.8rem] font-semibold cursor-pointer hover:bg-primary-dark">Criar documento</button>
                <button onClick={() => setEditing(model)} aria-label={`Editar ${model.name}`} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center cursor-pointer"><Edit3 size={14} /></button>
                <button onClick={() => setPendingDelete({ kind: 'template', item: model, name: model.name })} aria-label={`Excluir ${model.name}`} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-danger-light hover:text-danger-dark flex items-center justify-center cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {sortedDocs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[0.72rem] font-semibold text-[#b0b6bf] uppercase tracking-[0.08em]">Documentos criados</h2>
          <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 overflow-hidden">
            {sortedDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0"><FileText className="text-slate-400" size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.85rem] font-semibold text-slate-800 truncate">{doc.title}</p>
                  <p className="text-[0.7rem] text-slate-500 truncate">{doc.templateName} · {new Date(doc.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => setViewingDoc({ title: doc.title, bodyHtml: doc.bodyHtml })} className="px-3 py-1.5 text-[0.75rem] font-semibold text-primary-dark bg-primary-light rounded-lg cursor-pointer hover:opacity-80">Ver</button>
                <button onClick={() => setPendingDelete({ kind: 'document', item: doc, name: doc.title })} aria-label={`Excluir ${doc.title}`} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-danger-light hover:text-danger-dark flex items-center justify-center cursor-pointer"><Trash size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(creating || editing !== null) && (
        <TemplateEditor
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {viewingDoc && (
        <div className="fixed inset-0 z-[70] bg-[#f6f7f9] flex flex-col">
          <div className="flex items-center justify-between gap-3 bg-white border-b border-slate-100 px-5 py-3">
            <h2 className="text-[1rem] font-bold text-slate-800 truncate">{viewingDoc.title}</h2>
            <div className="flex items-center gap-2 gh-no-print">
              <button onClick={() => window.print()} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-slate-50">Imprimir / PDF</button>
              <button onClick={() => setViewingDoc(null)} className="w-9 h-9 rounded-full bg-[#f6f7f9] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer">✕</button>
            </div>
          </div>
          <div className="overflow-y-auto p-5 sm:p-8 bg-white">
            <div className="gh-print-area gh-doc-body mx-auto max-w-3xl bg-white px-8 py-10 min-h-[60vh]" dangerouslySetInnerHTML={{ __html: viewingDoc.bodyHtml }} />
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={pendingDelete.kind === 'template' ? 'Excluir modelo?' : 'Excluir documento?'}
          message={`"${pendingDelete.name}" será apagado definitivamente. Dados de lançamentos não são afetados.`}
          confirmLabel="Excluir"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete.kind === 'template') void deleteTemplate(pendingDelete.item.id);
            else void deleteGeneratedDocument(pendingDelete.item.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}


