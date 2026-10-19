import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { isValidValidationCode, normalizeValidationCode } from '~/lib/documentValidation';

interface ValidationRecord {
  code: string;
  title: string;
  templateName: string;
  issuedAt: string;
  issuerName?: string;
  status: 'VALID' | 'REVOKED';
}

type ValidationState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'found'; record: ValidationRecord };

function formatIssuedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

// Página pública (sem login) lida pelo QRCode impresso. Mostra só metadados de
// autenticidade — nunca CPF, valores ou o corpo do documento.
export default function ValidarDocumentoRoute() {
  const params = useParams();
  const rawCode = params.code ?? '';
  const code = normalizeValidationCode(rawCode);
  const [state, setState] = useState<ValidationState>({ kind: 'loading' });

  useEffect(() => {
    if (!isValidValidationCode(code)) {
      setState({ kind: 'invalid' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    getDoc(doc(db, 'document_validations', code))
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot.exists()) {
          setState({ kind: 'not-found' });
          return;
        }
        const data = snapshot.data();
        setState({
          kind: 'found',
          record: {
            code: String(data.code ?? code),
            title: String(data.title ?? ''),
            templateName: String(data.templateName ?? ''),
            issuedAt: String(data.issuedAt ?? ''),
            issuerName: data.issuerName ? String(data.issuerName) : undefined,
            status: data.status === 'REVOKED' ? 'REVOKED' : 'VALID',
          },
        });
      })
      .catch(() => { if (!cancelled) setState({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary flex flex-col">
      <header className="px-5 sm:px-8 py-5 border-b border-border bg-white">
        <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
          <span className="w-9 h-9 rounded-xl bg-primary text-white text-base font-bold flex items-center justify-center">G</span>
          <span className="font-bold tracking-tight text-lg text-text-primary">Genius.</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white border border-border rounded-2xl shadow-sm p-7 sm:p-9">
          {state.kind === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              <p className="text-sm text-text-secondary">Conferindo o código {code || '—'}…</p>
            </div>
          )}

          {state.kind === 'invalid' && (
            <>
              <h1 className="text-xl font-bold text-slate-800">Código inválido</h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Um código de validação tem 5 caracteres (letras e números, sem I, L, O, 0 ou 1). Confira e digite novamente.
              </p>
            </>
          )}

          {(state.kind === 'not-found' || state.kind === 'error') && (
            <>
              <h1 className="text-xl font-bold text-slate-800">
                {state.kind === 'not-found' ? 'Documento não encontrado' : 'Não foi possível validar agora'}
              </h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {state.kind === 'not-found'
                  ? `Nenhum registro para o código ${code}. Pode ter sido cancelado ou digitado errado.`
                  : 'Tente novamente em instantes.'}
              </p>
            </>
          )}

          {state.kind === 'found' && (
            <>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.72rem] font-semibold uppercase tracking-wider ${state.record.status === 'VALID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <span className={`w-2 h-2 rounded-full ${state.record.status === 'VALID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {state.record.status === 'VALID' ? 'Documento válido' : 'Documento revogado'}
              </div>

              <h1 className="mt-4 text-xl font-bold text-slate-800 break-words">{state.record.title || 'Documento'}</h1>
              <p className="mt-1 text-sm text-text-secondary">Modelo: {state.record.templateName || '—'}</p>

              <dl className="mt-6 flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2.5">
                  <dt className="text-text-secondary">Código</dt>
                  <dd className="font-bold tracking-[0.16em] font-mono">{state.record.code}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2.5">
                  <dt className="text-text-secondary">Emitido em</dt>
                  <dd className="font-medium text-right">{formatIssuedAt(state.record.issuedAt)}</dd>
                </div>
                {state.record.issuerName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Emitido por</dt>
                    <dd className="font-medium text-right">{state.record.issuerName}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-6 text-[0.72rem] text-text-muted leading-relaxed">
                Esta página confirma que o código foi emitido pelo Genius e não foi revogado. Ela não substitui
                assinatura, reconhecimento de firma ou verificação dos dados do documento original.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
