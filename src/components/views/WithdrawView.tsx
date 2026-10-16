import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Wallet,
  Building,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Zap,
  ArrowRight,
  RotateCcw,
  Check,
  Edit2,
  Lock,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { BankAccountDetails } from '../../types';

const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Canara Bank',
];

export const WithdrawView: React.FC = () => {
  const {
    balance,
    user,
    savedBankDetails,
    saveBankDetails,
    withdrawRecords,
    submitWithdrawal,
    playSound,
    setActiveView,
    selectGame,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');

  // Bank Form State
  const [isEditingBank, setIsEditingBank] = useState<boolean>(!savedBankDetails);
  const [accountHolderName, setAccountHolderName] = useState<string>(
    savedBankDetails?.accountHolderName || ''
  );
  const [bankName, setBankName] = useState<string>(
    savedBankDetails?.bankName || 'State Bank of India'
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    savedBankDetails?.accountNumber || ''
  );
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>(
    savedBankDetails?.accountNumber || ''
  );
  const [ifscCode, setIfscCode] = useState<string>(savedBankDetails?.ifscCode || '');
  const [upiId, setUpiId] = useState<string>(savedBankDetails?.upiId || '');
  const [bankFormError, setBankFormError] = useState<string>('');
  const [bankSavedToast, setBankSavedToast] = useState<boolean>(false);

  // Withdrawal Amount State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('500');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Confirmation Modal
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    amount: number;
    txnId: string;
    bankName: string;
    accountMasked: string;
  }>({
    isOpen: false,
    amount: 0,
    txnId: '',
    bankName: '',
    accountMasked: '',
  });

  useEffect(() => {
    if (savedBankDetails) {
      setAccountHolderName(savedBankDetails.accountHolderName);
      setBankName(savedBankDetails.bankName);
      setAccountNumber(savedBankDetails.accountNumber);
      setConfirmAccountNumber(savedBankDetails.accountNumber);
      setIfscCode(savedBankDetails.ifscCode);
      setUpiId(savedBankDetails.upiId || '');
    }
  }, [savedBankDetails]);

  const presetAmounts = [200, 500, 1000, 2000, 5000, 10000, 20000];

  const handleSelectPreset = (amt: number) => {
    playSound('click');
    setWithdrawAmount(amt);
    setCustomAmount(amt.toString());
    setWithdrawError('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmount(val);
    const parsed = parseInt(val, 10) || 0;
    setWithdrawAmount(parsed);
    setWithdrawError('');
  };

  const handleSaveBankForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBankFormError('');

    if (!accountHolderName.trim()) {
      setBankFormError('Please enter account holder name.');
      return;
    }
    if (!bankName.trim()) {
      setBankFormError('Please select or specify bank name.');
      return;
    }
    if (accountNumber.trim().length < 9) {
      setBankFormError('Please enter a valid bank account number (at least 9 digits).');
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setBankFormError('Bank account numbers do not match.');
      return;
    }
    if (ifscCode.trim().length < 8) {
      setBankFormError('Please enter a valid IFSC code (e.g. SBIN0001234).');
      return;
    }

    const details: BankAccountDetails = {
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      upiId: upiId.trim() || undefined,
      phoneNumber: user?.phoneNumber,
    };

    saveBankDetails(details);
    setIsEditingBank(false);
    setBankSavedToast(true);
    setTimeout(() => setBankSavedToast(false), 3000);
  };

  const handleConfirmWithdrawal = () => {
    setWithdrawError('');

    // Ensure bank details exist
    if (!savedBankDetails && isEditingBank) {
      setWithdrawError('Please save and verify your bank account details first.');
      return;
    }

    const currentBank: BankAccountDetails = savedBankDetails || {
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      upiId: upiId.trim() || undefined,
      phoneNumber: user?.phoneNumber,
    };

    if (withdrawAmount < 200) {
      setWithdrawError('Minimum withdrawal amount is ₹200.');
      return;
    }
    if (withdrawAmount > 50000) {
      setWithdrawError('Maximum single withdrawal limit is ₹50,000.');
      return;
    }
    if (balance < withdrawAmount) {
      setWithdrawError('Insufficient available wallet balance.');
      return;
    }

    setIsSubmitting(true);
    playSound('click');

    setTimeout(() => {
      const res = submitWithdrawal(withdrawAmount, currentBank);
      setIsSubmitting(false);

      if (res.success && res.record) {
        setSuccessModal({
          isOpen: true,
          amount: res.record.amount,
          txnId: res.record.id,
          bankName: res.record.bankName,
          accountMasked: res.record.accountNumberMasked,
        });
      } else {
        setWithdrawError(res.error || 'Failed to submit withdrawal request.');
      }
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
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

        <h1 className="text-base sm:text-lg font-black font-display text-slate-900 tracking-wide">
          Withdrawal
        </h1>

        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Payout</span>
        </div>
      </div>

      {/* Tabs: Withdraw | Payout Records */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveTab('withdraw');
          }}
          className={`py-2.5 rounded-xl transition-all cursor-pointer font-black text-center ${
            activeTab === 'withdraw'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Withdraw Funds
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setActiveTab('history');
          }}
          className={`py-2.5 rounded-xl transition-all cursor-pointer font-black text-center ${
            activeTab === 'history'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Withdrawal History ({withdrawRecords.length})
        </button>
      </div>

      {activeTab === 'withdraw' && (
        <div className="space-y-5">
          {/* Wallet Balance Hero Card (Amber / Gold theme for payouts) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-white/90 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  Available For Withdrawal
                </span>
                <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full border border-white/25">
                  0% Fee Direct Payout
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums drop-shadow-sm mb-4">
                ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="flex items-center justify-between text-xs text-white/90 pt-3 border-t border-white/20">
                <span>Member ID: {user?.memberId || 'COB8892'}</span>
                <span className="flex items-center gap-1 font-bold text-slate-900 bg-white/80 px-2 py-0.5 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                  Instant IMPS / NEFT
                </span>
              </div>
            </div>

            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </div>

          {/* Section: Bank Account Details Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Bank Account Details
                  </h2>
                  <span className="text-[11px] text-slate-400 block">
                    Account used for instant payment transfers
                  </span>
                </div>
              </div>

              {savedBankDetails && !isEditingBank && (
                <button
                  type="button"
                  onClick={() => setIsEditingBank(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                >
                  <Edit2 className="w-3 h-3 text-rose-500" />
                  <span>Modify</span>
                </button>
              )}
            </div>

            {/* Saved Bank Details Card Preview */}
            {savedBankDetails && !isEditingBank ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    {savedBankDetails.bankName}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    ✓ Verified Account
                  </span>
                </div>

                <div className="pt-2 font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-100">
                  •••• •••• •••• {savedBankDetails.accountNumber.slice(-4)}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60">
                  <div>
                    <span className="text-[10px] block uppercase text-slate-500">Account Holder</span>
                    <span className="text-slate-200 font-bold">{savedBankDetails.accountHolderName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block uppercase text-slate-500">IFSC Code</span>
                    <span className="text-amber-300 font-mono font-bold">{savedBankDetails.ifscCode}</span>
                  </div>
                </div>

                {savedBankDetails.upiId && (
                  <div className="text-[11px] text-slate-400 pt-1">
                    UPI ID: <span className="text-slate-200 font-mono font-medium">{savedBankDetails.upiId}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Editable Bank Details Form */
              <form onSubmit={handleSaveBankForm} className="space-y-3.5">
                {bankFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bankFormError}</span>
                  </div>
                )}

                {/* Account Holder Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Enter full name as per bank records"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Bank Name Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                    Bank Name *
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer mb-1.5"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="Other Bank">Other Bank (specify)</option>
                  </select>

                  {bankName === 'Other Bank' && (
                    <input
                      type="text"
                      placeholder="Type your bank name here"
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                    />
                  )}
                </div>

                {/* Account Number & Confirm Account Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 10023456789"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      Confirm Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Re-enter bank account number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* IFSC Code & Optional UPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs sm:text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. name@upi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    Save Bank Details
                  </button>

                  {savedBankDetails && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBank(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {bankSavedToast && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Bank account details saved successfully.</span>
              </div>
            )}
          </div>

          {/* Section: Withdrawal Amount */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Withdrawal Amount
              </label>
              <button
                type="button"
                onClick={() => {
                  const maxAllowed = Math.min(balance, 50000);
                  if (maxAllowed > 0) {
                    handleSelectPreset(maxAllowed);
                  }
                }}
                className="text-xs font-black text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Withdraw All (₹{balance.toLocaleString()})
              </button>
            </div>

            {/* Quick Amount Tiles */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {presetAmounts.map((amt) => {
                const isSelected = withdrawAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectPreset(amt)}
                    className={`py-2.5 sm:py-3 px-1 sm:px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-xs font-black scale-[1.02]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="text-xs sm:text-base font-mono font-bold">₹{amt.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Or Enter Custom Amount (Min ₹200 · Max ₹50,000)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter amount to withdraw"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Summary Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Requested Amount:</span>
                <span className="font-bold text-slate-900 font-mono">₹{withdrawAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Handling Fee:</span>
                <span className="font-bold text-emerald-600 font-mono">₹0 (Free)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-900 font-black text-sm">
                <span>Actual Credit To Bank:</span>
                <span className="font-mono text-amber-600 text-base">₹{withdrawAmount.toLocaleString()}</span>
              </div>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmWithdrawal}
              className="w-full py-4 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-amber-500/25 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Withdrawal...</span>
                </div>
              ) : (
                <span>Confirm & Withdraw ₹{withdrawAmount.toLocaleString()}</span>
              )}
            </button>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Withdrawal Rules & Instructions</span>
            </div>
            <p>1. Withdrawals are processed 24/7 via automated banking gateway.</p>
            <p>2. Please verify your Account Number and IFSC Code carefully to avoid bank rejection.</p>
            <p>3. Funds typically reflect in your bank account within 2–15 minutes.</p>
          </div>
        </div>
      )}

      {/* Tab: Withdrawal Records History */}
      {activeTab === 'history' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Withdrawal Transactions
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              Total {withdrawRecords.length}
            </span>
          </div>

          {withdrawRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No withdrawal records yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {withdrawRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">{rec.id}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          rec.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {rec.status === 'Completed' ? '✓ Completed' : '⏳ Processing'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {rec.bankName} ({rec.accountNumberMasked}) · {new Date(rec.timestamp).toLocaleDateString()} {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="font-black text-slate-900 font-mono text-sm sm:text-base text-rose-600">
                      -₹{rec.amount.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Account: {rec.accountHolderName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 font-display">
              Withdrawal Submitted!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your payout request has been queued for instant bank transfer.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Payout Amount
              </span>
              <div className="text-3xl font-black font-mono text-amber-600">
                ₹{successModal.amount.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-600 pt-1">
                Bank: <span className="font-bold">{successModal.bankName}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Acc: {successModal.accountMasked} · Txn: {successModal.txnId}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSuccessModal({ isOpen: false, amount: 0, txnId: '', bankName: '', accountMasked: '' });
                  selectGame('color-prediction');
                }}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:from-rose-500 hover:to-red-400 transition-all cursor-pointer"
              >
                Back to Color Prediction
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSuccessModal({ isOpen: false, amount: 0, txnId: '', bankName: '', accountMasked: '' });
                  setActiveTab('history');
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                View Withdrawal History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
