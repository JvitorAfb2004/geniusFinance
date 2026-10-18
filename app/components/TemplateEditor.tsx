import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Bold, Italic, Underline, Strikethrough, Heading2, List, ListOrdered, Braces, Loader2, X, Save } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { extractTemplateVars, annotateTemplateVars } from '../lib/docTemplates';
import type { DocTemplate } from '../types';

interface TemplateEditorProps {
  initial?: DocTemplate | null;
  onClose: () => void;
}

// Editor rich-text nativo (contentEditable + execCommand): negrito, itálico,
// sublinhado, títulos e listas. Variáveis entram como {{nome}} destacado.
export default function TemplateEditor({ initial, onClose }: TemplateEditorProps) {
  const { addTemplate, updateTemplate } = useFinance();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [varCount, setVarCount] = useState(0);
  const [newVar, setNewVar] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && initial) editorRef.current.innerHTML = annotateTemplateVars(initial.body);
  }, [initial]);

  const syncVars = (html: string) => setVarCount(extractTemplateVars(html).length);

  function insertVariable() {
    const nameTrimmed = newVar.trim().replace(/\s+/g, '');
    if (!nameTrimmed) return;
    document.execCommand(
      'insertHTML',
      false,
      `<span class="gh-var" data-var="${nameTrimmed}">{{${nameTrimmed}}}</span>&nbsp;`
    );
    setNewVar('');
    if (editorRef.current) syncVars(editorRef.current.innerHTML);
  }

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    if (editorRef.current) syncVars(editorRef.current.innerHTML);
  }

  async function handleSave() {
    if (!name.trim()) { setError('Dê um nome ao modelo.'); return; }
    if (!editorRef.current?.innerHTML.trim()) { setError('Escreva o conteúdo do modelo.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = editorRef.current.innerHTML;
      if (initial?.id) await updateTemplate(initial.id, { name: name.trim(), description: description.trim() || undefined, body });
      else await addTemplate({ name: name.trim(), description: description.trim() || undefined, body });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const toolbarButton = 'w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] bg-[#f6f7f9] overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-3 bg-white border-b border-slate-100 px-5 sm:px-8 py-3 sticky top-0 z-10">
        <div className="min-w-0">
          <h2 className="text-[1rem] font-bold text-slate-800 truncate">{initial ? 'Editar modelo' : 'Novo modelo'}</h2>
          <p className="text-[0.72rem] text-slate-500">{'Use variáveis do tipo {{nome}} para preencher depois.'}</p>
        </div>
        <div className="flex items-center gap-2 gh-no-print">
          <button onClick={onClose} aria-label="Fechar editor" className="w-9 h-9 rounded-full bg-[#f6f7f9] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"><X size={18} /></button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"><Save size={16} />{saving ? 'Salvando...' : 'Salvar modelo'}</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-6 flex flex-col gap-4 pb-16">
        {error && <p className="rounded-xl bg-danger-light text-danger-dark px-4 py-2.5 text-sm">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 flex flex-col gap-1 text-[0.72rem] font-semibold text-slate-500 uppercase tracking-widest"><span>Nome do modelo *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Contrato de Prestação de Serviços" className="clay-input px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
          <label className="flex-1 flex flex-col gap-1 text-[0.72rem] font-semibold text-slate-500 uppercase tracking-widest"><span>Descrição (opcional)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve" className="clay-input px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white border border-slate-100 px-2 py-1.5 shadow-sm">
          <button type="button" aria-label="Negrito" onClick={() => exec('bold')} className={toolbarButton}><Bold size={15} /></button>
          <button type="button" aria-label="Itálico" onClick={() => exec('italic')} className={toolbarButton}><Italic size={15} /></button>
          <button type="button" aria-label="Sublinhado" onClick={() => exec('underline')} className={toolbarButton}><Underline size={15} /></button>
          <button type="button" aria-label="Riscado" onClick={() => exec('strikeThrough')} className={toolbarButton}><Strikethrough size={15} /></button>
          <button type="button" aria-label="Título" onClick={() => exec('formatBlock', 'h2')} className={toolbarButton}><Heading2 size={15} /></button>
          <button type="button" aria-label="Lista com marcadores" onClick={() => exec('insertUnorderedList')} className={toolbarButton}><List size={15} /></button>
          <button type="button" aria-label="Lista numerada" onClick={() => exec('insertOrderedList')} className={toolbarButton}><ListOrdered size={15} /></button>
          <div className="mx-2 h-5 w-px bg-slate-200" />
          <input
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertVariable(); } }}
            placeholder="nome da variável"
            aria-label="Nome da variável"
            className="w-36 px-2 py-1 text-xs rounded-lg border border-slate-200 bg-[#f6f7f9]"
          />
          <button type="button" onClick={insertVariable} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary-dark bg-primary-light rounded-lg cursor-pointer hover:opacity-80"><Braces size={13} /> Inserir variável</button>
          {varCount > 0 && <span className="ml-auto text-[0.7rem] text-slate-500">{varCount} variável(is)</span>}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Conteúdo do modelo"
          data-placeholder="Escreva o conteúdo do documento aqui. Algo como: Contrato prestado entre {{contratante}} e {{contratado}}, no valor de {{valor}}, em {{data}}..."
          className="gh-doc-body bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 min-h-[45vh]"
          onInput={(e) => syncVars((e.target as HTMLDivElement).innerHTML)}
          onBlur={(e) => syncVars((e.target as HTMLDivElement).innerHTML)}
        />
        {saving && <Loader2 className="animate-spin self-center text-slate-400" size={18} />}
      </div>
    </motion.div>,
    document.body
  );
}
