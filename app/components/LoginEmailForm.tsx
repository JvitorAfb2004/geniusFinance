import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { resetPassword, signInWithEmail, signUpWithEmail } from '../lib/firebase';
import { createUserOnboardingDocs } from '../lib/onboarding';

type LoginMode = 'login' | 'register' | 'forgot';

interface LoginEmailFormProps {
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
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

export function LoginEmailForm({ termsAccepted, onTermsChange }: LoginEmailFormProps) {
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
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer ${mode === 'login' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(''); setResetSent(false); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer ${mode === 'register' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Criar conta
        </button>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {mode === 'register' && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
              <User className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-sm outline-none"
              />
            </label>
          )}

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
            <Mail className="w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm outline-none"
            />
          </label>

          {mode !== 'forgot' && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
              <Lock className="w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Mostrar ou ocultar senha"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </label>
          )}

          {mode === 'register' && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full text-sm outline-none"
              />
            </label>
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
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer shrink-0"
            />
            <span className={`text-xs leading-relaxed select-none text-left ${!termsAccepted && error ? 'text-red-600 font-medium' : 'text-text-secondary'}`}>
              Li e concordo com os{' '}
              <span className="text-[#3b82f6] font-medium">Termos de Uso</span>
              {' '}e a{' '}
              <span className="text-[#3b82f6] font-medium">Política de Privacidade</span>
            </span>
          </label>

          {error && <p className="text-xs text-red-500 -mt-1 mb-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processando...' : mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar recuperação' : 'Entrar com email'}
          </button>
        </form>
      )}
    </div>
  );
}
