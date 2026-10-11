import React, { useState } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Gift,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const AuthPage: React.FC = () => {
  const { login, register, playSound } = useGame();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign In Form State
  const [signInNumber, setSignInNumber] = useState('9876543210');
  const [signInPassword, setSignInPassword] = useState('password123');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register Form State
  const [regNumber, setRegNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('COBCLUBVIP');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Error & Status State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    playSound('click');

    setIsLoading(true);
    setTimeout(() => {
      const res = login(signInNumber, signInPassword);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in. Please check your credentials.');
        playSound('loss');
      }
    }, 400);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    playSound('click');

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service and Platform Rules.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = register(regNumber, regPassword, regConfirmPassword);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
        playSound('loss');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans text-slate-800 selection:bg-rose-500 selection:text-white">
      {/* Background Soft Ambient Elements */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Logo & Wordmark Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-md shadow-rose-500/20">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-rose-600">
              C
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
              COBCLUB
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </h1>
            <p className="text-xs text-rose-600 font-bold tracking-widest uppercase mt-0.5">
              OFFICIAL GAMING LOGIN
            </p>
          </div>
        </div>

        {/* Auth Form Container Card */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-7 space-y-5">
          {/* Sign In vs Register Segmented Control Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('signin');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('register');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form: SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Phone Number Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit number"
                    value={signInNumber}
                    onChange={(e) => setSignInNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-16 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-rose-600 hover:text-rose-700 cursor-pointer font-medium">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember checkbox */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded-sm border-slate-300 text-rose-600 focus:ring-0"
                  />
                  <span>Remember my login</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to COBCLUB</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Instant Preview Login */}
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  login('9876543210', 'password123');
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Instant Enter / Preview Website</span>
              </button>
            </form>
          )}

          {/* Form: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Phone Number Field */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-16 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Create Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Create Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create password (min 6 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Invite Code (Optional) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Invite Code (Optional)
                </label>
                <input
                  type="text"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono uppercase tracking-wider focus:outline-none"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-rose-600 focus:ring-0 mt-0.5"
                  />
                  <span>
                    I agree to the <strong className="text-slate-800">Terms of Use</strong> and acknowledge this platform operates purely with 100% free virtual points.
                  </span>
                </label>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Registering Account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Platform Guarantee */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>100% Free Virtual Points · Zero Real Money Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
