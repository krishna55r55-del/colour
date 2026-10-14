import React, { useState } from 'react';
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
} from 'lucide-react';
import { useGame } from '../../context/GameContext';

interface DepositRecord {
  id: string;
  amount: number;
  bonus: number;
  method: string;
  date: string;
  status: 'Completed' | 'Pending';
}

export const DepositView: React.FC = () => {
  const { balance, user, deposit, playSound, setActiveView, selectGame } = useGame();

  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'paytm' | 'bank' | 'usdt'>('upi');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('1000');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    amount: number;
    bonus: number;
    txnId: string;
  }>({
    isOpen: false,
    amount: 0,
    bonus: 0,
    txnId: '',
  });

  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([
    {
      id: 'DEP8829104',
      amount: 1000,
      bonus: 50,
      method: 'UPI Instant',
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Completed',
    },
    {
      id: 'DEP7749182',
      amount: 500,
      bonus: 10,
      method: 'Paytm QR',
      date: 'Yesterday, 14:22',
      status: 'Completed',
    },
  ]);

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
  const bonusPercent = currentPreset ? currentPreset.bonusPercent : currentAmountNum >= 10000 ? 10 : currentAmountNum >= 1000 ? 5 : 0;
  const bonusAmount = Math.round((currentAmountNum * bonusPercent) / 100);
  const totalCredited = currentAmountNum + bonusAmount;

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

  const handleConfirmDeposit = () => {
    if (currentAmountNum < 100) {
      alert('Minimum deposit amount is ₹100.');
      return;
    }

    playSound('click');
    setIsProcessing(true);

    setTimeout(() => {
      deposit(totalCredited);
      setIsProcessing(false);
      const txnId = 'DEP' + Math.floor(1000000 + Math.random() * 9000000);

      setDepositRecords((prev) => [
        {
          id: txnId,
          amount: currentAmountNum,
          bonus: bonusAmount,
          method: selectedMethod.toUpperCase(),
          date: 'Just now',
          status: 'Completed',
        },
        ...prev,
      ]);

      setSuccessModal({
        isOpen: true,
        amount: currentAmountNum,
        bonus: bonusAmount,
        txnId,
      });
    }, 900);
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
          Deposit & Recharge
        </h1>

        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Instant</span>
        </div>
      </div>

      {/* Wallet Balance Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#e52e2e] via-[#f53b3b] to-[#ff5252] text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-white/90 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Available Balance
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
              <Zap className="w-3.5 h-3.5 fill-current" />
              24/7 Automated Processing
            </span>
          </div>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Payment Channel Selection */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
          Select Deposit Channel
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
            Recharge Amount
          </label>
          <span className="text-xs font-bold text-slate-400">
            Min: ₹100 · Max: ₹100,000
          </span>
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
                Extra Recharge Bonus ({bonusPercent}%):
              </span>
              <span className="font-mono">+₹{bonusAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-900 font-black text-sm">
            <span>Total To Be Credited:</span>
            <span className="font-mono text-rose-600 text-base">₹{totalCredited.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Details / UPI Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
          Official Merchant Payment UPI
        </label>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
              UPI
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Merchant VPA</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">cobclub.pay@upi</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyUpi}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            {copiedUpi ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Big Action Button */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleConfirmDeposit}
        className="w-full py-4 rounded-full bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-rose-600/25 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing Deposit...</span>
          </div>
        ) : (
          <span>Confirm & Deposit ₹{totalCredited.toLocaleString()}</span>
        )}
      </button>

      {/* Safety & Instructions */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>Deposit Guidelines</span>
        </div>
        <p>1. Payments are authenticated instantly via UPI and wallet network.</p>
        <p>2. Funds will be credited directly to your total balance immediately.</p>
        <p>3. In case of delay, refresh your balance from Color Prediction lobby.</p>
      </div>

      {/* Recent Deposit Records */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500" />
          Recent Deposit Transactions
        </h3>

        <div className="space-y-2">
          {depositRecords.map((rec) => (
            <div
              key={rec.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-800 font-mono">{rec.id}</div>
                <div className="text-[11px] text-slate-400">{rec.method} · {rec.date}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 font-mono text-sm">
                  +₹{(rec.amount + rec.bonus).toLocaleString()}
                </div>
                <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                  {rec.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 font-display">
              Deposit Successful!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your wallet has been credited instantly.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Credited
              </span>
              <div className="text-3xl font-black font-mono text-emerald-600 mt-1">
                +₹{(successModal.amount + successModal.bonus).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-700 mt-1 block">
                Txn Ref: {successModal.txnId}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSuccessModal({ isOpen: false, amount: 0, bonus: 0, txnId: '' });
                  selectGame('color-prediction');
                }}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:from-rose-500 hover:to-red-400 transition-all cursor-pointer"
              >
                Play Win Go Color Prediction
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setSuccessModal({ isOpen: false, amount: 0, bonus: 0, txnId: '' });
                }}
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close & Stay on Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
