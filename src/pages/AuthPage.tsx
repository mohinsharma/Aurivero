import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('demo.trader@bullseye.in');
  const [password, setPassword] = useState('trader1234');
  const [name, setName] = useState('Amay Puri');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  const handleGuestLogin = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              <svg className="w-5 h-5 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="font-extrabold text-2xl font-mono tracking-wider text-text-primary">
              BULLSEYE
            </span>
          </Link>
          <p className="text-xs text-text-secondary font-mono">
            Learn the market. Train your decisions. Protect your future.
          </p>
        </div>

        {/* Auth Card */}
        <Card variant="elevated" className="border border-border/80 shadow-2xl p-6 sm:p-8">
          <div className="flex border-b border-border/60 pb-3 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 pb-2 text-xs font-mono font-semibold tracking-wider text-center transition-colors border-b-2 ${
                !isSignUp
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 pb-2 text-xs font-mono font-semibold tracking-wider text-center transition-colors border-b-2 ${
                isSignUp
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              CREATE SIMULATOR ACCOUNT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-surface border border-border px-3.5 py-2.5 rounded-xl text-text-primary text-xs focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-text-primary text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-text-secondary">Password</label>
                {!isSignUp && (
                  <span className="text-[11px] text-secondary hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-text-primary text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              icon={<ArrowRight size={15} />}
              iconPosition="right"
            >
              {isSignUp ? 'Create Free Learning Account' : 'Sign In to Simulator'}
            </Button>
          </form>

          {/* Quick 1-Click Guest Test Drive */}
          <div className="mt-6 pt-5 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGuestLogin}
              icon={<UserCheck size={14} />}
            >
              Instant 1-Click Guest Access (No Sign Up)
            </Button>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-surface border border-border/50 text-[11px] text-text-muted flex items-start gap-2">
            <ShieldCheck size={15} className="text-primary flex-shrink-0 mt-0.5" />
            <span>
              Zero banking or Demat credentials needed. BULLSEYE is purely an educational simulator.
            </span>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link to="/" className="text-xs text-text-muted hover:text-text-primary transition-colors">
            ← Return to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
};
