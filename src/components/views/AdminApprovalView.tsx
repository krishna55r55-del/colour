import React, { useState } from 'react';
import {
  ArrowLeft,
  Crown,
  Check,
  X,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Eye,
  Wallet,
  Lock,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { DepositRecord } from '../../types';

export const AdminApprovalView: React.FC = () => {
  const {
    masterDepositRequests,
    approveDepositRequest,
    rejectDepositRequest,
    refreshMasterDeposits,
    playSound,
    setActiveView,
  } = useGame();

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('cobclub_admin_session') === 'true';
  });
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    depositId: string;
    memberId: string;
    reason: string;
  }>({
    isOpen: false,
    depositId: '',
    memberId: '',
    reason: 'Invalid or unverified UTR number',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUnlockAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = pinEntry.trim();
    if (pin === '8892' || pin === 'admin123' || pin.toLowerCase() === 'admin') {
      try {
        sessionStorage.setItem('cobclub_admin_session', 'true');
      } catch {}
      setIsAdminUnlocked(true);
      setPinEntry('');
      setPinError('');
      playSound('jackpot');
    } else {
      setPinError('Access denied. Invalid Admin PIN. (Default PIN: 8892)');
      playSound('loss');
    }
  };

  const handleExitAdmin = () => {
    playSound('click');
    try {
      sessionStorage.removeItem('cobclub_admin_session');
    } catch {}
    setIsAdminUnlocked(false);
    setActiveView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Metrics
  const pendingDeposits = masterDepositRequests.filter((d) => d.status === 'Pending');
  const approvedDeposits = masterDepositRequests.filter((d) => d.status === 'Completed');
  const rejectedDeposits = masterDepositRequests.filter((d) => d.status === 'Rejected');
  const totalApprovedVolume = approvedDeposits.reduce((acc, d) => acc + d.totalCredit, 0);

  const handleApprove = (req: DepositRecord) => {
    playSound('jackpot');
    const res = approveDepositRequest(req.id);
    if (res.success) {
      showToast(`Deposit ${req.id} approved! ₹${req.totalCredit.toLocaleString()} points added to player ${req.memberId || ''}.`);
    } else {
      alert(res.error || 'Failed to approve deposit.');
    }
  };

  const handleOpenReject = (req: DepositRecord) => {
    playSound('click');
    setRejectDialog({
      isOpen: true,
      depositId: req.id,
      memberId: req.memberId || 'COB8892',
      reason: 'Invalid or unverified UTR number',
    });
  };

  const handleConfirmReject = () => {
    playSound('loss');
    rejectDepositRequest(rejectDialog.depositId, rejectDialog.reason);
    showToast(`Deposit ${rejectDialog.depositId} has been rejected.`);
    setRejectDialog({ isOpen: false, depositId: '', memberId: '', reason: '' });
  };

  const handleSyncCloud = async () => {
    playSound('click');
    setIsSyncing(true);
    await refreshMasterDeposits();
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Cloud deposits synced successfully!');
    }, 600);
  };

  // Filtered list
  const filteredDeposits = masterDepositRequests.filter((d) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (d.memberId && d.memberId.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      (d.phoneNumber && d.phoneNumber.includes(searchQuery.trim())) ||
      (d.utr && d.utr.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && d.status === 'Pending') ||
      (statusFilter === 'completed' && d.status === 'Completed') ||
      (statusFilter === 'rejected' && d.status === 'Rejected');

    return matchesSearch && matchesStatus;
  });

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border-2 border-amber-300 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black font-display text-slate-900">
              Admin Deposit Approval Portal
            </h2>
            <p className="text-xs text-slate-500">
              This area is restricted to the administrator for verifying and approving player recharge payments.
            </p>
          </div>

          <form onSubmit={handleUnlockAdmin} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block text-left mb-1">
                Enter Administrator Security PIN
              </label>
              <input
                type="password"
                value={pinEntry}
                onChange={(e) => {
                  setPinEntry(e.target.value);
                  if (pinError) setPinError('');
                }}
                placeholder="Enter PIN (8892)"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 text-center font-mono text-base font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
              {pinError && (
                <p className="text-xs font-semibold text-rose-500 mt-1">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-98"
            >
              Unlock Admin Portal
            </button>

            <button
              type="button"
              onClick={handleExitAdmin}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Profile
            </button>
          </form>

          <p className="text-[11px] text-slate-400 pt-1">
            Default Security PIN: <strong className="text-slate-700 font-mono">8892</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-4 duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>Profile</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Crown className="w-3.5 h-3.5" />
              </span>
              <h1 className="text-lg sm:text-xl font-black font-display text-slate-900 tracking-wide">
                Admin Deposit Approval Portal
              </h1>
              <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review player pending deposit requests, verify UTR &amp; screenshots, and approve points into their accounts.
            </p>
          </div>
        </div>

        {/* Sync & Exit Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
            title="Fetch latest deposit submissions from all players"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleExitAdmin}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Approvals */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-3xl border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/40'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">
              Pending Approval
            </span>
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 mt-1 tabular-nums">
            {pendingDeposits.length}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-0.5 block font-medium">
            Requires admin approval
          </span>
        </div>

        {/* Total Approved */}
        <div
          onClick={() => setStatusFilter('completed')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/40'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">
              Approved
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 mt-1 tabular-nums">
            {approvedDeposits.length}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block font-medium">
            Points credited
          </span>
        </div>

        {/* Total Rejected */}
        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'rejected'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-300/40'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-red-700 tracking-wider">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-red-700 mt-1 tabular-nums">
            {rejectedDeposits.length}
          </div>
          <span className="text-[11px] text-red-600/80 mt-0.5 block font-medium">
            Invalid UTR / Fake SS
          </span>
        </div>

        {/* Total Points Added */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Total Points Added
            </span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1 tabular-nums">
            ₹{totalApprovedVolume.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
            Across {approvedDeposits.length} deposits
          </span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Player ID, Phone, UTR..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Quick status tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setStatusFilter('pending');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Pending</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-black">
                {pendingDeposits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setStatusFilter('completed');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Approved ({approvedDeposits.length})
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setStatusFilter('rejected');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'rejected'
                  ? 'bg-red-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rejected ({rejectedDeposits.length})
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({masterDepositRequests.length})
            </button>
          </div>
        </div>
      </div>

      {/* Deposit Requests List */}
      {filteredDeposits.length > 0 ? (
        <div className="space-y-3.5">
          {filteredDeposits.map((req) => (
            <div
              key={req.id}
              className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs space-y-3.5 ${
                req.status === 'Pending'
                  ? 'bg-white border-2 border-amber-400 ring-2 ring-amber-300/20'
                  : req.status === 'Completed'
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-slate-200 opacity-80'
              }`}
            >
              {/* Header Row: Player Info & Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                    {req.id}
                  </span>

                  <span className="text-xs font-bold text-slate-800">
                    Player ID: <strong className="text-rose-600 font-mono">{req.memberId || 'COB8892'}</strong>
                  </span>

                  {req.phoneNumber && (
                    <span className="text-xs text-slate-500 font-mono">
                      (Mobile: +91 {req.phoneNumber})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(req.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      req.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : req.status === 'Rejected'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {req.status === 'Completed'
                      ? 'Approved & Points Credited'
                      : req.status === 'Rejected'
                      ? 'Rejected'
                      : 'Pending Approval'}
                  </span>
                </div>
              </div>

              {/* Data Grid: Points, UTR Number, Screenshot Proof */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Deposit Amount & Points to Credit */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Points To Add Upon Approval
                  </span>
                  <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                    ₹{req.totalCredit.toLocaleString()} Points
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Base: ₹{req.amount} + Bonus: ₹{req.bonus} ({req.method})
                  </span>
                </div>

                {/* 2. Submitted UTR Number */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Submitted 12-Digit UTR
                  </span>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="font-mono font-black text-slate-900 text-sm select-all">
                      {req.utr || 'N/A (Direct App)'}
                    </span>
                    {req.utr && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(req.utr!);
                          playSound('click');
                          showToast(`UTR ${req.utr} copied to clipboard!`);
                        }}
                        className="text-[10px] text-slate-700 hover:text-slate-900 font-bold px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Verify this UTR on your merchant bank/UPI statement
                  </span>
                </div>

                {/* 3. Payment Screenshot (Submit SS) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      Payment Screenshot Proof
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 mt-1 block">
                      {req.screenshot ? 'Screenshot Attached ✓' : 'No screenshot file'}
                    </span>
                    {req.screenshot && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(req.screenshot!)}
                        className="text-[10px] text-rose-600 hover:underline font-bold mt-0.5 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Click to view full image
                      </button>
                    )}
                  </div>

                  {req.screenshot ? (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(req.screenshot!)}
                      className="shrink-0 p-1 bg-white rounded-xl border border-slate-200 hover:border-rose-400 shadow-xs cursor-pointer group"
                    >
                      <img
                        src={req.screenshot}
                        alt="Proof screenshot"
                        className="w-14 h-14 object-cover rounded-lg group-hover:opacity-90"
                      />
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Note */}
              {req.rejectedReason && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  Rejection Reason: {req.rejectedReason}
                </div>
              )}

              {/* Approval Date Stamp */}
              {req.approvedAt && (
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approved on {new Date(req.approvedAt).toLocaleString()}</span>
                </div>
              )}

              {/* ADMIN ACTION BUTTONS (For Pending deposits only) */}
              {req.status === 'Pending' && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req)}
                    className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Approve &amp; Add ₹{req.totalCredit.toLocaleString()} Points to Player</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReject(req)}
                    className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Deposit</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl bg-white border border-slate-200 shadow-xs text-slate-400">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No deposit records match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">
            When players submit recharge orders with UTR &amp; screenshots, they will appear here for your approval.
          </p>
        </div>
      )}

      {/* Lightbox Screenshot Modal */}
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
                Player Submitted Payment Screenshot Proof
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

      {/* Reject Reason Dialog */}
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
                onClick={() => setRejectDialog({ isOpen: false, depositId: '', memberId: '', reason: '' })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting deposit <strong>{rejectDialog.depositId}</strong> for player <strong>{rejectDialog.memberId}</strong>. No points will be added to their account.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">
                Select Rejection Reason
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
                onClick={() => setRejectDialog({ isOpen: false, depositId: '', memberId: '', reason: '' })}
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
