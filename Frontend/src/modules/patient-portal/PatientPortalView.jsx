import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import {
  User, RefreshCw, Activity, Pill, CreditCard, Shield, FileText,
  Smartphone, Building2, Printer, ExternalLink, XCircle, CheckCircle
} from 'lucide-react';

const STATUS_BADGES = {
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

const MOMO_PREFIXES = {
  MTN_MOMO: ['024', '054', '055', '059', '025'],
  TELECEL_CASH: ['020', '050'],
  AT_MONEY: ['026', '027', '056', '057']
};

function validateGhanaPhone(raw, method) {
  const cleaned = String(raw || '').replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Enter your 10-digit Ghanaian Mobile Money number.';
  let local = cleaned;
  if (local.startsWith('+233')) local = `0${local.slice(4)}`;
  else if (local.startsWith('233') && local.length === 12) local = `0${local.slice(3)}`;
  if (!/^0[25]\d{8}$/.test(local)) {
    return 'Enter a valid 10-digit Ghanaian phone number (e.g., 024XXXXXXX, 055XXXXXXX, 020XXXXXXX).';
  }
  const allowed = MOMO_PREFIXES[method];
  if (allowed && !allowed.includes(local.slice(0, 3))) {
    return `Prefix ${local.slice(0, 3)} does not match ${method.replace(/_/g, ' ')} (${allowed.join(', ')}).`;
  }
  return null;
}

function PaymentStatePill({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  const s = STATUS_BADGES[key] || STATUS_BADGES.PENDING;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '999px',
        fontSize: '0.68rem',
        fontWeight: 800,
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

export default function PatientPortalView({ onNavigateDetail }) {
  const [dossier, setDossier] = useState(null);
  const [providersData, setProvidersData] = useState(null);
  const [myTransactions, setMyTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [payFeedback, setPayFeedback] = useState(null);

  const [selectedBill, setSelectedBill] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    paymentMethod: 'BANK_DEPOSIT',
    amount: '',
    phone: '',
    bankName: 'GCB Bank',
    bankDepositSlipRef: ''
  });
  const [activeTx, setActiveTx] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const loadPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, prov, txRes] = await Promise.all([
        api.getMyPatientDashboard(),
        api.getPaymentProviders().catch(() => null),
        api.getPaymentTransactions('limit=30').catch(() => ({ transactions: [] }))
      ]);
      setDossier(data);
      setProvidersData(prov);
      setMyTransactions(Array.isArray(txRes?.transactions) ? txRes.transactions : (Array.isArray(txRes) ? txRes : []));
    } catch (err) {
      setError(err.message || 'Please sign in to view your personal Patient Health Portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const pat = dossier?.patient || dossier?.profile || null;
  const patDisplayName = pat?.fullName || [pat?.firstName, pat?.lastName].filter(Boolean).join(' ').trim();
  const folderInfo = dossier?.medicalFolder || pat?.folder || null;
  const encounters = dossier?.recentVisits || dossier?.recentEncounters || dossier?.encounters || [];
  const prescriptions = dossier?.activeMedications || dossier?.prescriptions || [];
  const bills = dossier?.bills || dossier?.invoices || [];
  const allergies = dossier?.activeAllergies || dossier?.allergies || [];

  const getBillPayable = (b) => Number(b.patientPayableAmount ?? b.totalAmount ?? b.grossAmount ?? b.amount ?? 0);
  const getBillPaid = (b) => Number(b.paidAmount ?? b.amountPaid ?? 0);
  const getBillBalance = (b) => {
    if (b.balanceDue !== undefined && b.balanceDue !== null) return Number(b.balanceDue);
    return Math.max(0, getBillPayable(b) - getBillPaid(b));
  };
  const getBillStatus = (b) => String(b.paymentStatus || b.status || 'UNPAID').toUpperCase();

  const totalOutstandingBalance = bills.reduce((sum, b) => sum + Math.max(0, getBillBalance(b)), 0);

  const openCheckoutForBill = (bill) => {
    const bal = getBillBalance(bill);
    setSelectedBill(bill);
    setActiveTx(null);
    setPayFeedback(null);
    setCheckoutForm({
      paymentMethod: providersData?.automatedOnlineReady ? 'MTN_MOMO' : 'BANK_DEPOSIT',
      amount: bal.toFixed(2),
      phone: pat?.phone || '',
      bankName: 'GCB Bank',
      bankDepositSlipRef: ''
    });
  };

  const handleInitiateBillPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    setPayFeedback(null);

    const method = checkoutForm.paymentMethod;
    const isMomo = Boolean(MOMO_PREFIXES[method]);
    if (isMomo) {
      const phoneErr = validateGhanaPhone(checkoutForm.phone, method);
      if (phoneErr) {
        setPayFeedback({ type: 'error', msg: phoneErr });
        return;
      }
    }

    const amt = Number(checkoutForm.amount || getBillBalance(selectedBill));
    if (!Number.isFinite(amt) || amt <= 0) {
      setPayFeedback({ type: 'error', msg: 'Please enter a payment amount greater than GHS 0.00.' });
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (method === 'BANK_DEPOSIT' && checkoutForm.bankDepositSlipRef.trim()) {
        res = await api.submitBankDepositProof({
          billId: selectedBill.id,
          amount: amt,
          paymentMethod: 'BANK_DEPOSIT',
          bankName: checkoutForm.bankName,
          bankDepositSlipRef: checkoutForm.bankDepositSlipRef.trim(),
          payerName: patDisplayName || undefined
        });
      } else {
        res = await api.initiatePayment({
          billId: selectedBill.id,
          amount: amt,
          paymentMethod: method,
          phone: isMomo ? checkoutForm.phone.trim() : undefined,
          payerName: patDisplayName || undefined,
          payerEmail: pat?.email || undefined,
          bankName: method.startsWith('BANK') ? checkoutForm.bankName : undefined,
          bankDepositSlipRef: checkoutForm.bankDepositSlipRef.trim() || undefined
        });
      }
      const tx = res?.transaction || res;
      setActiveTx(tx);
      setPayFeedback({
        type: 'success',
        msg: `Payment reference ${tx?.transactionRef} created with status "${tx?.status}". Your bill balance updates automatically once verified.`
      });
      loadPortal();
    } catch (err) {
      setPayFeedback({ type: 'error', msg: err.message });
      if (err?.data?.data?.transaction) {
        setActiveTx(err.data.data.transaction);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckPaymentStatus = async (reference) => {
    setSubmitting(true);
    setPayFeedback(null);
    try {
      const res = await api.verifyPaymentTransaction(reference);
      if (res?.transaction) setActiveTx(res.transaction);
      setPayFeedback({
        type: res?.verified ? 'success' : 'error',
        msg: res?.verified
          ? `Payment confirmed! Official Receipt: ${res?.transaction?.receiptNumber || 'Issued'}.`
          : (res?.reason || res?.message || 'Awaiting confirmation from your payment provider or Hospital Finance.')
      });
      loadPortal();
    } catch (err) {
      setPayFeedback({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPending = async (reference) => {
    setSubmitting(true);
    setPayFeedback(null);
    try {
      const cancelled = await api.cancelPaymentTransaction(reference, { reason: 'Patient switched payment method' });
      setActiveTx(cancelled);
      setPayFeedback({ type: 'success', msg: `Pending payment ${reference} cancelled. You may choose another method below.` });
      loadPortal();
    } catch (err) {
      setPayFeedback({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (reference) => {
    setSubmitting(true);
    setPayFeedback(null);
    try {
      const rcpt = await api.getPaymentReceipt(reference);
      setActiveReceipt(rcpt);
    } catch (err) {
      setPayFeedback({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Patient Portal Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/hospital_hero_exterior.jpg"
          alt="GBS Patient Self-Service Health Portal"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_patient.jpg"
              alt="Patient Portal"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Personal Self-Service Portal • Health Records &amp; Bill Payments
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                {patDisplayName ? `Welcome, ${patDisplayName}` : 'Patient Self-Service Health Portal'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {pat
                  ? `MRN: ${pat.patientNumber || pat.mrn} • Blood Group: ${pat.bloodGroup || 'On File'} • Archive Folder: ${folderInfo?.folderNumber || 'Assigned'}`
                  : 'Access your hospital visits, prescriptions, safety alerts, and pay hospital bills securely.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={loadPortal} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh My Records
          </button>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (pat?.id && window.gbsOpenPatientMembershipCard) {
                  window.gbsOpenPatientMembershipCard(pat.id);
                } else if (window.gbsOpenMyMembershipCard) {
                  window.gbsOpenMyMembershipCard();
                }
              }}
              aria-label="Generate and Print My Official Hospital Registration ID Card"
              className="btn-gold"
              style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CreditCard size={14} /> My Hospital ID Card
            </button>
            <button type="button" onClick={loadPortal} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
              <RefreshCw size={14} /> Refresh My Records
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444', color: '#fca5a5', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && dossier && dossier.linked === false && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid var(--gold-400)', color: 'var(--gold-300)', fontSize: '0.84rem' }}>
          {dossier.message || 'No patient record is linked to this account yet. Please register at hospital reception.'}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading live patient health records and hospital statements from PostgreSQL...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Hospital Visits</div>
                <div className="metric-value">{encounters.length}</div>
              </div>
              <Activity size={20} style={{ color: 'var(--gold-400)' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Active Prescriptions</div>
                <div className="metric-value" style={{ color: '#38bdf8' }}>{prescriptions.length}</div>
              </div>
              <Pill size={20} style={{ color: '#38bdf8' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Documented Allergies</div>
                <div className="metric-value" style={{ color: '#ef4444' }}>{allergies.length}</div>
              </div>
              <Shield size={20} style={{ color: '#ef4444' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Outstanding Hospital Balance</div>
                <div className="metric-value" style={{ color: totalOutstandingBalance > 0 ? '#fbbf24' : '#10b981', fontSize: '1.3rem' }}>
                  GHS {totalOutstandingBalance.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{bills.length} statement(s)</div>
              </div>
              <CreditCard size={20} style={{ color: totalOutstandingBalance > 0 ? '#fbbf24' : '#10b981' }} />
            </div>
          </div>

          {payFeedback && (
            <div
              className="glass-panel"
              style={{
                padding: '12px 16px',
                borderLeft: `4px solid ${payFeedback.type === 'error' ? '#ef4444' : '#10b981'}`,
                color: payFeedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
                fontSize: '0.84rem'
              }}
            >
              {payFeedback.msg}
            </div>
          )}

          {/* Official Printable Receipt View */}
          {activeReceipt && (
            <div className="glass-panel" style={{ padding: '20px', border: '2px solid var(--gold-400)', background: 'rgba(8,16,32,0.96)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase' }}>
                    Official Hospital Payment Receipt
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                    {activeReceipt.institution?.name || 'GBS Hospital'} — {activeReceipt.receiptNumber}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => window.print()} className="btn-gold" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <Printer size={13} /> Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateDetail) {
                        onNavigateDetail({
                          detailType: 'VIEW_TRANSACTIONS',
                          moduleKey: 'PATIENT_PORTAL',
                          recordId: activeReceipt.transactionRef,
                          title: `Official Receipt ${activeReceipt.receiptNumber}`,
                          recordData: activeReceipt
                        });
                      }
                    }}
                    className="btn-outline-gold"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    Open Full Page
                  </button>
                  <button type="button" onClick={() => setActiveReceipt(null)} className="btn-outline-gold" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                    Close
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>{' '}
                  <strong style={{ color: '#6ee7b7', fontFamily: 'var(--font-mono)' }}>
                    {activeReceipt.payment?.currency || 'GHS'} {Number(activeReceipt.payment?.amountPaid || 0).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Method:</span>{' '}
                  <strong>{activeReceipt.payment?.paymentMethod?.replace(/_/g, ' ')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Provider Ref:</span>{' '}
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{activeReceipt.providerRef || activeReceipt.transactionRef}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Remaining Balance:</span>{' '}
                  <strong style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    GHS {Number(activeReceipt.billSummary?.remainingBalance || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Self-Service Bill Checkout Panel */}
          {selectedBill && (
            <div className="glass-panel" style={{ padding: '18px', border: '1px solid #38bdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <strong style={{ color: '#38bdf8', fontSize: '0.96rem' }}>
                    Pay Hospital Bill — {selectedBill.billNumber || selectedBill.id.slice(0, 8)}
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {selectedBill.description || 'Hospital Services'} • Outstanding Balance: <strong style={{ color: '#fbbf24' }}>GHS {getBillBalance(selectedBill).toFixed(2)}</strong>
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedBill(null); setActiveTx(null); }} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                  Close
                </button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', fontSize: '0.75rem', color: '#a7f3d0', marginBottom: '12px' }}>
                <strong>Safe Payment Protection:</strong> GBS never requests your Mobile Money PIN, card number, or CVV. You do not need a Mobile Money app installed — approve directly on your phone prompt or via official browser checkout.
              </div>

              <form onSubmit={handleInitiateBillPayment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payment Method *</label>
                  <select value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}>
                    <option value="MTN_MOMO">MTN Mobile Money (024/054/055/059/025)</option>
                    <option value="TELECEL_CASH">Telecel Cash (020/050)</option>
                    <option value="AT_MONEY">AT Money (026/027/056/057)</option>
                    <option value="VISA">Visa Card (Hosted Checkout)</option>
                    <option value="MASTERCARD">Mastercard (Hosted Checkout)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="BANK_DEPOSIT">Bank Branch Deposit</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount (Full or Partial, GHS) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={getBillBalance(selectedBill)}
                    value={checkoutForm.amount}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, amount: e.target.value })}
                  />
                </div>
                {MOMO_PREFIXES[checkoutForm.paymentMethod] && (
                  <div>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mobile Money Phone *</label>
                    <input
                      required
                      type="tel"
                      value={checkoutForm.phone}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                      placeholder="055XXXXXXX"
                    />
                  </div>
                )}
                {(checkoutForm.paymentMethod === 'BANK_DEPOSIT' || checkoutForm.paymentMethod === 'BANK_TRANSFER') && (
                  <>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bank Name</label>
                      <input type="text" value={checkoutForm.bankName} onChange={(e) => setCheckoutForm({ ...checkoutForm, bankName: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Deposit Slip / Transfer Ref</label>
                      <input type="text" value={checkoutForm.bankDepositSlipRef} onChange={(e) => setCheckoutForm({ ...checkoutForm, bankDepositSlipRef: e.target.value })} placeholder="Bank receipt reference" />
                    </div>
                  </>
                )}
                <button type="submit" disabled={submitting} className="btn-gold">
                  {submitting ? 'Initiating...' : 'Proceed to Pay'}
                </button>
              </form>

              {activeTx && (
                <div style={{ marginTop: '14px', padding: '14px', borderRadius: '8px', background: 'rgba(11,23,44,0.9)', border: '1px solid var(--border-gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontSize: '0.84rem' }}>
                        Ref: {activeTx.transactionRef}
                      </strong>
                      <PaymentStatePill status={activeTx.status} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {activeTx.authorizationUrl && (
                        <a href={activeTx.authorizationUrl} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{ padding: '4px 10px', fontSize: '0.72rem', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> Official Checkout
                        </a>
                      )}
                      {activeTx.status !== 'SUCCESSFUL' && activeTx.status !== 'CANCELLED' && (
                        <>
                          <button type="button" disabled={submitting} onClick={() => handleCheckPaymentStatus(activeTx.transactionRef)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                            <RefreshCw size={12} /> Verify Status
                          </button>
                          <button type="button" disabled={submitting} onClick={() => handleCancelPending(activeTx.transactionRef)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.72rem', borderColor: '#ef4444', color: '#fca5a5' }}>
                            <XCircle size={12} /> Cancel &amp; Switch
                          </button>
                        </>
                      )}
                      {activeTx.status === 'SUCCESSFUL' && (
                        <button type="button" onClick={() => handleViewReceipt(activeTx.transactionRef)} className="btn-gold" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                          <Printer size={12} /> Official Receipt
                        </button>
                      )}
                    </div>
                  </div>
                  {activeTx.customerInstructions && (
                    <p style={{ margin: '4px 0 8px', fontSize: '0.8rem', color: '#e2e8f0' }}>{activeTx.customerInstructions}</p>
                  )}
                  {Array.isArray(activeTx.fallbackOptions) && activeTx.fallbackOptions.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
                      {activeTx.fallbackOptions.map((fb, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(15,27,49,0.75)', border: '1px solid var(--border-subtle)', fontSize: '0.72rem' }}>
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

          {/* My Hospital Bills & Statements */}
          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={16} /> My Hospital Bills &amp; Self-Service Payments ({bills.length})
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Smartphone size={12} /> MTN / Telecel / AT MoMo</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Building2 size={12} /> Visa / Mastercard / Bank Deposit</span>
              </div>
            </div>

            {bills.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                You have no hospital bills recorded on your account.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Description</th>
                    <th>Total (GHS)</th>
                    <th>Paid (GHS)</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => {
                    const bal = getBillBalance(b);
                    const st = getBillStatus(b);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{b.billNumber || b.id.slice(0, 8)}</td>
                        <td style={{ fontSize: '0.8rem' }}>{b.description || 'Hospital Services'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{getBillPayable(b).toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{getBillPaid(b).toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: bal > 0 ? '#fbbf24' : '#6ee7b7' }}>{bal.toFixed(2)}</td>
                        <td><span className={st === 'PAID' ? 'badge badge-success' : 'badge badge-warning'}>{st}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {st !== 'PAID' && bal > 0 && (
                              <button type="button" onClick={() => openCheckoutForBill(b)} className="btn-gold" style={{ padding: '3px 10px', fontSize: '0.72rem' }}>
                                Pay Now
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateDetail &&
                                onNavigateDetail({
                                  detailType: 'VIEW_TRANSACTIONS',
                                  moduleKey: 'PATIENT_PORTAL',
                                  recordId: b.id,
                                  title: `Hospital Bill ${b.billNumber || b.id}`,
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

          {/* Patient Payment Transactions & Official Receipts */}
          {myTransactions.length > 0 && (
            <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> My Payment Transactions &amp; Official Receipts ({myTransactions.length})
              </h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Amount (GHS)</th>
                    <th>Status</th>
                    <th>Receipt</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myTransactions.slice(0, 15).map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--gold-300)' }}>{tx.transactionRef}</td>
                      <td style={{ fontSize: '0.78rem' }}>{tx.paymentMethod?.replace(/_/g, ' ')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Number(tx.amount || 0).toFixed(2)}</td>
                      <td><PaymentStatePill status={tx.status} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#6ee7b7' }}>{tx.receiptNumber || '—'}</td>
                      <td>
                        {tx.status === 'SUCCESSFUL' ? (
                          <button type="button" onClick={() => handleViewReceipt(tx.transactionRef)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                            <Printer size={11} /> View Receipt
                          </button>
                        ) : ['PENDING', 'REQUIRES_CUSTOMER_ACTION', 'PROCESSING'].includes(tx.status) ? (
                          <button type="button" onClick={() => handleCheckPaymentStatus(tx.transactionRef)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                            Check Status
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{tx.status.replace(/_/g, ' ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Preserved Clinical Encounters & Personal Health Profile Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Recent Clinical Encounters ({encounters.length})
              </h3>
              {encounters.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No clinical visits recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {encounters.slice(0, 6).map((enc) => (
                    <div key={enc.id} style={{ padding: '10px', borderRadius: '6px', background: 'rgba(6,12,24,0.7)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{enc.encounterNumber} • {enc.encounterType}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{enc.chiefComplaint || 'Routine Hospital Visit'} • {enc.status}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'PATIENT_PORTAL', recordId: enc.id, title: `Visit ${enc.encounterNumber}`, recordData: enc })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Personal Health Profile &amp; Safety Alerts
              </h3>
              {pat ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Full Name:</span> <strong>{patDisplayName || `${pat.firstName || ''} ${pat.lastName || ''}`}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>MRN:</span> <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{pat.patientNumber || pat.mrn}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{pat.phone || '—'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>NHIS #:</span> <strong>{pat.nhisNumber || 'Self-Pay'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Blood Group:</span> <strong>{pat.bloodGroup || 'Not recorded'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Genotype:</span> <strong>{pat.genotype || 'Not recorded'}</strong></div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{dossier?.message || 'No patient profile linked yet.'}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
