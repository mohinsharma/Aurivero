import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AuriveroLogo } from '../components/common/AuriveroLogo';

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <AuriveroLogo size="lg" />
            <span className="font-bold text-2xl tracking-tight text-[#131722]">
              Aurivero
            </span>
          </Link>
          <p className="text-xs text-[#64748B]">
            Learn the market. Train your decisions. Protect your future.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 sm:p-8 shadow-md">
          <div className="flex border-b border-[#E2E8F0] pb-3 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 pb-2 text-xs font-semibold tracking-wide text-center transition-colors border-b-2 ${
                !isSignUp
                  ? 'border-[#2962FF] text-[#2962FF]'
                  : 'border-transparent text-[#64748B] hover:text-[#131722]'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 pb-2 text-xs font-semibold tracking-wide text-center transition-colors border-b-2 ${
                isSignUp
                  ? 'border-[#2962FF] text-[#2962FF]'
                  : 'border-transparent text-[#64748B] hover:text-[#131722]'
              }`}
            >
              CREATE SIMULATOR ACCOUNT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 rounded-lg text-[#131722] text-xs focus:outline-none focus:border-[#2962FF] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-2.5 rounded-lg text-[#131722] text-xs focus:outline-none focus:border-[#2962FF] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#64748B]">Password</label>
                {!isSignUp && (
                  <span className="text-[11px] text-[#2962FF] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-2.5 rounded-lg text-[#131722] text-xs focus:outline-none focus:border-[#2962FF] transition-colors"
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
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
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

          <div className="mt-4 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-start gap-2">
            <ShieldCheck size={15} className="text-[#2962FF] flex-shrink-0 mt-0.5" />
            <span>
              Zero banking or Demat credentials needed. BULLSEYE is purely an educational simulator.
            </span>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link to="/" className="text-xs text-[#64748B] hover:text-[#131722] transition-colors">
            ← Return to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
};
