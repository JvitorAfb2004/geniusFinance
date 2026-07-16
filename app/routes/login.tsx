import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { LoginEmailForm } from "~/components/LoginEmailForm";
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
    <div className="flex flex-col h-[100dvh] items-center justify-center bg-gradient-to-br from-bg to-primary/5 px-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      <div className="clay p-8 border border-border text-center max-w-md w-full relative z-10">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <img src="/icon.svg" alt="Genius Finance" className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-2 font-sans tracking-tight">
          Genius Finance<span className="text-primary">.</span>
        </h1>
        <p className="text-text-secondary mb-6">Faça login para acessar seus dados de forma segura na nuvem.</p>

        <LoginEmailForm 
          termsAccepted={termsAccepted} 
          onTermsChange={setTermsAccepted} 
          onOpenTerms={() => setLegalModal("terms")}
          onOpenPrivacy={() => setLegalModal("privacy")}
        />

        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => {
              setIsGoogleTermsModalOpen(true);
            }}
            className="w-full clay-btn font-medium py-3 px-4 flex items-center justify-center gap-3 cursor-pointer"
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

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-text-muted font-medium tracking-wide">
            Desenvolvido por <a href="https://geniusweb.online" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">geniusweb.online</a>
          </p>
        </div>
      </div>

      {isGoogleTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsGoogleTermsModalOpen(false)} />
          <div className="relative bg-surface border border-border p-6 rounded-2xl shadow-xl max-w-sm w-full z-10 text-center animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Termos e Condições</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">
              Para prosseguir com o login do Google, é necessário aceitar os termos de uso e a política de privacidade da plataforma.
            </p>

            {/* Checkbox do Google */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 bg-surface border border-border rounded-xl mb-6 text-left hover:bg-primary/5 transition-colors">
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
