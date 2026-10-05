import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { LoginEmailForm } from "~/components/LoginEmailForm";
import { LoginVisualPanel } from "~/components/LoginVisualPanel";
import LegalModal from "~/components/LegalModal";
import { TERMOS_DE_USO } from "~/lib/termos-de-uso";
import { POLITICA_PRIVACIDADE } from "~/lib/politica-privacidade";
import { getLoginRedirectPath } from "~/lib/authRedirect";

const TERMS_KEY = "gh_terms_accepted";

export default function Login() {
  const { user, loading, signInWithGoogle } = useFinance();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [termsAccepted, setTermsAccepted] = useState(() => {
    try { return localStorage.getItem(TERMS_KEY) === "true"; } catch { return false; }
  });
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const [isGoogleTermsModalOpen, setIsGoogleTermsModalOpen] = useState(false);
  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false);

  useEffect(() => {
    if (user) navigate(getLoginRedirectPath(searchParams.get("redirect")), { replace: true });
  }, [user, navigate, searchParams]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-dvh flex bg-white p-4 sm:p-6 lg:p-0">
      <div className="w-full overflow-hidden bg-white lg:grid lg:min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary text-white text-base font-bold flex items-center justify-center shrink-0">G</span>
              <span className="font-bold tracking-tight text-lg text-text-primary">Genius.</span>
            </div>
            <h1 className="mt-10 mb-8 text-3xl font-bold tracking-tight text-text-primary lg:mt-0">Acesse sua conta</h1>

            <LoginEmailForm
              termsAccepted={termsAccepted}
              onTermsChange={setTermsAccepted}
              onOpenTerms={() => setLegalModal("terms")}
              onOpenPrivacy={() => setLegalModal("privacy")}
            />

            <div className="mt-4">
          <button
            onClick={() => {
              setIsGoogleTermsModalOpen(true);
            }}
            className="w-full h-12 bg-white border border-[#e5e7eb] hover:bg-[#f6f7f9] rounded-xl font-medium px-4 flex items-center justify-center gap-3 cursor-pointer text-sm text-text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
              </button>
            </div>

            <p className="mt-8 text-center text-[0.7rem] text-text-muted font-medium tracking-wide">
              Projeto gratuito feito por <a href="https://joaovitorafb.site/" target="_blank" rel="noopener noreferrer" className="hover:underline">João Vitor</a>
            </p>
          </div>
        </div>
        <LoginVisualPanel />
      </div>

      {isGoogleTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsGoogleTermsModalOpen(false)} />
          <div className="relative bg-surface border border-border p-6 rounded-lg shadow-lg max-w-sm w-full z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Termos e Condições</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">
              Para prosseguir com o login do Google, é necessário aceitar os termos de uso e a política de privacidade da plataforma.
            </p>

            {/* Checkbox do Google */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 bg-slate-50 border border-border rounded-md mb-6 text-left hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={googleTermsAccepted}
                onChange={(e) => setGoogleTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
              />
              <span className="text-xs leading-relaxed select-none text-text-secondary">
                Li e concordo com os{' '}
                <span 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalModal("terms"); }} 
                  className="text-primary font-semibold cursor-pointer hover:underline"
                >
                  Termos de Uso
                </span>
                {' '}e a{' '}
                <span 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalModal("privacy"); }} 
                  className="text-primary font-semibold cursor-pointer hover:underline"
                >
                  Política de Privacidade
                </span>
              </span>
            </label>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsGoogleTermsModalOpen(false);
                  setGoogleTermsAccepted(false);
                }}
                className="flex-1 clay-btn font-medium py-2.5 px-4 text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsGoogleTermsModalOpen(false);
                  localStorage.setItem(TERMS_KEY, "true");
                  signInWithGoogle();
                }}
                disabled={!googleTermsAccepted}
                className="flex-1 clay-btn-primary font-bold py-2.5 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {legalModal === "terms" && (
        <LegalModal title="Termos de Uso" content={TERMOS_DE_USO} onClose={() => setLegalModal(null)} />
      )}
      {legalModal === "privacy" && (
        <LegalModal title="Política de Privacidade" content={POLITICA_PRIVACIDADE} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
