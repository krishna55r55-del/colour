import React, { useState, useEffect } from 'react';
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
  Key,
  RefreshCw,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const AuthPage: React.FC = () => {
  const { login, register, sendPasswordResetOtp, resetPasswordWithOtp, playSound } = useGame();

  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot'>('signin');

  // Sign In Form State: empty by default (no default login)
  const [signInNumber, setSignInNumber] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register Form State
  const [regNumber, setRegNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('COBCLUBVIP');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot Password Form State (OTP based)
  const [forgotNumber, setForgotNumber] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [otpSentCode, setOtpSentCode] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Error & Status State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setOtpSuccessMessage(null);
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
    setOtpSuccessMessage(null);
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

  const handleSendOtp = () => {
    setErrorMessage(null);
    setOtpSuccessMessage(null);
    playSound('click');

    setIsSendingOtp(true);
    setTimeout(() => {
      setIsSendingOtp(false);
      const res = sendPasswordResetOtp(forgotNumber);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send OTP.');
        playSound('loss');
      } else {
        setOtpSentCode(res.otp || null);
        setOtpTimer(60);
        setOtpSuccessMessage(`OTP sent successfully to +91 ${forgotNumber.replace(/\D/g, '')}!`);
        playSound('win');
      }
    }, 350);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    playSound('click');

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification OTP');
      playSound('loss');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      playSound('loss');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('New password and confirm password do not match');
      playSound('loss');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const res = resetPasswordWithOtp(forgotNumber, forgotOtp, forgotNewPassword, forgotConfirmPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to reset password.');
        playSound('loss');
      } else {
        setSignInNumber(forgotNumber.trim().replace(/\D/g, ''));
        setSignInPassword(forgotNewPassword);
        setActiveTab('signin');
        setOtpSentCode(null);
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setOtpSuccessMessage('Password reset successfully! You can now sign in with your new password.');
        playSound('jackpot');
      }
    }, 450);
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
          {/* Segmented Control Tabs / Forgot Password Header */}
          {activeTab === 'forgot' ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="flex items-center gap-2 px-2">
                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-rose-900 uppercase tracking-wide">
                  Reset Password via OTP
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setActiveTab('signin');
                  setErrorMessage(null);
                  setOtpSuccessMessage(null);
                }}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setActiveTab('signin');
                  setErrorMessage(null);
                  setOtpSuccessMessage(null);
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
                  setOtpSuccessMessage(null);
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
          )}

          {/* Success Message Banner */}
          {otpSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{otpSuccessMessage}</span>
            </div>
          )}

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
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setForgotNumber(signInNumber || '');
                      setActiveTab('forgot');
                      setErrorMessage(null);
                      setOtpSuccessMessage(null);
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 cursor-pointer font-bold transition-colors"
                  >
                    Forgot password?
                  </button>
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
                    I agree to the <strong className="text-slate-800">Terms of Use</strong> and acknowledge platform guidelines.
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

          {/* Form: FORGOT PASSWORD (OTP BASED) */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Phone Number Field with Send OTP Button */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                      <Phone className="w-4 h-4 mr-1 text-slate-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="Enter 10-digit number"
                      value={forgotNumber}
                      onChange={(e) => setForgotNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-16 pr-3 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSendingOtp || otpTimer > 0}
                    onClick={handleSendOtp}
                    className="px-3.5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    <span>{otpTimer > 0 ? `${otpTimer}s` : 'Send OTP'}</span>
                  </button>
                </div>
              </div>

              {/* OTP Simulation Notification Badge */}
              {otpSentCode && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Verification OTP:</span>
                      <span className="font-mono font-black text-sm tracking-widest text-amber-800">
                        {otpSentCode}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setForgotOtp(otpSentCode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Autofill OTP
                  </button>
                </div>
              )}

              {/* OTP Code Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min. 6 chars)"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showForgotConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Resetting Password...</span>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setActiveTab('signin');
                  setErrorMessage(null);
                  setOtpSuccessMessage(null);
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Platform Guarantee */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Instant Settlements · 24/7 Secure Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
};
