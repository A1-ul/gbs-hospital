import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import {
  CreditCard, PlusCircle, RefreshCw, Search, CheckCircle, DollarSign,
  Building2, Smartphone, ShieldCheck, FileText, Printer, AlertTriangle,
  RotateCcw, Download, ExternalLink, XCircle, Clock
} from 'lucide-react';

const STATUS_STYLE_MAP = {
  CREATED: { bg: 'rgba(148,163,184,0.18)', color: '#cbd5e1', border: 'rgba(148,163,184,0.4)' },
  PENDING: { bg: 'rgba(245,158,11,0.16)', color: '#fbbf24', border: 'rgba(245,158,11,0.45)' },
  REQUIRES_CUSTOMER_ACTION: { bg: 'rgba(56,189,248,0.18)', color: '#38bdf8', border: 'rgba(56,189,248,0.45)' },
  PROCESSING: { bg: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: 'rgba(99,102,241,0.45)' },
  UNDER_REVIEW: { bg: 'rgba(245,158,11,0.18)', color: '#fcd34d', border: 'rgba(245,158,11,0.5)' },
  SUCCESSFUL: { bg: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: 'rgba(16,185,129,0.5)' },
  FAILED: { bg: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: 'rgba(239,68,68,0.45)' },
  CANCELLED: { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', border: 'rgba(148,163,184,0.4)' },
  EXPIRED: { bg: 'rgba(239,68,68,0.14)', color: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
  REVERSED: { bg: 'rgba(249,115,22,0.18)', color: '#fdba74', border: 'rgba(249,115,22,0.45)' },
  REFUNDED: { bg: 'rgba(168,85,247,0.18)', color: '#d8b4fe', border: 'rgba(168,85,247,0.45)' }
};

const MOMO_PREFIX_RULES = {
  MTN_MOMO: ['024', '054', '055', '059', '025'],
  TELECEL_CASH: ['020', '050'],
  AT_MONEY: ['026', '027', '056', '057']
};

const SUBSCRIPTION_PLANS = [
  { id: 'MONTHLY', label: 'Monthly Hospital Subscription', defaultAmount: 1500 },
  { id: 'ANNUAL', label: 'Annual Hospital Subscription', defaultAmount: 15000 },
  { id: 'ACTIVATION', label: 'System Activation & Onboarding', defaultAmount: 2500 },
  { id: 'ADDON_SERVICE', label: 'Approved Additional GBS Service', defaultAmount: 500 }
];

function validateGhanaPhoneClient(raw, method) {
  const cleaned = String(raw || '').replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Enter a 10-digit Ghanaian Mobile Money number.';
  let local = cleaned;
  if (local.startsWith('+233')) local = `0${local.slice(4)}`;
  else if (local.startsWith('233') && local.length === 12) local = `0${local.slice(3)}`;
  if (!/^0[25]\d{8}$/.test(local)) {
    return 'Phone must be a valid 10-digit Ghanaian mobile number (e.g., 024XXXXXXX or 055XXXXXXX).';
  }
  const prefixes = MOMO_PREFIX_RULES[method];
  if (prefixes && !prefixes.includes(local.slice(0, 3))) {
    return `Prefix ${local.slice(0, 3)} does not match ${method.replace(/_/g, ' ')} (${prefixes.join(', ')}).`;
  }
  return null;
}

function StatusPill({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  const s = STATUS_STYLE_MAP[key] || STATUS_STYLE_MAP.PENDING;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '999px',
        fontSize: '0.68rem',
        fontWeight: 800,
        letterSpacing: '0.03em',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {key.replace(/_/g, ' ')}
    </span>
  );
}

export default function BillingPaymentsView({ onNavigateDetail }) {
  const [activeTab, setActiveTab] = useState('BILLING_CHECKOUT');
  const [stats, setStats] = useState(null);
  const [annualReport, setAnnualReport] = useState(null);
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [providersData, setProvidersData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentReports, setPaymentReports] = useState(null);
  const [txStatusFilter, setTxStatusFilter] = useState('ALL');

  const [invoiceForm, setInvoiceForm] = useState({
    description: 'Outpatient Consultation & Diagnostics',
    amount: '150',
    category: 'CONSULTATION'
  });

  // Legacy Hospital Cashier Cash Receipt Drawer
  const [cashierBill, setCashierBill] = useState(null);
  const [cashierForm, setCashierForm] = useState({
    amountPaid: '',
    paymentMethod: 'CASH',
    transactionRef: ''
  });

  // Multi-Gateway Checkout Drawer
  const [gatewayBill, setGatewayBill] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    paymentMethod: 'BANK_DEPOSIT',
    amount: '',
    phone: '',
    payerName: '',
    payerEmail: '',
    bankName: 'GCB Bank',
    bankDepositSlipRef: ''
  });
  const [activePaymentResult, setActivePaymentResult] = useState(null);

  // Official Printable Receipt Panel
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Hospital Admin -> GBS Developer Subscription Form (Destination: 0554594193)
  const [subForm, setSubForm] = useState({
    planType: 'MONTHLY',
    amount: '1500',
    paymentMethod: 'MTN_MOMO',
    phone: '',
    transferReference: '',
    bankName: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [s, b, a, p, prov, txRes, rep] = await Promise.all([
        api.getBillingStats().catch(() => null),
        api.getBills().catch(() => []),
        api.getAnnualFinancialReport().catch(() => null),
        api.searchMPI(patientSearch).catch(() => []),
        api.getPaymentProviders().catch(() => null),
        api.getPaymentTransactions('limit=100').catch(() => ({ transactions: [] })),
        api.getPaymentReports().catch(() => null)
      ]);
      setStats(s);
      setBills(Array.isArray(b) ? b : (b?.bills || b?.items || []));
      setAnnualReport(a);
      setPatients(Array.isArray(p) ? p : (p?.patients || p?.data || []));
      setProvidersData(prov);
      setTransactions(Array.isArray(txRes?.transactions) ? txRes.transactions : (Array.isArray(txRes) ? txRes : []));
      setPaymentReports(rep);
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBillPayable = (b) => Number(b.patientPayableAmount ?? b.totalAmount ?? b.grossAmount ?? b.amount ?? 0);
  const getBillPaid = (b) => Number(b.paidAmount ?? b.amountPaid ?? 0);
  const getBillBalance = (b) => {
    if (b.balanceDue !== undefined && b.balanceDue !== null) return Number(b.balanceDue);
    return Math.max(0, getBillPayable(b) - getBillPaid(b));
  };
  const getBillStatus = (b) => String(b.paymentStatus || b.status || 'UNPAID').toUpperCase();

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Please select a patient first to issue a hospital invoice.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const amt = Number(invoiceForm.amount) || 0;
      await api.createInvoice({
        patientId: selectedPatient.id,
        items: [
          {
            description: invoiceForm.description,
            category: invoiceForm.category,
            quantity: 1,
            unitPrice: amt
          }
        ]
      });
      setFeedback({
        type: 'success',
        msg: `Hospital invoice created for ${selectedPatient.firstName} ${selectedPatient.lastName} (GHS ${amt.toFixed(2)}).`
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCashierConfirm = async (e) => {
    e.preventDefault();
    if (!cashierBill) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.recordPayment(cashierBill.id, {
        amount: Number(cashierForm.amountPaid || getBillBalance(cashierBill)),
        paymentMethod: cashierForm.paymentMethod,
        referenceNumber: cashierForm.transactionRef || `CASH-${Date.now()}`
      });
      setFeedback({
        type: 'success',
        msg: `Hospital cashier receipt issued via ${cashierForm.paymentMethod} (Receipt: ${res?.receiptNumber || res?.payment?.receiptNumber || 'Issued'}).`
      });
      setCashierBill(null);
      setCashierForm({ amountPaid: '', paymentMethod: 'CASH', transactionRef: '' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateGatewayPayment = async (e) => {
    e.preventDefault();
    if (!gatewayBill) return;
    setFeedback(null);

    const method = gatewayForm.paymentMethod;
    const isMomo = Boolean(MOMO_PREFIX_RULES[method]);
    if (isMomo) {
      const phoneErr = validateGhanaPhoneClient(gatewayForm.phone, method);
      if (phoneErr) {
        setFeedback({ type: 'error', msg: phoneErr });
        return;
      }
    }

    const amountVal = Number(gatewayForm.amount || getBillBalance(gatewayBill));
    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      setFeedback({ type: 'error', msg: 'Enter a valid payment amount greater than GHS 0.00.' });
      return;
    }

    setLoading(true);
    try {
      let res;
      if (method === 'BANK_DEPOSIT' && gatewayForm.bankDepositSlipRef.trim()) {
        res = await api.submitBankDepositProof({
          billId: gatewayBill.id,
          amount: amountVal,
          paymentMethod: 'BANK_DEPOSIT',
          bankName: gatewayForm.bankName,
          bankDepositSlipRef: gatewayForm.bankDepositSlipRef.trim(),
          payerName: gatewayForm.payerName || undefined
        });
      } else {
        res = await api.initiatePayment({
          billId: gatewayBill.id,
          amount: amountVal,
          paymentMethod: method,
          phone: isMomo ? gatewayForm.phone.trim() : undefined,
          payerName: gatewayForm.payerName || undefined,
          payerEmail: gatewayForm.payerEmail || undefined,
          bankName: method.startsWith('BANK') ? gatewayForm.bankName : undefined,
          bankDepositSlipRef: gatewayForm.bankDepositSlipRef.trim() || undefined
        });
      }

      const tx = res?.transaction || res;
      setActivePaymentResult(tx);
      setFeedback({
        type: 'success',
        msg: `Payment reference ${tx?.transactionRef} created with status "${tx?.status}". Confirmation updates automatically only after verified settlement.`
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
      if (err?.data?.data?.transaction) {
        setActivePaymentResult(err.data.data.transaction);
      }
      loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransaction = async (reference) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.verifyPaymentTransaction(reference);
      if (res?.transaction) setActivePaymentResult(res.transaction);
      setFeedback({
        type: res?.verified ? 'success' : 'error',
        msg: res?.verified
          ? `Verified & settled! Official Receipt: ${res?.transaction?.receiptNumber || 'Issued'}.`
          : (res?.reason || res?.message || 'Payment is still awaiting confirmation from the provider.')
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransaction = async (reference) => {
    setLoading(true);
    setFeedback(null);
    try {
      const cancelled = await api.cancelPaymentTransaction(reference, { reason: 'Cancelled by user to switch method' });
      setActivePaymentResult(cancelled);
      setFeedback({ type: 'success', msg: `Pending transaction ${reference} cancelled safely. You may select another method.` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBankDeposit = async (tx, decision) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.verifyBankDeposit(tx.id, {
        decision,
        verifiedReference: tx.bankDepositSlipRef || tx.transactionRef,
        notes: decision === 'APPROVE' ? 'Verified against hospital bank statement' : 'Deposit reference not matched on bank statement'
      });
      setFeedback({
        type: decision === 'APPROVE' ? 'success' : 'error',
        msg: decision === 'APPROVE'
          ? `Bank deposit ${tx.transactionRef} verified & settled (Receipt: ${res?.transaction?.receiptNumber || 'Issued'}).`
          : `Bank deposit ${tx.transactionRef} rejected and marked FAILED.`
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRefundTransaction = async (tx) => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.refundPaymentTransaction(tx.id, {
        amount: Number(tx.amount),
        reason: 'Authorized Hospital Accountant refund'
      });
      setFeedback({
        type: 'success',
        msg: `Refund processed for ${tx.transactionRef} (GHS ${Number(tx.amount).toFixed(2)}) and bill balance recalculated.`
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOfficialReceipt = async (reference) => {
    setLoading(true);
    setFeedback(null);
    try {
      const receipt = await api.getPaymentReceipt(reference);
      setActiveReceipt(receipt);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeveloperSubscription = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (MOMO_PREFIX_RULES[subForm.paymentMethod] && subForm.phone.trim()) {
      const errMsg = validateGhanaPhoneClient(subForm.phone, subForm.paymentMethod);
      if (errMsg) {
        setFeedback({ type: 'error', msg: errMsg });
        return;
      }
    }
    setLoading(true);
    try {
      const res = await api.initiateDeveloperSubscriptionPayment({
        planType: subForm.planType,
        amount: Number(subForm.amount),
        paymentMethod: subForm.paymentMethod,
        phone: subForm.phone.trim() || undefined,
        transferReference: subForm.transferReference.trim() || undefined,
        bankName: subForm.bankName.trim() || undefined
      });
      const tx = res?.transaction;
      setFeedback({
        type: 'success',
        msg: `GBS Subscription request ${tx?.transactionRef} created (Destination: ${tx?.destinationAccount || '0554594193'}). Status: UNDER_REVIEW until verified by GBS Developer.`
      });
      setSubForm((prev) => ({ ...prev, transferReference: '' }));
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['TransactionRef', 'Channel', 'Method', 'Provider', 'Amount(GHS)', 'Status', 'ReceiptNumber', 'CreatedAt'];
    const rows = transactions.map((t) => [
      t.transactionRef,
      t.channel,
      t.paymentMethod,
      t.provider,
      Number(t.amount || 0).toFixed(2),
      t.status,
      t.receiptNumber || '',
      t.createdAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gbs-hospital-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const supportedMethods = providersData?.methods || [];
  const devDestination = providersData?.developerDestination || {
    phone: '0554594193',
    networkLabel: 'MTN Mobile Money (Ghana)',
    accountLabel: 'GBS Official Developer Payment Destination',
    verificationNotice:
      'Confirm registered merchant/receiving-account ownership before activating live collections. Never enter any MoMo PIN inside GBS.'
  };

  const underReviewCount = transactions.filter((t) => t.status === 'UNDER_REVIEW' && t.channel !== 'DEVELOPER_SUBSCRIPTION').length;
  const filteredTransactions = transactions.filter((t) => txStatusFilter === 'ALL' || t.status === txStatusFilter);
  const subscriptionTransactions = transactions.filter((t) => t.channel === 'DEVELOPER_SUBSCRIPTION');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/nhia_claims_center_real.jpg"
          alt="Billing & Payment Methods Center"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_accountant.jpg"
              alt="Hospital Accountant"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Dedicated Portal • Hospital Finance &amp; Multi-Gateway Payment Engine
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Billing, Mobile Money, Bank Verification &amp; Subscriptions
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                MTN MoMo, Telecel Cash, AT Money, Visa/Mastercard, Bank Deposit verification, official receipts, and GBS subscriptions.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Ledger
          </button>
        </div>
      </div>

      {/* Truthful Gateway & Payment Method Capability Strip */}
      <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid var(--border-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase' }}>
            Live Payment Channels — Verified Server-to-Server Settlement Only
          </div>
          <span style={{ fontSize: '0.72rem', color: providersData?.automatedOnlineReady ? '#6ee7b7' : '#fcd34d', fontWeight: 700 }}>
            {providersData?.automatedOnlineReady
              ? `Automated Gateway Active (${(providersData?.gatewayStatus?.providers || []).join(', ')})`
              : 'Manual Bank Deposit & Cashier Mode Active (Configure Paystack/Hubtel Keys for Automated MoMo/Card)'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(supportedMethods.length > 0 ? supportedMethods : [
            { code: 'MTN_MOMO', label: 'MTN Mobile Money', automatedAvailable: false },
            { code: 'TELECEL_CASH', label: 'Telecel Cash', automatedAvailable: false },
            { code: 'AT_MONEY', label: 'AT Money', automatedAvailable: false },
            { code: 'VISA', label: 'Visa Card', automatedAvailable: false },
            { code: 'MASTERCARD', label: 'Mastercard', automatedAvailable: false },
            { code: 'BANK_TRANSFER', label: 'Bank Transfer', automatedAvailable: true },
            { code: 'BANK_DEPOSIT', label: 'Bank Deposit', automatedAvailable: true }
          ]).map((m) => (
            <span
              key={m.code}
              className="badge"
              style={{
                gap: '6px',
                padding: '6px 10px',
                textTransform: 'none',
                background: m.automatedAvailable ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.12)',
                border: `1px solid ${m.automatedAvailable ? 'rgba(16,185,129,0.45)' : 'rgba(148,163,184,0.3)'}`,
                color: m.automatedAvailable ? '#a7f3d0' : '#cbd5e1',
                fontSize: '0.74rem'
              }}
            >
              {m.category === 'MOBILE_MONEY' ? <Smartphone size={12} /> : m.category === 'CARD' ? <CreditCard size={12} /> : <Building2 size={12} />}
              {m.label} • {m.automatedAvailable ? 'Ready' : 'Gateway Key Needed'}
            </span>
          ))}
        </div>
      </div>

      {/* Live Financial Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Invoices Issued</div>
            <div className="metric-value">{stats?.totalBills ?? bills.length}</div>
          </div>
          <CreditCard size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Verified Revenue (Total)</div>
            <div className="metric-value" style={{ color: '#10b981', fontSize: '1.35rem' }}>
              GHS {Number(stats?.totalCollected ?? paymentReports?.verifiedRevenue?.allTimeConfirmed?.total ?? annualReport?.executiveSummary?.totalRevenue ?? 0).toLocaleString()}
            </div>
          </div>
          <DollarSign size={20} style={{ color: '#10b981' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Outstanding Balances</div>
            <div className="metric-value" style={{ color: '#f59e0b', fontSize: '1.35rem' }}>
              GHS {Number(paymentReports?.outstandingBills?.totalBalanceDue ?? stats?.totalOutstanding ?? 0).toLocaleString()}
            </div>
          </div>
          <Clock size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bank Deposits Under Review</div>
            <div className="metric-value" style={{ color: underReviewCount > 0 ? '#38bdf8' : '#94a3b8', fontSize: '1.35rem' }}>
              {underReviewCount}
            </div>
          </div>
          <ShieldCheck size={20} style={{ color: '#38bdf8' }} />
        </div>
      </div>

      {/* Operational Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'BILLING_CHECKOUT', label: 'Hospital Bills & Checkout' },
          { id: 'TRANSACTIONS_VERIFICATION', label: `Transactions & Bank Verification (${transactions.length})` },
          { id: 'REPORTS', label: 'Financial Reports & Reconciliation' },
          { id: 'DEVELOPER_SUBSCRIPTION', label: 'Pay GBS Subscription (0554594193)' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={activeTab === t.id ? 'btn-gold' : 'btn-outline-gold'}
            style={{ padding: '8px 14px', fontSize: '0.78rem' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
            color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
            fontSize: '0.84rem'
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Official Printable Receipt View */}
      {activeReceipt && (
        <div className="glass-panel" style={{ padding: '20px', border: '2px solid var(--gold-400)', background: 'rgba(8,16,32,0.96)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={activeReceipt.institution?.logoUrl || '/hospital-logo.png'}
                alt="Hospital Logo"
                style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--gold-400)' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Official Verified Hospital Payment Receipt
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  {activeReceipt.institution?.name || 'GBS Hospital'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => window.print()} className="btn-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                <Printer size={14} /> Print / Save PDF
              </button>
              <button type="button" onClick={() => setActiveReceipt(null)} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                Close Receipt
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Official Receipt Number</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--gold-300)' }}>{activeReceipt.receiptNumber}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Provider / Transaction Ref</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{activeReceipt.providerRef || activeReceipt.transactionRef}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Patient / Payer</div>
              <div style={{ color: '#fff', fontWeight: 700 }}>
                {activeReceipt.patient?.fullName || activeReceipt.payer?.name || 'Hospital Payer'}
                {activeReceipt.patient?.patientNumber ? ` (${activeReceipt.patient.patientNumber})` : ''}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Payment Method &amp; Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{activeReceipt.payment?.paymentMethod?.replace(/_/g, ' ')}</span>
                <StatusPill status={activeReceipt.status} />
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Amount Paid</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: '#6ee7b7' }}>
                {activeReceipt.payment?.currency || 'GHS'} {Number(activeReceipt.payment?.amountPaid || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Remaining Bill Balance</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                {activeReceipt.billSummary ? `GHS ${Number(activeReceipt.billSummary.remainingBalance || 0).toFixed(2)}` : 'GHS 0.00'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Confirmed Date &amp; Time</div>
              <div style={{ color: '#e2e8f0' }}>{activeReceipt.payment?.confirmedAt ? new Date(activeReceipt.payment.confirmedAt).toLocaleString() : '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Verified By</div>
              <div style={{ color: '#e2e8f0' }}>{activeReceipt.payment?.verifiedByName || 'Verified Settlement'}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: BILLING & MULTI-GATEWAY CHECKOUT */}
      {activeTab === 'BILLING_CHECKOUT' && (
        <>
          {/* Create Patient Invoice */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>Issue Hospital Patient Invoice</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search patient name or MRN..."
                  style={{ width: '220px', padding: '6px 10px', fontSize: '0.8rem' }}
                />
                <button type="button" onClick={loadData} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                  <Search size={13} /> Find
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {patients.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                >
                  {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Service Description *</label>
                <input required type="text" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Department Category</label>
                <select value={invoiceForm.category} onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="RADIOLOGY">Radiology / Scans</option>
                  <option value="PHARMACY">Pharmacy / Medicine</option>
                  <option value="ADMISSION">Inpatient Ward / Bed</option>
                  <option value="SURGERY">Surgery / Theatre</option>
                  <option value="DENTAL">Dental Clinic</option>
                  <option value="OPHTHALMOLOGY">Eye Clinic</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount (GHS) *</label>
                <input required type="number" step="0.01" min="1" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
              </div>
              <button type="submit" disabled={loading} className="btn-gold">
                <PlusCircle size={15} /> Create Invoice
              </button>
            </form>
          </div>

          {/* Multi-Gateway Checkout Drawer */}
          {gatewayBill && (
            <div className="glass-panel" style={{ padding: '18px', border: '1px solid #38bdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <strong style={{ color: '#38bdf8', fontSize: '0.96rem' }}>
                    Multi-Gateway Checkout — Invoice {gatewayBill.billNumber || gatewayBill.id.slice(0, 8)}
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Verified Outstanding Balance: <strong style={{ color: '#fbbf24' }}>GHS {getBillBalance(gatewayBill).toFixed(2)}</strong> • Supports full or partial settlement
                  </div>
                </div>
                <button type="button" onClick={() => { setGatewayBill(null); setActivePaymentResult(null); }} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                  Close Checkout
                </button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', fontSize: '0.76rem', color: '#a7f3d0', marginBottom: '12px' }}>
                <strong>Security Guarantee:</strong> GBS never requests or stores Mobile Money PINs, card numbers, or CVV codes. Payments are marked SUCCESSFUL only after verified gateway webhook/API confirmation or authorized Hospital Accountant bank verification.
              </div>

              <form onSubmit={handleInitiateGatewayPayment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payment Method *</label>
                  <select
                    value={gatewayForm.paymentMethod}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, paymentMethod: e.target.value })}
                  >
                    <option value="MTN_MOMO">MTN Mobile Money (Ghana)</option>
                    <option value="TELECEL_CASH">Telecel Cash</option>
                    <option value="AT_MONEY">AT Money (AirtelTigo)</option>
                    <option value="VISA">Visa Card (Hosted Checkout)</option>
                    <option value="MASTERCARD">Mastercard (Hosted Checkout)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="BANK_DEPOSIT">Bank Branch Deposit (Finance Verification)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount to Pay (GHS) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={getBillBalance(gatewayBill)}
                    value={gatewayForm.amount}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, amount: e.target.value })}
                  />
                </div>

                {MOMO_PREFIX_RULES[gatewayForm.paymentMethod] && (
                  <div>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Mobile Money Number ({MOMO_PREFIX_RULES[gatewayForm.paymentMethod].join('/')}) *
                    </label>
                    <input
                      required
                      type="tel"
                      value={gatewayForm.phone}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, phone: e.target.value })}
                      placeholder="e.g. 055XXXXXXX"
                    />
                  </div>
                )}

                {(gatewayForm.paymentMethod === 'BANK_DEPOSIT' || gatewayForm.paymentMethod === 'BANK_TRANSFER') && (
                  <>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bank Name</label>
                      <input
                        type="text"
                        value={gatewayForm.bankName}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, bankName: e.target.value })}
                        placeholder="e.g. GCB Bank / Ecobank"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Deposit Slip / Transfer Ref</label>
                      <input
                        type="text"
                        value={gatewayForm.bankDepositSlipRef}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, bankDepositSlipRef: e.target.value })}
                        placeholder="e.g. SLIP-2026-00912"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payer Name (Optional)</label>
                  <input
                    type="text"
                    value={gatewayForm.payerName}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, payerName: e.target.value })}
                    placeholder="Patient or Family Payer"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-gold">
                  {loading ? 'Processing...' : 'Initiate Payment Request'}
                </button>
              </form>

              {/* Truthful Active Payment Status & App-Not-Installed Fallback Guidance */}
              {activePaymentResult && (
                <div style={{ marginTop: '14px', padding: '14px', borderRadius: '8px', background: 'rgba(11,23,44,0.88)', border: '1px solid var(--border-gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--gold-300)', fontSize: '0.86rem' }}>
                        Ref: {activePaymentResult.transactionRef}
                      </span>
                      <StatusPill status={activePaymentResult.status} />
                      <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700 }}>
                        GHS {Number(activePaymentResult.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {activePaymentResult.authorizationUrl && (
                        <a
                          href={activePaymentResult.authorizationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-gold"
                          style={{ padding: '4px 10px', fontSize: '0.74rem', textDecoration: 'none' }}
                        >
                          <ExternalLink size={13} /> Open Official Checkout
                        </a>
                      )}
                      {activePaymentResult.status !== 'SUCCESSFUL' && activePaymentResult.status !== 'CANCELLED' && (
                        <>
                          <button type="button" onClick={() => handleVerifyTransaction(activePaymentResult.transactionRef)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                            <RefreshCw size={12} /> Check Verification Status
                          </button>
                          <button type="button" onClick={() => handleCancelTransaction(activePaymentResult.transactionRef)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.74rem', borderColor: '#ef4444', color: '#fca5a5' }}>
                            <XCircle size={12} /> Cancel &amp; Switch Method
                          </button>
                        </>
                      )}
                      {activePaymentResult.status === 'SUCCESSFUL' && (
                        <button type="button" onClick={() => handleOpenOfficialReceipt(activePaymentResult.transactionRef)} className="btn-gold" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                          <FileText size={13} /> Open Official Receipt
                        </button>
                      )}
                    </div>
                  </div>
                  {activePaymentResult.customerInstructions && (
                    <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#e2e8f0' }}>
                      {activePaymentResult.customerInstructions}
                    </p>
                  )}
                  {Array.isArray(activePaymentResult.fallbackOptions) && activePaymentResult.fallbackOptions.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {activePaymentResult.fallbackOptions.map((fb, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(15,27,49,0.75)', border: '1px solid var(--border-subtle)', fontSize: '0.73rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold-300)', marginBottom: '2px' }}>{fb.title}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{fb.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hospital Cashier Cash Desk Receipt Drawer (Preserved Legacy Workflow) */}
          {cashierBill && (
            <div className="glass-panel" style={{ padding: '18px', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#10b981' }}>
                  Hospital Cashier Desk Settlement — Invoice {cashierBill.billNumber || cashierBill.id.slice(0, 8)} (Balance: GHS {getBillBalance(cashierBill).toFixed(2)})
                </strong>
                <button type="button" onClick={() => setCashierBill(null)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                  Cancel
                </button>
              </div>
              <form onSubmit={handleCashierConfirm} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Cashier Desk Method *</label>
                  <select value={cashierForm.paymentMethod} onChange={(e) => setCashierForm({ ...cashierForm, paymentMethod: e.target.value })}>
                    <option value="CASH">Hospital Cashier (Cash)</option>
                    <option value="MOBILE_MONEY">Verified Desk Mobile Money</option>
                    <option value="BANK_CARD">Verified POS Card Terminal</option>
                    <option value="BANK_TRANSFER">Verified Direct Bank Transfer</option>
                    <option value="CHEQUE">Hospital Cheque</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount Received (GHS) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={cashierForm.amountPaid}
                    onChange={(e) => setCashierForm({ ...cashierForm, amountPaid: e.target.value })}
                    placeholder={String(getBillBalance(cashierBill))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Receipt / POS Reference</label>
                  <input
                    type="text"
                    value={cashierForm.transactionRef}
                    onChange={(e) => setCashierForm({ ...cashierForm, transactionRef: e.target.value })}
                    placeholder="CASH-POS-REF"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-gold">
                  Confirm Cashier Receipt
                </button>
              </form>
            </div>
          )}

          {/* Hospital Bills Table */}
          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>
              Hospital Patient Bills &amp; Settlement Ledger ({bills.length})
            </h3>
            {bills.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No hospital invoices created yet.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Patient</th>
                    <th>Payable (GHS)</th>
                    <th>Paid (GHS)</th>
                    <th>Balance (GHS)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.slice(0, 30).map((b) => {
                    const payable = getBillPayable(b);
                    const paid = getBillPaid(b);
                    const balance = getBillBalance(b);
                    const status = getBillStatus(b);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>
                          {b.billNumber || b.id.slice(0, 8)}
                        </td>
                        <td>{b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : (b.patientName || 'Patient')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{payable.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{paid.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: balance > 0 ? '#fbbf24' : '#6ee7b7', fontWeight: 700 }}>
                          {balance.toFixed(2)}
                        </td>
                        <td>
                          <span className={status === 'PAID' ? 'badge badge-success' : 'badge badge-warning'}>{status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {status !== 'PAID' && balance > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCashierBill(null);
                                    setActivePaymentResult(null);
                                    setGatewayBill(b);
                                    setGatewayForm({
                                      paymentMethod: providersData?.automatedOnlineReady ? 'MTN_MOMO' : 'BANK_DEPOSIT',
                                      amount: balance.toFixed(2),
                                      phone: b.patient?.phone || '',
                                      payerName: b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : '',
                                      payerEmail: b.patient?.email || '',
                                      bankName: 'GCB Bank',
                                      bankDepositSlipRef: ''
                                    });
                                  }}
                                  className="btn-gold"
                                  style={{ padding: '3px 9px', fontSize: '0.72rem' }}
                                >
                                  Pay via MoMo / Bank
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGatewayBill(null);
                                    setCashierBill(b);
                                    setCashierForm({ amountPaid: balance.toFixed(2), paymentMethod: 'CASH', transactionRef: '' });
                                  }}
                                  className="btn-outline-gold"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                >
                                  Cashier Desk
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateDetail &&
                                onNavigateDetail({
                                  detailType: 'VIEW_TRANSACTIONS',
                                  moduleKey: 'BILLING',
                                  recordId: b.id,
                                  title: `Invoice ${b.billNumber || b.id}`,
                                  recordData: b
                                })
                              }
                              className="btn-outline-gold"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB 2: MULTI-GATEWAY TRANSACTIONS, BANK DEPOSIT VERIFICATION & REFUNDS */}
      {activeTab === 'TRANSACTIONS_VERIFICATION' && (
        <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>
                Multi-Gateway Payment Ledger &amp; Bank Deposit Verification Queue
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Bank deposits stay UNDER_REVIEW until an authorized Hospital Accountant verifies the bank slip reference.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'UNDER_REVIEW', 'REQUIRES_CUSTOMER_ACTION', 'PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTxStatusFilter(st)}
                  className={txStatusFilter === st ? 'btn-gold' : 'btn-outline-gold'}
                  style={{ padding: '4px 9px', fontSize: '0.7rem' }}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No payment transactions match the selected filter.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Channel / Method</th>
                  <th>Payer / Bank Slip</th>
                  <th>Amount (GHS)</th>
                  <th>Status</th>
                  <th>Receipt #</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--gold-300)', fontWeight: 700 }}>
                      {tx.transactionRef}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{tx.paymentMethod?.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.channel} • {tx.provider}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <div>{tx.payerName || 'Payer'} {tx.payerPhoneMasked ? `(${tx.payerPhoneMasked})` : ''}</div>
                      {tx.bankDepositSlipRef && (
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          {tx.bankName || 'Bank'}: {tx.bankDepositSlipRef}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {Number(tx.amount || 0).toFixed(2)}
                    </td>
                    <td><StatusPill status={tx.status} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#6ee7b7' }}>
                      {tx.receiptNumber || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {tx.status === 'UNDER_REVIEW' && tx.channel !== 'DEVELOPER_SUBSCRIPTION' && (
                          <>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleVerifyBankDeposit(tx, 'APPROVE')}
                              className="btn-gold"
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            >
                              Verify &amp; Credit
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleVerifyBankDeposit(tx, 'REJECT')}
                              className="btn-outline-gold"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', borderColor: '#ef4444', color: '#fca5a5' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {['PENDING', 'REQUIRES_CUSTOMER_ACTION', 'PROCESSING'].includes(tx.status) && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleVerifyTransaction(tx.transactionRef)}
                            className="btn-outline-gold"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          >
                            Verify Provider
                          </button>
                        )}
                        {tx.status === 'SUCCESSFUL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenOfficialReceipt(tx.transactionRef)}
                              className="btn-gold"
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            >
                              <Printer size={11} /> Receipt
                            </button>
                            {tx.channel !== 'DEVELOPER_SUBSCRIPTION' && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleRefundTransaction(tx)}
                                className="btn-outline-gold"
                                style={{ padding: '3px 8px', fontSize: '0.7rem', borderColor: '#a855f7', color: '#d8b4fe' }}
                              >
                                <RotateCcw size={11} /> Refund
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: FINANCIAL REPORTS & GATEWAY RECONCILIATION */}
      {activeTab === 'REPORTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>
                  Verified Revenue &amp; Gateway Reconciliation Summary
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Only verified SUCCESSFUL transactions count as received revenue. Pending and unverified deposits are excluded.
                </div>
              </div>
              <button type="button" onClick={handleExportCsv} className="btn-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                <Download size={14} /> Export Ledger CSV
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div className="metric-card">
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Today Verified</div>
                  <div className="metric-value" style={{ fontSize: '1.2rem', color: '#6ee7b7' }}>
                    GHS {Number(paymentReports?.verifiedRevenue?.daily?.total || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{paymentReports?.verifiedRevenue?.daily?.count || 0} txns</div>
                </div>
              </div>
              <div className="metric-card">
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>7-Day Verified</div>
                  <div className="metric-value" style={{ fontSize: '1.2rem', color: '#6ee7b7' }}>
                    GHS {Number(paymentReports?.verifiedRevenue?.weekly?.total || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{paymentReports?.verifiedRevenue?.weekly?.count || 0} txns</div>
                </div>
              </div>
              <div className="metric-card">
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monthly Verified</div>
                  <div className="metric-value" style={{ fontSize: '1.2rem', color: '#6ee7b7' }}>
                    GHS {Number(paymentReports?.verifiedRevenue?.monthly?.total || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{paymentReports?.verifiedRevenue?.monthly?.count || 0} txns</div>
                </div>
              </div>
              <div className="metric-card">
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Failed / Reversed / Refunded</div>
                  <div className="metric-value" style={{ fontSize: '1.1rem', color: '#fca5a5' }}>
                    {paymentReports?.exceptions?.failedCount || 0} / {paymentReports?.exceptions?.reversedCount || 0} / {paymentReports?.exceptions?.refundedCount || 0}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Refunded: GHS {Number(paymentReports?.exceptions?.refundedTotal || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 8px', fontSize: '0.86rem', color: 'var(--gold-300)' }}>Reconciliation by Payment Method</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Confirmed Transactions</th>
                  <th>Verified Total (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(paymentReports?.gatewayReconciliationByMethod || {}).length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No confirmed multi-gateway transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(paymentReports.gatewayReconciliationByMethod).map(([method, info]) => (
                    <tr key={method}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{method.replace(/_/g, ' ')}</td>
                      <td>{info.count}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#6ee7b7', fontWeight: 700 }}>
                        GHS {Number(info.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HOSPITAL ADMINISTRATOR -> GBS DEVELOPER SUBSCRIPTION PAYMENT (0554594193) */}
      {activeTab === 'DEVELOPER_SUBSCRIPTION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--gold-400)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Hospital Administration → GBS Platform Licensing &amp; Subscriptions
                </div>
                <h3 style={{ margin: '4px 0', fontSize: '1.08rem', color: '#fff' }}>
                  Pay GBS Developer Subscription &amp; System Activation
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  For authorized Hospital Administrators &amp; Hospital Directors to settle monthly/annual subscriptions or approved GBS add-on services.
                </p>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(212,175,55,0.12)', border: '1px solid var(--gold-400)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--gold-300)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Official GBS Developer MoMo Destination
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>
                  {devDestination.phone}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>{devDestination.networkLabel}</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', fontSize: '0.75rem', color: '#fde68a', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{devDestination.verificationNotice}</span>
            </div>

            <form onSubmit={handleSubmitDeveloperSubscription} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Subscription Plan *</label>
                <select
                  value={subForm.planType}
                  onChange={(e) => {
                    const selected = SUBSCRIPTION_PLANS.find((sp) => sp.id === e.target.value);
                    setSubForm({ ...subForm, planType: e.target.value, amount: String(selected ? selected.defaultAmount : 1500) });
                  }}
                >
                  {SUBSCRIPTION_PLANS.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.label} (GHS {sp.defaultAmount.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount (GHS) *</label>
                <input required type="number" step="0.01" min="1" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payment Channel *</label>
                <select value={subForm.paymentMethod} onChange={(e) => setSubForm({ ...subForm, paymentMethod: e.target.value })}>
                  <option value="MTN_MOMO">MTN Mobile Money (to 0554594193)</option>
                  <option value="TELECEL_CASH">Telecel Cash</option>
                  <option value="AT_MONEY">AT Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="BANK_DEPOSIT">Bank Deposit</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Sender Phone (Optional)</label>
                <input type="tel" value={subForm.phone} onChange={(e) => setSubForm({ ...subForm, phone: e.target.value })} placeholder="055XXXXXXX" />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>MoMo / Bank Transfer Ref</label>
                <input type="text" value={subForm.transferReference} onChange={(e) => setSubForm({ ...subForm, transferReference: e.target.value })} placeholder="Transaction ID from receipt" />
              </div>
              <button type="submit" disabled={loading} className="btn-gold">
                {loading ? 'Submitting...' : 'Submit Subscription Payment'}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--gold-400)' }}>
              Hospital Subscription Payment History ({subscriptionTransactions.length})
            </h4>
            {subscriptionTransactions.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No subscription payment submissions recorded for this hospital yet.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Purpose</th>
                    <th>Destination</th>
                    <th>Amount (GHS)</th>
                    <th>Status</th>
                    <th>Official Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionTransactions.map((stx) => (
                    <tr key={stx.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{stx.transactionRef}</td>
                      <td>{stx.purpose}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{stx.destinationAccount || '0554594193'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Number(stx.amount || 0).toFixed(2)}</td>
                      <td><StatusPill status={stx.status} /></td>
                      <td>
                        {stx.status === 'SUCCESSFUL' ? (
                          <button type="button" onClick={() => handleOpenOfficialReceipt(stx.transactionRef)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                            <Printer size={11} /> {stx.receiptNumber}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Issued on verification</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
