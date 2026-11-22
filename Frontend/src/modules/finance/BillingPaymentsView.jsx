import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { CreditCard, PlusCircle, RefreshCw, Search, CheckCircle, DollarSign, Building2, Smartphone } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'MOBILE_MONEY', label: 'MTN / Telecel Mobile Money', icon: Smartphone },
  { id: 'CARD', label: 'Visa / Mastercard (Debit/Credit)', icon: CreditCard },
  { id: 'CASH', label: 'Hospital Cashier (Cash)', icon: DollarSign },
  { id: 'BANK_TRANSFER', label: 'Direct Bank Transfer', icon: Building2 },
  { id: 'INSURANCE', label: 'NHIS / Private Insurance', icon: CheckCircle }
];

export default function BillingPaymentsView({ onNavigateDetail }) {
  const [stats, setStats] = useState(null);
  const [annualReport, setAnnualReport] = useState(null);
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    description: 'Outpatient Consultation & Diagnostics',
    amount: '150',
    category: 'CONSULTATION'
  });
  const [payingBill, setPayingBill] = useState(null);
  const [payForm, setPayForm] = useState({
    amountPaid: '',
    paymentMethod: 'MOBILE_MONEY',
    transactionRef: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [s, b, a, p] = await Promise.all([
        api.getBillingStats().catch(() => null),
        api.getBills().catch(() => []),
        api.getAnnualFinancialReport().catch(() => null),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setStats(s);
      setBills(Array.isArray(b) ? b : (b?.bills || b?.items || []));
      setAnnualReport(a);
      setPatients(Array.isArray(p) ? p : (p?.patients || p?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      setFeedback({ type: 'success', msg: `Invoice created for ${selectedPatient.firstName} ${selectedPatient.lastName} (GHS ${amt.toFixed(2)}).` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payingBill) return;
    setLoading(true);
    try {
      const res = await api.recordPayment(payingBill.id, {
        amount: Number(payForm.amountPaid || payingBill.balanceDue || payingBill.totalAmount),
        paymentMethod: payForm.paymentMethod,
        referenceNumber: payForm.transactionRef || `PAY-${Date.now()}`
      });
      setFeedback({
        type: 'success',
        msg: `Payment confirmed cleanly via ${payForm.paymentMethod} (Receipt: ${res?.receiptNumber || res?.payment?.receiptNumber || 'Issued'}).`
      });
      setPayingBill(null);
      setPayForm({ amountPaid: '', paymentMethod: 'MOBILE_MONEY', transactionRef: '' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

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
                Dedicated Portal • Accountant &amp; Revenue Operations
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Billing, Multi-Channel Payment Methods &amp; Financial Ledger
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Visa/Mastercard, Mobile Money, Bank Transfer, Cash receipts, NHIS billing, and annual financial reporting.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Revenue Ledger
          </button>
        </div>
      </div>

      {/* Supported Payment Methods Strip (Master Blueprint Alignment) */}
      <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid var(--border-gold)' }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
          Supported Hospital Payment Methods — Real-Time Receipt Confirmation
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon;
            return (
              <span key={pm.id} className="badge badge-gold" style={{ gap: '6px', padding: '6px 12px', textTransform: 'none' }}>
                <Icon size={13} /> {pm.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Live Financial Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Invoices Issued</div>
            <div className="metric-value">{stats?.totalBills ?? bills.length}</div>
          </div>
          <CreditCard size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Collected Revenue</div>
            <div className="metric-value" style={{ color: '#10b981', fontSize: '1.4rem' }}>
              GHS {Number(stats?.totalCollected ?? annualReport?.executiveSummary?.totalRevenue ?? 0).toLocaleString()}
            </div>
          </div>
          <DollarSign size={20} style={{ color: '#10b981' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Outstanding Balance</div>
            <div className="metric-value" style={{ color: '#f59e0b', fontSize: '1.4rem' }}>
              GHS {Number(stats?.totalOutstanding ?? stats?.outstandingAmount ?? 0).toLocaleString()}
            </div>
          </div>
          <CheckCircle size={20} style={{ color: '#f59e0b' }} />
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`, color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7', fontSize: '0.84rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Create Invoice */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>Issue Patient Invoice</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient name or MRN..." style={{ width: '220px', padding: '6px 10px', fontSize: '0.8rem' }} />
            <button type="button" onClick={loadData} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
              <Search size={13} /> Find
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {patients.slice(0, 8).map((p) => (
            <button key={p.id} type="button" onClick={() => setSelectedPatient(p)} className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
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
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Category</label>
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

      {/* Collect Payment Modal/Bar */}
      {payingBill && (
        <div className="glass-panel" style={{ padding: '18px', border: '1px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ color: '#10b981' }}>Confirm Payment — Invoice {payingBill.billNumber || payingBill.id.slice(0, 8)} (Total: GHS {Number(payingBill.totalAmount || 0).toFixed(2)})</strong>
            <button type="button" onClick={() => setPayingBill(null)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>Cancel</button>
          </div>
          <form onSubmit={handleConfirmPayment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Payment Method *</label>
              <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((pm) => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount Paid (GHS) *</label>
              <input required type="number" step="0.01" value={payForm.amountPaid} onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })} placeholder={String(payingBill.balanceDue ?? payingBill.totalAmount ?? 0)} />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Transaction / MoMo / Bank Ref</label>
              <input type="text" value={payForm.transactionRef} onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })} placeholder="TXN-REFERENCE" />
            </div>
            <button type="submit" disabled={loading} className="btn-gold">Confirm &amp; Issue Receipt</button>
          </form>
        </div>
      )}

      {/* Invoices Table */}
      <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>
          Hospital Patient Bills &amp; Settlement Ledger ({bills.length})
        </h3>
        {bills.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No invoices created yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Total (GHS)</th>
                <th>Paid (GHS)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.slice(0, 30).map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{b.billNumber || b.id.slice(0, 8)}</td>
                  <td>{b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : (b.patientName || 'Patient')}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Number(b.totalAmount || 0).toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{Number(b.amountPaid || 0).toFixed(2)}</td>
                  <td><span className={b.status === 'PAID' ? 'badge badge-success' : 'badge badge-warning'}>{b.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {b.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingBill(b);
                            setPayForm({ amountPaid: String(b.balanceDue ?? b.totalAmount ?? ''), paymentMethod: 'MOBILE_MONEY', transactionRef: '' });
                          }}
                          className="btn-gold"
                          style={{ padding: '3px 9px', fontSize: '0.72rem' }}
                        >
                          Collect Payment
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_TRANSACTIONS', moduleKey: 'BILLING', recordId: b.id, title: `Invoice ${b.billNumber || b.id}`, recordData: b })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
