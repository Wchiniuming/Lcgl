import { useState, useEffect, useRef } from 'react';
import { checkPassword, hasPassword, setPassword } from '../lib/api';

function LogoIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="22" fill="url(#loginLogoGrad)" />
      <rect x="11" y="23" width="5" height="11" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="19.5" y="17" width="5" height="17" rx="1.5" fill="white" fillOpacity="0.85" />
      <rect x="28" y="11" width="5" height="23" rx="1.5" fill="white" />
      <defs>
        <linearGradient
          id="loginLogoGrad"
          x1="0"
          y1="0"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MascotFace() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(99,102,241,0.4))' }}
    >
      <circle cx="32" cy="32" r="30" fill="url(#mFaceGrad)" />
      <circle cx="22" cy="27" r="4" fill="white" />
      <circle cx="42" cy="27" r="4" fill="white" />
      <circle cx="23.5" cy="27" r="2" fill="#4f46e5" />
      <circle cx="43.5" cy="27" r="2" fill="#4f46e5" />
      <circle cx="25" cy="25" r="1" fill="white" />
      <circle cx="45" cy="25" r="1" fill="white" />
      <path
        d="M22 40 Q32 50 42 40"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="37" r="4" fill="rgba(255,182,193,0.4)" />
      <circle cx="48" cy="37" r="4" fill="rgba(255,182,193,0.4)" />
      <defs>
        <linearGradient id="mFaceGrad" x1="2" y1="2" x2="62" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path
        d="M10 2 A8 8 0 0 1 18 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

interface LoginProps {
  onLoginSuccess: () => void;
  hasPass?: boolean | null;
}

export default function Login({ onLoginSuccess, hasPass: hasPassProp }: LoginProps) {
  const [password, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noPasswordSet, setNoPasswordSet] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        let exists = hasPassProp;
        if (exists === undefined || exists === null) {
          exists = await hasPassword();
        }
        if (!cancelled) {
          if (!exists) setNoPasswordSet(true);
          setIsLoading(false);
          setTimeout(() => inputRef.current?.focus(), 150);
        }
      } catch {
        if (!cancelled) {
          setError('初始化失败，请重启应用');
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function triggerShake() {
    setShakeKey((k) => k + 1);
    setTimeout(() => inputRef.current?.focus(), 400);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      if (noPasswordSet) {
        if (password.length < 6) {
          setError('密码长度至少6位');
          triggerShake();
          setIsLoading(false);
          return;
        }
        await setPassword(password);
        onLoginSuccess();
      } else {
        const ok = await checkPassword(password);
        if (ok) {
          onLoginSuccess();
        } else {
          setError('密码错误');
          triggerShake();
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : '登录失败，请稍后重试';
      if (msg.toLowerCase().includes('rate') || msg.includes('频繁') || msg.includes('限制')) {
        setError('操作过于频繁，请稍后再试');
      } else {
        setError(msg || '登录失败，请稍后重试');
      }
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes bgShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(2px); }
        }
        .login-bg {
          background: radial-gradient(ellipse at 20% 10%, rgba(99,102,241,0.18) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 90%, rgba(129,140,248,0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 50%, rgba(30,41,59,0.5) 0%, transparent 70%),
                      linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%);
          background-size: 200% 200%;
          animation: bgShift 12s ease infinite;
        }
        .login-card {
          animation: cardFloat 6s ease-in-out infinite, fadeUp 0.6s ease both;
        }
        .login-shake {
          animation: shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both;
        }
        .login-glow {
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.15),
            0 8px 32px rgba(0,0,0,0.5),
            0 0 80px rgba(99,102,241,0.08);
        }
        .login-input {
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .login-input:focus {
          box-shadow: 0 0 0 3px rgba(99,102,241,0.25);
          border-color: #6366f1;
          outline: none;
        }
        .login-btn {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          transition: all 0.2s ease;
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }
        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .login-dot {
          animation: pulse 1.8s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>

      <div className="login-bg min-h-screen flex items-center justify-center p-6">
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div
          aria-hidden="true"
          className="fixed top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          aria-hidden="true"
          className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div className="login-card relative w-full max-w-sm login-glow rounded-2xl overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background:
                'linear-gradient(90deg, transparent, #818cf8, #6366f1, #818cf8, transparent)',
            }}
          />

          <div className="px-8 pt-10 pb-8">
            <div className="flex flex-col items-center gap-5 mb-8">
              <div className="relative">
                <MascotFace />
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                >
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
                  理财管家
                </h1>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  您的个人财务管理系统
                </p>
              </div>

              <div className="flex items-center gap-2">
                <LogoIcon />
                <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                  Lcgl
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                >
                  v1.0
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#94a3b8' }}
                >
                  密码
                </label>
                <div className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#475569' }}
                  >
                    <LockIcon />
                  </div>
                  <input
                    ref={inputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder={noPasswordSet ? '暂无密码，请前往设置' : '请输入密码'}
                    disabled={isLoading || noPasswordSet}
                    autoComplete="current-password"
                    className={`login-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm ${
                      error ? 'login-shake' : ''
                    }`}
                    style={{
                      background: 'rgba(30,41,59,0.8)',
                      border: `1.5px solid ${error ? '#f87171' : '#334155'}`,
                      color: noPasswordSet ? '#64748b' : '#f1f5f9',
                      cursor: noPasswordSet ? 'not-allowed' : 'text',
                    }}
                    key={shakeKey}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={isLoading || noPasswordSet}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#475569' }}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#818cf8')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                {error && (
                  <div
                    className="mt-2 flex items-center gap-1.5 text-xs rounded-lg px-3 py-2"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#fca5a5' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    {error}
                  </div>
                )}

                {noPasswordSet && (
                  <div
                    className="mt-2 flex items-center gap-1.5 text-xs rounded-lg px-3 py-2"
                    style={{ background: 'rgba(251,191,36,0.1)', color: '#fcd34d' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                    请先在设置中设置密码
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !password.trim() || noPasswordSet}
                className="login-btn w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon />
                    验证中…
                  </>
                ) : (
                  <>
                    <LockIcon />
                    进入应用
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: '#475569' }}>
                100% 本地存储 · 隐私安全
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full login-dot"
                    style={{
                      background: '#6366f1',
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, #334155, transparent)',
            }}
          />
        </div>
      </div>
    </>
  );
}
