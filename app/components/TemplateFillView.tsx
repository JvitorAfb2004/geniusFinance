import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, FileDown, Loader2, Save } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { extractTemplateVars, renderTemplate } from '../lib/docTemplates';
import { buildValidationUrl, newValidationCode } from '../lib/documentValidation';
import DocumentValidationFooter from './DocumentValidationFooter';
import type { DocTemplate } from '../types';

interface TemplateFillViewProps {
  template: DocTemplate;
  onClose: () => void;
}

// Preenche as variáveis do modelo e gera o documento: preview ao vivo,
// impressão/PDF via window.print() e cópia do texto puro.
export default function TemplateFillView({ template, onClose }: TemplateFillViewProps) {
  const { addGeneratedDocument } = useFinance();
  const vars = useMemo(() => extractTemplateVars(template.body), [template.body]);
  const [title, setTitle] = useState(`${template.name} — ${new Date().toLocaleDateString('pt-BR')}`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // Código do QRCode definido uma vez ao abrir: o mesmo vale na impressão e no histórico.
  const [validationCode] = useState(() => newValidationCode());
  const [savedId, setSavedId] = useState<string | null>(null);

  const renderedHtml = useMemo(() => renderTemplate(template.body, values), [template.body, values]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const validationUrl = useMemo(() => buildValidationUrl(validationCode, origin), [validationCode, origin]);

  function setValue(variable: string, value: string) {
    setValues((prev) => ({ ...prev, [variable]: value }));
  }

  // Cria o documento + registro público de validação uma única vez.
  async function persistDocument(): Promise<string | undefined> {
    const id = await addGeneratedDocument({
      templateId: template.id,
      templateName: template.name,
      title: title.trim() || template.name,
      values,
      bodyHtml: renderedHtml,
      validationCode,
    });
    if (id) setSavedId(id);
    return id;
  }

  async function handleSave() {
    if (savedId) { onClose(); return; }
    setSaving(true);
    setError('');
    try {
      await persistDocument();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Impressão só é fiel se o QR existir no registro público: salva antes (uma vez).
  async function handlePrint() {
    setError('');
    if (!savedId) {
      setSaving(true);
      try {
        await persistDocument();
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setSaving(false);
      }
    }
    window.print();
  }

  async function handleCopy() {
    const preview = document.querySelector('.gh-doc-content');
    await navigator.clipboard.writeText(preview?.textContent ?? '');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const filledCount = vars.filter((variable) => values[variable]).length;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] bg-[#f6f7f9] flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 bg-white border-b border-slate-100 px-5 sm:px-8 py-3">
        <div className="min-w-0 flex items-center gap-3">
          <button onClick={onClose} aria-label="Voltar para modelos" className="w-9 h-9 rounded-full bg-[#f6f7f9] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0">
            <h2 className="text-[1rem] font-bold text-slate-800 truncate">{template.name}</h2>
            <p className="text-[0.72rem] text-slate-500">{filledCount}/{vars.length} variável(is) preenchida(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 gh-no-print">
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-slate-50"><Copy size={15} />{copied ? 'Copiado!' : 'Copiar'}</button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-slate-50"><FileDown size={15} /> Imprimir / PDF</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"><Save size={16} />{saving ? 'Salvando...' : savedId ? 'Salvo' : 'Salvar histórico'}</button>
        </div>
      </div>

      {error && <p className="mx-5 mt-3 rounded-xl bg-danger-light text-danger-dark px-4 py-2.5 text-sm gh-no-print">{error}</p>}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(20rem,26rem)_1fr] overflow-hidden">
        <div className="overflow-y-auto p-5 sm:p-8 space-y-4 gh-no-print">
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-slate-500 uppercase tracking-widest"><span>Título do documento *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="clay-input px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
          {vars.length === 0 && (
            <p className="rounded-xl bg-white border border-slate-100 px-4 py-3 text-sm text-slate-500">
              Este modelo não tem variáveis — use o editor para inserir {"{{tokens}}"} preenchíveis.
            </p>
          )}
          {vars.map((variable) => {
            const isDate = /data|date|prazo|venc/i.test(variable);
            return (
              <label key={variable} className="flex flex-col gap-1 text-[0.72rem] font-semibold text-slate-500 uppercase tracking-widest"><span>{variable}</span>
                <input
                  type={isDate ? 'date' : 'text'}
                  value={values[variable] ?? ''}
                  onChange={(e) => setValue(variable, e.target.value)}
                  placeholder={isDate ? '' : `Preencher ${variable}`}
                  className="clay-input px-3 py-2 text-sm font-normal normal-case tracking-normal"
                /></label>
            );
          })}
        </div>

        <div className="overflow-y-auto p-5 sm:p-8 border-t lg:border-t-0 lg:border-l border-slate-100 bg-white">
          <div className="mx-auto max-w-3xl">
            <div
              className="gh-print-area gh-doc-body bg-white px-8 py-10 min-h-[60vh] rounded-2xl border border-slate-100 shadow-sm"
            >
              {/* HTML gerado pelo próprio app: tokens do modelo + valores escapados em renderTemplate(). */}
              <div className="gh-doc-content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              <DocumentValidationFooter code={validationCode} url={validationUrl} />
            </div>
          </div>
        </div>
      </div>
      {saving && <Loader2 className="animate-spin fixed bottom-5 right-5 text-slate-400 gh-no-print" size={18} />}
    </motion.div>,
    document.body
  );
}
