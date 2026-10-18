import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Wallet,
  Zap,
  CheckCircle,
  Copy,
  QrCode,
  ShieldCheck,
  CreditCard,
  Building,
  Coins,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Search,
  RefreshCw,
  Check,
  Eye,
  Crown,
  XCircle,
  Filter,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { DepositRecord } from '../../types';

export const DepositView: React.FC = () => {
  const {
    balance,
    user,
    depositRecords,
    submitDepositRequest,
    approveDepositRequest,
    rejectDepositRequest,
    masterDepositRequests,
    refreshMasterDeposits,
    playSound,
    setActiveView,
    selectGame,
  } = useGame();

  // Top view toggle: User Deposit recharge screen vs Admin Approval desk
  const [activeTab, setActiveTab] = useState<'deposit' | 'admin'>('deposit');

  // Recharge Form State
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'paytm' | 'bank' | 'usdt'>('upi');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('1000');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // UTR & Screenshot State (Step: Submit UTR and Submit SS)
  const [utrInput, setUtrInput] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [submittedModal, setSubmittedModal] = useState<{
    isOpen: boolean;
    record: DepositRecord | null;
  }>({
    isOpen: false,
    record: null,
  });

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Admin Management State
  const [adminSearch, setAdminSearch] = useState<string>('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [isSyncingAdmin, setIsSyncingAdmin] = useState<boolean>(false);
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    depositId: string;
    reason: string;
  }>({
    isOpen: false,
    depositId: '',
    reason: 'Invalid or unverified UTR number',
  });

  const presetAmounts = [
    { amount: 100, bonusPercent: 0 },
    { amount: 300, bonusPercent: 0 },
    { amount: 500, bonusPercent: 2 },
    { amount: 1000, bonusPercent: 5 },
    { amount: 2000, bonusPercent: 6 },
    { amount: 5000, bonusPercent: 8 },
    { amount: 10000, bonusPercent: 10 },
    { amount: 50000, bonusPercent: 15 },
  ];

  const currentAmountNum = Math.max(100, parseInt(customAmount, 10) || selectedAmount);
  const currentPreset = presetAmounts.find((p) => p.amount === currentAmountNum);
  const bonusPercent = currentPreset
    ? currentPreset.bonusPercent
    : currentAmountNum >= 10000
    ? 10
    : currentAmountNum >= 1000
    ? 5
    : 0;
  const bonusAmount = Math.round((currentAmountNum * bonusPercent) / 100);
  const totalCredited = currentAmountNum + bonusAmount;

  // Pending count for notification badge
  const pendingRequestsCount = masterDepositRequests.filter((d) => d.status === 'Pending').length;

  const handleSelectPreset = (val: number) => {
    playSound('click');
    setSelectedAmount(val);
    setCustomAmount(val.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmount(val);
    setSelectedAmount(parseInt(val, 10) || 0);
  };

  const handleCopyUpi = () => {
    playSound('click');
    navigator.clipboard?.writeText('cobclub.pay@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Screenshot file reader
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit. Please select a smaller screenshot.');
      return;
    }

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
    playSound('click');
  };

  // Helper to generate a demo sample screenshot receipt for quick testing
  const handleUseDemoScreenshot = () => {
    playSound('click');
    const svgReceipt = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" rx="24"/>
      <circle cx="200" cy="80" r="36" fill="#10b981" />
      <path d="M185 80 L195 90 L215 70" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="200" y="145" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">UPI Transfer Successful</text>
      <text x="200" y="185" font-family="monospace" font-size="34" font-weight="900" fill="#10b981" text-anchor="middle">₹${totalCredited.toLocaleString()}</text>
      <line x1="40" y1="215" x2="360" y2="215" stroke="#334155" stroke-width="1.5" stroke-dasharray="4"/>
      <text x="50" y="245" font-family="sans-serif" font-size="13" fill="#94a3b8">Paid To:</text>
      <text x="350" y="245" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">cobclub.pay@upi</text>
      <text x="50" y="280" font-family="sans-serif" font-size="13" fill="#94a3b8">UTR Ref No:</text>
      <text x="350" y="280" font-family="monospace" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="end">${utrInput || '423891029384'}</text>
      <text x="50" y="315" font-family="sans-serif" font-size="13" fill="#94a3b8">Date &amp; Time:</text>
      <text x="350" y="315" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="end">${new Date().toLocaleString()}</text>
      <rect x="40" y="340" width="320" height="34" rx="10" fill="#1e293b" stroke="#334155"/>
      <text x="200" y="362" font-family="sans-serif" font-size="11" font-weight="bold" fill="#10b981" text-anchor="middle">Official Verified Payment Proof</text>
    </svg>`;
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgReceipt)}`;
    setScreenshotData(dataUri);
    setScreenshotFileName(`Payment_Receipt_₹${totalCredited}.svg`);
    if (!utrInput.trim()) {
      setUtrInput(String(Math.floor(400000000000 + Math.random() * 599999999999)));
    }
  };

  // Submit deposit request for Admin Approval
  const handleSubmitDepositWithProof = () => {
    setFormError('');

    if (currentAmountNum < 100) {
      setFormError('Minimum deposit amount is ₹100.');
      return;
    }

    const cleanUtr = utrInput.trim();
    if (!cleanUtr) {
      setFormError('Please enter the 12-digit UTR / Transaction Reference Number.');
      return;
    }

    if (cleanUtr.length < 6) {
      setFormError('Invalid UTR format. Please provide full transaction reference (minimum 6 digits/characters).');
      return;
    }

    playSound('click');
    setIsProcessing(true);

    setTimeout(() => {
      const record = submitDepositRequest({
        amount: currentAmountNum,
        bonus: bonusAmount,
        method: selectedMethod.toUpperCase(),
        utr: cleanUtr,
        screenshot: screenshotData || undefined,
      });

      setIsProcessing(false);
      setSubmittedModal({
        isOpen: true,
        record,
      });

      // Clear input fields
      setUtrInput('');
      setScreenshotData('');
      setScreenshotFileName('');
    }, 700);
  };

  // Admin actions
  const handleApproveDeposit = (depositId: string) => {
    playSound('click');
    const res = approveDepositRequest(depositId);
    if (res.success) {
      alert('Deposit approved! Points have been credited directly to the player account balance.');
    } else {
      alert(res.error || 'Failed to approve deposit.');
    }
  };

  const handleOpenRejectDialog = (depositId: string) => {
    playSound('click');
    setRejectDialog({
      isOpen: true,
      depositId,
      reason: 'Invalid or unverified UTR number',
    });
  };

  const handleConfirmReject = () => {
    playSound('click');
    rejectDepositRequest(rejectDialog.depositId, rejectDialog.reason);
    setRejectDialog({ isOpen: false, depositId: '', reason: '' });
  };

  const handleSyncAdmin = async () => {
    playSound('click');
    setIsSyncingAdmin(true);
    await refreshMasterDeposits();
    setTimeout(() => setIsSyncingAdmin(false), 500);
  };

  // Filtered deposits for Admin Desk
  const filteredMasterDeposits = masterDepositRequests.filter((d) => {
    const matchesSearch =
      !adminSearch.trim() ||
      (d.memberId && d.memberId.toLowerCase().includes(adminSearch.toLowerCase().trim())) ||
      (d.phoneNumber && d.phoneNumber.includes(adminSearch.trim())) ||
      (d.utr && d.utr.toLowerCase().includes(adminSearch.toLowerCase().trim())) ||
      d.id.toLowerCase().includes(adminSearch.toLowerCase().trim());

    const matchesFilter =
      adminFilter === 'all' ||
      (adminFilter === 'pending' && d.status === 'Pending') ||
      (adminFilter === 'completed' && d.status === 'Completed') ||
      (adminFilter === 'rejected' && d.status === 'Rejected');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveView('home');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>Back</span>
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-black font-display text-slate-900 tracking-wide flex items-center gap-2">
              <span>{activeTab === 'deposit' ? 'Recharge & Deposit Points' : 'Admin Deposit Approval Desk'}</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              {activeTab === 'deposit'
                ? 'Submit UTR and payment screenshot to request recharge points.'
                : 'Review player deposit submissions, verify UTR/proof, and approve balance points.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveTab('deposit');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'deposit'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Recharge</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setActiveTab('admin');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>👑 Admin Approval</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER DEPOSIT RECHARGE SCREEN                      */}
      {/* ======================================================== */}
      {activeTab === 'deposit' && (
        <div className="space-y-6">
          {/* Wallet Balance Hero Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5252] text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-white/90 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  Current Active Balance
                </span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/25">
                  ID: {user?.memberId || 'COB8892'}
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums drop-shadow-sm mb-4">
                ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="flex items-center justify-between text-xs text-white/90 pt-3 border-t border-white/20">
                <span>Phone: +91 {user?.phoneNumber || '9876543210'}</span>
                <span className="flex items-center gap-1 font-bold text-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5 fill-current" />
                  Admin Verified Point Crediting
                </span>
              </div>
            </div>

            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </div>

          {/* Payment Channel Selection */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
              Step 1: Select Deposit Channel
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'upi', name: 'UPI Fast', icon: Zap, popular: true },
                { id: 'paytm', name: 'Paytm QR', icon: QrCode, popular: false },
                { id: 'bank', name: 'Bank Transfer', icon: Building, popular: false },
                { id: 'usdt', name: 'USDT TRC20', icon: Coins, popular: false },
              ].map((ch) => {
                const isSelected = selectedMethod === ch.id;
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setSelectedMethod(ch.id as any);
                    }}
                    className={`relative p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/70 text-rose-700 shadow-xs font-black'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold'
                    }`}
                  >
                    {ch.popular && (
                      <span className="absolute -top-2 right-2 text-[9px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.2 rounded-full tracking-wider shadow-xs">
                        Fastest
                      </span>
                    )}
                    <div className="flex justify-center mb-1.5">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-xs">{ch.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Step 2: Recharge Amount
              </label>
              <span className="text-xs font-bold text-slate-400">Min: ₹100 · Max: ₹100,000</span>
            </div>

            {/* Quick Amount Tiles */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
              {presetAmounts.map((p) => {
                const isSelected = selectedAmount === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => handleSelectPreset(p.amount)}
                    className={`relative py-2.5 sm:py-3 px-1 sm:px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-xs font-black scale-[1.02]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    {p.bonusPercent > 0 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-extrabold bg-amber-500 text-white px-1 sm:px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-xs">
                        +{p.bonusPercent}%
                      </span>
                    )}
                    <div className="text-xs sm:text-base font-mono font-bold">₹{p.amount.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Or Enter Custom Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomChange}
                  placeholder="Enter amount (min 100)"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Deposit Amount:</span>
                <span className="font-bold text-slate-900 font-mono">₹{currentAmountNum.toLocaleString()}</span>
              </div>

              {bonusAmount > 0 && (
                <div className="flex items-center justify-between text-amber-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Recharge Bonus ({bonusPercent}%):
                  </span>
                  <span className="font-mono">+₹{bonusAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-900 font-black text-sm">
                <span>Total Points To Be Credited Upon Approval:</span>
                <span className="font-mono text-rose-600 text-base">₹{totalCredited.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Official Merchant Payment UPI Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Official Merchant Payment UPI
              </label>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live & Verified
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs shadow-xs">
                  UPI
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Merchant UPI VPA</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-900 select-all">
                    cobclub.pay@upi
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copiedUpi ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-black">UPI Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy UPI ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STEP 3: SUBMIT UTR & SUBMIT SS (SCREENSHOT) OPTION       */}
          {/* ======================================================== */}
          <div className="bg-white p-5 rounded-3xl border-2 border-rose-300 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                  Verification &amp; Proof Submission
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Step 3: Submit UTR &amp; Payment Screenshot (SS)
                </h3>
              </div>
              <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                Required for Point Credit
              </span>
            </div>

            {/* UTR Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  12-Digit UTR / Transaction Reference Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = String(Math.floor(400000000000 + Math.random() * 599999999999));
                    setUtrInput(sample);
                    playSound('click');
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  Generate Sample UTR
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => {
                    setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                    setFormError('');
                  }}
                  placeholder="e.g. 423891029384 (from PhonePe, GPay, Paytm, Bank)"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 font-mono text-sm font-bold placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all uppercase"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Found on your payment app receipt under &quot;UTR&quot;, &quot;UPI Ref No.&quot;, or &quot;Bank Ref ID&quot;.
              </span>
            </div>

            {/* Submit SS (Screenshot) Option */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                  Submit Screenshot (SS Proof)
                </label>
                <button
                  type="button"
                  onClick={handleUseDemoScreenshot}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                >
                  Use Demo Payment Receipt SS
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
              />

              {screenshotData ? (
                /* Screenshot Preview Card */
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={screenshotData}
                      alt="Uploaded Screenshot Proof"
                      className="w-14 h-14 object-cover rounded-xl border border-emerald-300 shadow-xs cursor-pointer hover:opacity-90"
                      onClick={() => setLightboxImage(screenshotData)}
                    />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Screenshot Attached!
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[200px] sm:max-w-xs font-mono mt-0.5">
                        {screenshotFileName || 'payment_screenshot.jpg'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLightboxImage(screenshotData)}
                        className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Click to view full screenshot
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Change SS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotData('');
                        setScreenshotFileName('');
                      }}
                      className="w-8 h-8 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center cursor-pointer"
                      title="Remove screenshot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Button Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70 hover:bg-rose-50/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Click to Upload Payment Screenshot (SS)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, WEBP receipts from GPay, PhonePe, Paytm, or Bank App.
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Verification Rule Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Deposit Policy: Only persona who deposit money get balance added</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Balance points are credited to your login account <strong>only when the administrator approves your deposit</strong> after verifying your submitted UTR &amp; Screenshot.
              </p>
            </div>

            {/* Submit Action Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSubmitDepositWithProof}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-rose-600/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting UTR &amp; SS Proof...</span>
                </div>
              ) : (
                <span>Submit UTR &amp; SS Proof (₹{totalCredited.toLocaleString()} Points)</span>
              )}
            </button>
          </div>

          {/* User's Recent Deposit Records */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Your Deposit History &amp; Approval Status
              </h3>
              <span className="text-xs font-bold text-slate-400">{depositRecords.length} Records</span>
            </div>

            {depositRecords.length > 0 ? (
              <div className="space-y-2.5">
                {depositRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          rec.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {rec.status === 'Completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : rec.status === 'Rejected' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4 animate-spin" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900">{rec.id}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-black uppercase ${
                              rec.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : rec.status === 'Rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}
                          >
                            {rec.status === 'Completed'
                              ? 'Approved & Credited'
                              : rec.status === 'Rejected'
                              ? 'Rejected'
                              : 'Pending Admin Approval'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>Channel: {rec.method}</span>
                          {rec.utr && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-slate-700 font-bold">UTR: {rec.utr}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(rec.timestamp).toLocaleString()}</span>
                        </div>

                        {rec.rejectedReason && (
                          <div className="text-[11px] text-red-600 font-bold mt-1">
                            Reason: {rec.rejectedReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      {rec.screenshot && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(rec.screenshot!)}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View SS</span>
                        </button>
                      )}

                      <div className="text-right">
                        <div className="font-black text-slate-900 font-mono text-sm sm:text-base">
                          ₹{rec.totalCredit.toLocaleString()} Points
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Base ₹{rec.amount} + Bonus ₹{rec.bonus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                No recharge orders submitted yet. Fill in the form above to submit your first deposit!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADMIN APPROVAL DESK (OWNER ONLY)                  */}
      {/* ======================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Admin KPI Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                Total Submissions
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {masterDepositRequests.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Across all players</span>
            </div>

            <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">
                Pending Approval
              </span>
              <div className="text-2xl font-black font-mono text-amber-700 mt-1">
                {masterDepositRequests.filter((d) => d.status === 'Pending').length}
              </div>
              <span className="text-[11px] text-amber-600 mt-0.5 block">Action required</span>
            </div>

            <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-700 block tracking-wider">
                Total Approved
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {masterDepositRequests.filter((d) => d.status === 'Completed').length}
              </div>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">Points credited</span>
            </div>

            <div className="p-4 rounded-3xl bg-red-50 border border-red-200 shadow-xs">
              <span className="text-[10px] font-black uppercase text-red-700 block tracking-wider">
                Total Rejected
              </span>
              <div className="text-2xl font-black font-mono text-red-700 mt-1">
                {masterDepositRequests.filter((d) => d.status === 'Rejected').length}
              </div>
              <span className="text-[11px] text-red-600 mt-0.5 block">Invalid UTR/proof</span>
            </div>
          </div>

          {/* Search, Filter & Sync Control Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search UTR, Member ID, or Phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Sync Cloud Button */}
              <button
                type="button"
                onClick={handleSyncAdmin}
                disabled={isSyncingAdmin}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingAdmin ? 'animate-spin' : ''}`} />
                <span>{isSyncingAdmin ? 'Syncing...' : 'Sync Cloud Deposits'}</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs font-bold">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setAdminFilter('all')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  adminFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({masterDepositRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminFilter('pending')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  adminFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>Pending Approval</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px]">
                  {masterDepositRequests.filter((d) => d.status === 'Pending').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdminFilter('completed')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  adminFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Approved ({masterDepositRequests.filter((d) => d.status === 'Completed').length})
              </button>
              <button
                type="button"
                onClick={() => setAdminFilter('rejected')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  adminFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                }`}
              >
                Rejected ({masterDepositRequests.filter((d) => d.status === 'Rejected').length})
              </button>
            </div>
          </div>

          {/* Master Deposit Request Cards */}
          {filteredMasterDeposits.length > 0 ? (
            <div className="space-y-3">
              {filteredMasterDeposits.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-3xl border transition-all shadow-xs space-y-3 ${
                    req.status === 'Pending'
                      ? 'bg-white border-2 border-amber-300'
                      : req.status === 'Completed'
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                        {req.id}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        Member: <strong className="text-rose-600">{req.memberId || 'COB8892'}</strong>
                      </span>
                      {req.phoneNumber && (
                        <span className="text-slate-500 font-mono text-xs">
                          ({req.phoneNumber})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(req.timestamp).toLocaleString()}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          req.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : req.status === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        }`}
                      >
                        {req.status === 'Completed'
                          ? '✅ Approved'
                          : req.status === 'Rejected'
                          ? '❌ Rejected'
                          : '⏳ Pending Approval'}
                      </span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Amount & Bonus */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                        Recharge Amount
                      </span>
                      <div className="text-xl font-black font-mono text-rose-600 mt-0.5">
                        ₹{req.totalCredit.toLocaleString()} Points
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Base: ₹{req.amount} + Bonus: ₹{req.bonus}
                      </span>
                    </div>

                    {/* UTR Verification */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                        Submitted UTR Number
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-black text-slate-900 text-sm select-all">
                          {req.utr || 'N/A (Direct App)'}
                        </span>
                        {req.utr && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(req.utr!);
                              playSound('click');
                              alert(`UTR ${req.utr} copied to clipboard!`);
                            }}
                            className="text-[10px] text-slate-600 hover:text-slate-900 font-bold px-2 py-0.5 rounded bg-white border border-slate-200"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Method: {req.method}
                      </span>
                    </div>

                    {/* Screenshot Proof */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                          Payment Screenshot (SS)
                        </span>
                        <span className="text-[11px] text-slate-600 font-bold mt-1 block">
                          {req.screenshot ? 'Screenshot Attached' : 'No screenshot file'}
                        </span>
                      </div>

                      {req.screenshot && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(req.screenshot!)}
                          className="shrink-0 p-1 bg-white rounded-xl border border-slate-200 hover:border-rose-400 shadow-2xs group"
                        >
                          <img
                            src={req.screenshot}
                            alt="Screenshot Proof"
                            className="w-12 h-12 object-cover rounded-lg group-hover:opacity-90"
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rejection Reason Notice */}
                  {req.rejectedReason && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                      Rejection Reason: {req.rejectedReason}
                    </div>
                  )}

                  {/* Approval Actions (for Pending requests) */}
                  {req.status === 'Pending' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveDeposit(req.id)}
                        className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Approve &amp; Credit ₹{req.totalCredit.toLocaleString()} Points to Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRejectDialog(req.id)}
                        className="w-full sm:w-auto py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject Request</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-xs text-slate-400">
              <Crown className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No deposit records match your filter</h3>
              <p className="text-xs text-slate-500 mt-1">
                Player deposit submissions will appear here for verification and point crediting.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: DEPOSIT REQUEST SUBMITTED CONFIRMATION MODAL    */}
      {/* ======================================================== */}
      {submittedModal.isOpen && submittedModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-xs">
              <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 font-display">
              Deposit Submitted for Approval!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your payment proof &amp; UTR have been sent to our administrator for verification.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Transaction Ref ID:</span>
                <span className="font-mono font-bold text-slate-900">{submittedModal.record.id}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Submitted UTR:</span>
                <span className="font-mono font-bold text-slate-900">{submittedModal.record.utr}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Deposit Amount:</span>
                <span className="font-mono font-bold text-slate-900">₹{submittedModal.record.amount}</span>
              </div>
              {submittedModal.record.bonus > 0 && (
                <div className="flex items-center justify-between text-amber-700 font-bold">
                  <span>Extra Bonus:</span>
                  <span className="font-mono">+₹{submittedModal.record.bonus}</span>
                </div>
              )}
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between font-black text-slate-900 text-sm">
                <span>Points to be Credited:</span>
                <span className="font-mono text-rose-600 text-base">
                  ₹{submittedModal.record.totalCredit.toLocaleString()} Points
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Points will appear in your balance once approved by admin.</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSubmittedModal({ isOpen: false, record: null });
                  setActiveTab('admin');
                }}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4 text-slate-950" />
                <span>Go to Admin Approval Desk to Approve (Owner)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSubmittedModal({ isOpen: false, record: null });
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close &amp; Check My Transactions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: LIGHTBOX SCREENSHOT PREVIEW MODAL               */}
      {/* ======================================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 p-2 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 text-white border-b border-slate-800">
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                Payment Screenshot Proof
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxImage}
                alt="Payment proof screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-2xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: REJECT DEPOSIT DIALOG                           */}
      {/* ======================================================== */}
      {rejectDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 border border-slate-200 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                <XCircle className="w-5 h-5" />
                <span>Reject Deposit Request</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectDialog({ isOpen: false, depositId: '', reason: '' })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select or enter the reason for rejecting deposit <strong>{rejectDialog.depositId}</strong>. No points will be added to the player account.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">
                Rejection Reason
              </label>
              <select
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Invalid or unverified UTR number">Invalid or unverified UTR number</option>
                <option value="Screenshot proof mismatch or fake receipt">Screenshot proof mismatch or fake receipt</option>
                <option value="Payment not received in merchant account">Payment not received in merchant account</option>
                <option value="Amount paid does not match requested amount">Amount paid does not match requested amount</option>
                <option value="Duplicate UTR submitted">Duplicate UTR submitted</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialog({ isOpen: false, depositId: '', reason: '' })}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
