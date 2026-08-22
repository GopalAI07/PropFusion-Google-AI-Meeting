import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles, Video } from 'lucide-react';
import AuthNavbar from '../components/AuthNavbar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password.trim()) {
      setLocalError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 pt-24 pb-10">

      {/* ─── Full-page gradient background ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #052e2b 0%, #0b3d3a 30%, #0e4a5c 60%, #0a2a45 100%)',
        }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-32 right-16 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Navbar ─── */}
      <AuthNavbar />

      {/* ─── Content ─── */}
      <div className="relative z-10 max-w-md w-full">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(6,95,70,0.55) 0%, rgba(8,145,178,0.45) 50%, rgba(14,74,92,0.75) 100%)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />

          <div className="relative z-10">
            {/* Logo / Badge */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-5">
                <div
                  className="relative flex items-center justify-center w-12 h-12 rounded-2xl shadow-xl shrink-0"
                  style={{ background: 'linear-gradient(135deg,#059669,#0891b2,#2563eb)' }}
                >
                  <Video className="h-6 w-6 text-white" />
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-[#0e4a5c] animate-pulse" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-emerald-300/25 text-sm font-black text-white uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  AI Meeting Hub
                </span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-black tracking-tight"
                style={{
                  background: 'linear-gradient(90deg,#ffffff,#a7f3d0,#a5f3fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Welcome back
              </h2>
              <p className="mt-2.5 text-sm text-slate-200/90">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/30 hover:decoration-cyan-300 underline-offset-4 transition-colors">
                  Sign up
                </Link>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {displayError && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-400/30 text-red-100 px-4 py-3 rounded-xl text-sm">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {displayError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-cyan-200/90 uppercase tracking-wide mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-emerald-300/70" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-3 py-3 text-white placeholder-slate-400/60 bg-white/5 border border-white/15 rounded-xl focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:bg-white/10 text-sm transition-all outline-none"
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-cyan-200/90 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-emerald-300/70" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-11 py-3 text-white placeholder-slate-400/60 bg-white/5 border border-white/15 rounded-xl focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:bg-white/10 text-sm transition-all outline-none"
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-emerald-300/70 hover:text-cyan-200 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-emerald-300/70 hover:text-cyan-200 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-cyan-400/50"
                  />
                  <label htmlFor="remember" className="ml-2 text-slate-200/85">
                    Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="font-semibold text-cyan-300 hover:text-cyan-200 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(90deg,#059669,#0891b2)' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
