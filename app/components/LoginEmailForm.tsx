import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { resetPassword, signInWithEmail, signUpWithEmail } from '../lib/firebase';
import { createUserOnboardingDocs } from '../lib/onboarding';

type LoginMode = 'login' | 'register' | 'forgot';

interface LoginEmailFormProps {
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

function mapAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code === 'auth/user-not-found') return 'Email não cadastrado.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Email ou senha incorretos.';
  if (code === 'auth/email-already-in-use') return 'Este email já está em uso.';
  if (code === 'auth/weak-password') return 'A senha deve ter no mínimo 6 caracteres.';
  if (code === 'auth/invalid-email') return 'Email inválido.';
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Tente novamente mais tarde.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function LoginEmailForm({ termsAccepted, onTermsChange, onOpenTerms, onOpenPrivacy }: LoginEmailFormProps) {
  const [mode, setMode] = useState<LoginMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'register') {
        const credential = await signUpWithEmail(name.trim(), email.trim(), password);
        await createUserOnboardingDocs({
          uid: credential.user.uid,
          email: credential.user.email || email.trim(),
          displayName: name.trim(),
          authProvider: 'email',
        });
        const token = await credential.user.getIdToken();
        fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            email: credential.user.email || email.trim(),
            displayName: name.trim(),
          }),
        }).catch(() => {});
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (submitError) {
      setError(mapAuthError(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 bg-[#f6f7f9] rounded-full">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
          className={`flex-1 px-4 py-2 rounded-full cursor-pointer text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-[#1a1d21] text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >Entrar</button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(''); setResetSent(false); }}
          className={`flex-1 px-4 py-2 rounded-full cursor-pointer text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-[#1a1d21] text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >Criar conta</button>
      </div>

      {resetSent ? (
        <div className="text-center rounded-lg bg-emerald-50 border border-emerald-100 p-3">
          <p className="text-sm font-medium text-emerald-700">Email de recuperação enviado.</p>
          <button
            type="button"
            onClick={() => { setMode('login'); setResetSent(false); }}
            className="text-xs text-primary hover:underline mt-2 cursor-pointer"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-name" className="text-[13px] text-text-secondary">Nome completo</label>
              <input
                id="login-name"
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 px-4 border border-[#e5e7eb] rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[#1a1d21] transition-colors bg-white"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[13px] text-text-secondary">E-mail</label>
            <input
              id="login-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 border border-[#e5e7eb] rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[#1a1d21] transition-colors bg-white"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-[13px] text-text-secondary">Senha</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 px-4 pr-12 border border-[#e5e7eb] rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[#1a1d21] transition-colors bg-white"
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary cursor-pointer transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-confirm" className="text-[13px] text-text-secondary">Confirmar senha</label>
              <input
                id="login-confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 px-4 border border-[#e5e7eb] rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[#1a1d21] transition-colors bg-white"
              />
            </div>
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); }}
              className="text-xs text-text-secondary hover:text-primary cursor-pointer self-start"
            >
              Esqueci minha senha
            </button>
          )}

          {/* Checkbox alinhado à esquerda, acima do botão */}
          <label className={`flex items-start gap-2 cursor-pointer mt-1 p-2 rounded-lg transition-colors ${!termsAccepted && error ? 'bg-red-50 border border-red-200' : ''}`}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => onTermsChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
            />
            <span className={`text-xs leading-relaxed select-none text-left ${!termsAccepted && error ? 'text-red-600 font-medium' : 'text-text-secondary'}`}>
              Li e concordo com os{' '}
              <span 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenTerms(); }} 
                  className="text-primary font-medium cursor-pointer hover:underline"
                >
                  Termos de Uso
                </span>
                {' '}e a{' '}
                <span 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPrivacy(); }} 
                  className="text-primary font-medium cursor-pointer hover:underline"
              >
                Política de Privacidade
              </span>
            </span>
          </label>

          {error && <p className="text-xs text-red-500 -mt-1 mb-1">{error}</p>}

          <button type="submit" disabled={loading} className="w-full h-12 px-4 bg-[#1a1d21] hover:opacity-90 text-white rounded-xl cursor-pointer text-sm font-semibold disabled:opacity-50 transition-opacity mt-1">{loading && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />}{loading ? 'Processando...' : mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar recuperação' : 'Entrar com email'}</button>
        </form>
      )}
    </div>
  );
}
