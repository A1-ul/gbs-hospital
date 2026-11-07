import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, AlertTriangle, ShieldCheck, 
  Send, RefreshCw, PlusCircle, Search, CreditCard, 
  Download, Eye, Lock, FileCheck, DollarSign, Award, X
} from 'lucide-react';
import { api } from '../../services/api.service';

export default function NhiaClaimsView() {
  const [activeTab, setActiveTab] = useState('BATCHES'); // BATCHES, CLAIMS, ELIGIBILITY, VOUCHERS
  const [telemetry, setTelemetry] = useState(null);
  const [catalogs, setCatalogs] = useState({ gdrgTariffs: [], rejectionReasons: [], memberCategories: [] });
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchClaims, setBatchClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [eclaimsPayload, setEclaimsPayload] = useState(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedClaimForAppeal, setSelectedClaimForAppeal] = useState(null);

  // Form states
  const [batchForm, setBatchForm] = useState({
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    providerNumber: 'HOSP-ACC-00124',
    providerName: 'GBS Central Teaching Hospital',
    submissionType: 'E_CLAIMS_XML'
  });

  const [claimForm, setClaimForm] = useState({
    patientId: 'PAT-2026-0001',
    patientName: '',
    nhisNumber: '',
    gender: 'M',
    dateOfBirth: '1990-01-01',
    encounterType: 'OPD',
    gdrgCode: 'GDRG-OPD-01',
    primaryDiagnosisIcd10: 'B54.0',
    secondaryDiagnosisIcd10: '',
    claimedAmount: 45.00,
    copayPaid: 0.00
  });

  const [voucherForm, setVoucherForm] = useState({
    withholdingTaxPercent: 5.0,
    paymentReference: 'TRF-BOG-GHANA-90124',
    adjudicatorNote: 'Cleared by NHIA Financial Comptroller & Internal Auditor.'
  });

  const [eligibilityQuery, setEligibilityQuery] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const [appealForm, setAppealForm] = useState({
    appealNotes: '',
    correctiveIcd10: ''
  });

  // Load telemetry and catalogs
  const loadData = async () => {
    setLoading(true);
    try {
      const [telRes, catRes, batchRes] = await Promise.all([
        api.getNhiaTelemetry(),
        api.getNhiaCatalogs(),
        api.getNhiaBatches()
      ]);
      setTelemetry(telRes.data || null);
      setCatalogs(catRes.data || { gdrgTariffs: [], rejectionReasons: [], memberCategories: [] });
      setBatches(batchRes.data || []);
      if (batchRes.data && batchRes.data.length > 0 && !selectedBatch) {
        selectBatch(batchRes.data[0]);
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed loading NHIA data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectBatch = async (b) => {
    setSelectedBatch(b);
    try {
      const res = await api.getNhiaBatchClaims(b.id);
      setBatchClaims(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.createNhiaBatch(batchForm);
      setFeedback({ type: 'success', msg: `Initialized Claims Batch ${res.data.batchNumber}` });
      setShowCreateBatchModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setFeedback(null);
    try {
      const res = await api.addNhiaClaim(selectedBatch.id, claimForm);
      setFeedback({ type: 'success', msg: `Added Claim ${res.data.claimNumber} (${res.data.gdrgCode}) to batch` });
      setShowAddClaimModal(false);
      selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRunVetting = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.vetNhiaBatch(selectedBatch.id);
      setFeedback({ 
        type: 'success', 
        msg: `Vetting Complete: ${res.data.vettedPassed} Claims Cleared, ${res.data.vettedFlagged} Flagged for Audit.` 
      });
      selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayload = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      const res = await api.getNhiaEClaimsPayload(selectedBatch.id);
      setEclaimsPayload(res.data);
      setShowPayloadModal(true);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.submitNhiaBatch(selectedBatch.id);
      setFeedback({ 
        type: 'success', 
        msg: `Batch Submitted! NHIA Receipt Code: ${res.data.submissionReceipt} (SHA-256 Verified)` 
      });
      selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjudicateBatch = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.adjudicateNhiaBatch(selectedBatch.id, {});
      setFeedback({ 
        type: 'success', 
        msg: `Electronic Adjudication Processed: Approved GHS ${res.data.totalApprovedAmount}, Rejected GHS ${res.data.totalRejectedAmount}` 
      });
      selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueVoucher = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setFeedback(null);
    try {
      const res = await api.generateNhiaVoucher(selectedBatch.id, voucherForm);
      setFeedback({ 
        type: 'success', 
        msg: `Settlement Voucher Issued: ${res.data.voucherNumber} (Net Payout: GHS ${res.data.netDisbursedAmount})` 
      });
      setShowVoucherModal(false);
      selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCheckEligibility = async (e) => {
    if (e) e.preventDefault();
    if (!eligibilityQuery) return;
    setEligibilityLoading(true);
    try {
      const res = await api.checkNhisEligibility(eligibilityQuery.trim());
      setEligibilityResult(res.data);
    } catch (err) {
      setEligibilityResult({ error: err.message });
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleAppealClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaimForAppeal) return;
    setFeedback(null);
    try {
      await api.appealNhiaClaim(selectedClaimForAppeal.id, appealForm);
      setFeedback({ type: 'success', msg: `Appeal submitted for claim ${selectedClaimForAppeal.claimNumber}` });
      setShowAppealModal(false);
      if (selectedBatch) selectBatch(selectedBatch);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Real-Life Photographic Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          position: 'relative', 
          height: '240px', 
          borderRadius: '10px', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'flex-end', 
          padding: '30px',
          border: '1px solid var(--border-gold-strong)',
          boxShadow: 'var(--shadow-gold)'
        }}
      >
        <img 
          src="/assets/images/nhia_claims_center_real.jpg" 
          alt="NHIA Claims Office and Electronic Adjudication Complex" 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 25%, rgba(10,9,7,0.5) 80%, rgba(10,9,7,0.2) 100%)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-gold" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
                <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                REPUBLIC OF GHANA • NATIONAL HEALTH INSURANCE SCHEME
              </span>
              <span className="badge badge-outline-gold" style={{ fontSize: '0.75rem' }}>
                PROVIDER ID: HOSP-ACC-00124
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.9rem', color: '#fff', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              NHIA Claims Batches & Electronic Adjudication
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--gold-300)', fontSize: '0.9rem', maxWidth: '850px' }}>
              Full-lifecycle health insurance claims compilation, G-DRG diagnostic tariff validation, automated pre-submission vetting, 
              cryptographically secured E-Claims transmission, electronic adjudication reconciliation, and official settlement vouchers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowCreateBatchModal(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={15} /> New Monthly Batch
            </button>
            <button onClick={() => setShowEligibilityModal(true)} className="btn-outline-gold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={15} /> Check Eligibility
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`alert-banner ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* KPI Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>TOTAL VALUE CLAIMED</span>
            <DollarSign size={16} style={{ color: 'var(--gold-400)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)', marginTop: '8px' }}>
            GHS {telemetry?.financials?.totalClaimedGhs?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {telemetry?.totalClaims || 0} claims in {telemetry?.totalBatches || 0} batches
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>ADJUDICATED APPROVED</span>
            <CheckCircle size={16} style={{ color: '#22c55e' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e', marginTop: '8px' }}>
            GHS {telemetry?.financials?.totalApprovedGhs?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#86efac', marginTop: '4px' }}>
            Approval Rate: {telemetry?.financials?.approvalRatePercent ?? 0}%
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>REJECTED CLAIMS VALUE</span>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '8px' }}>
            GHS {telemetry?.financials?.totalRejectedGhs?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>
            {telemetry?.claimStatus?.rejected || 0} rejected • {telemetry?.claimStatus?.appealed || 0} appealed
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>NET DISBURSED PAYOUT</span>
            <CreditCard size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '8px' }}>
            GHS {telemetry?.financials?.netDisbursedGhs?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {telemetry?.vouchersIssuedCount || 0} official vouchers issued
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-gold)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('BATCHES')}
          className={activeTab === 'BATCHES' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          1. Claims Batches Console
        </button>
        <button 
          onClick={() => setActiveTab('CLAIMS')}
          className={activeTab === 'CLAIMS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          2. Batch Claims ({batchClaims.length})
        </button>
        <button 
          onClick={() => setActiveTab('ELIGIBILITY')}
          className={activeTab === 'ELIGIBILITY' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          3. NHIS Member Eligibility
        </button>
        <button 
          onClick={() => setActiveTab('TARIFFS')}
          className={activeTab === 'TARIFFS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          4. G-DRG Tariffs Catalog
        </button>
      </div>

      {/* TAB 1: BATCHES CONSOLE */}
      {activeTab === 'BATCHES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--gold-400)', fontSize: '1.1rem' }}>
                Monthly E-Claims Batches Register
              </h3>
              <button onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-gold)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>BATCH NUMBER</th>
                    <th style={{ padding: '10px' }}>PERIOD</th>
                    <th style={{ padding: '10px' }}>CLAIMS</th>
                    <th style={{ padding: '10px' }}>CLAIMED (GHS)</th>
                    <th style={{ padding: '10px' }}>APPROVED (GHS)</th>
                    <th style={{ padding: '10px' }}>STATUS</th>
                    <th style={{ padding: '10px' }}>RECEIPT / ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr 
                      key={b.id} 
                      onClick={() => selectBatch(b)}
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)', 
                        background: selectedBatch?.id === b.id ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--gold-400)' }}>
                        {b.batchNumber}
                      </td>
                      <td style={{ padding: '10px' }}>{b.periodMonth}/{b.periodYear}</td>
                      <td style={{ padding: '10px' }}>{b.totalClaimsCount}</td>
                      <td style={{ padding: '10px' }}>GHS {parseFloat(b.totalClaimedAmount).toFixed(2)}</td>
                      <td style={{ padding: '10px', color: '#22c55e' }}>
                        {b.totalApprovedAmount ? `GHS ${parseFloat(b.totalApprovedAmount).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${
                          b.status === 'RECONCILED' ? 'badge-success' :
                          b.status === 'ADJUDICATED' ? 'badge-primary' :
                          b.status === 'SUBMITTED' ? 'badge-info' :
                          b.status === 'VETTED_READY' ? 'badge-gold' : 'badge-outline-gold'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {b.submissionReceipt && (
                            <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              {b.submissionReceipt}
                            </span>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); selectBatch(b); setActiveTab('CLAIMS'); }} 
                            className="btn-outline-gold" 
                            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No claims batches initialized yet. Click "+ New Monthly Batch" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Batch Action Deck */}
          {selectedBatch && (
            <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--border-gold-strong)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--gold-400)', fontSize: '1rem' }}>
                    Active Workflow Console: {selectedBatch.batchNumber}
                  </h4>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Provider: {selectedBatch.providerName} ({selectedBatch.providerNumber}) • Period: {selectedBatch.periodMonth}/{selectedBatch.periodYear} • Status: {selectedBatch.status}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowAddClaimModal(true)} className="btn-gold" style={{ fontSize: '0.8rem' }}>
                    <PlusCircle size={14} /> Add Claim
                  </button>

                  <button onClick={handleRunVetting} className="btn-outline-gold" style={{ fontSize: '0.8rem' }}>
                    <ShieldCheck size={14} /> Run Automated Vetting
                  </button>

                  <button onClick={handleViewPayload} className="btn-outline-gold" style={{ fontSize: '0.8rem' }}>
                    <Eye size={14} /> View E-Claims XML
                  </button>

                  <button 
                    onClick={handleSubmitBatch} 
                    className="btn-gold" 
                    disabled={selectedBatch.status === 'SUBMITTED' || selectedBatch.status === 'ADJUDICATED' || selectedBatch.status === 'RECONCILED'}
                    style={{ fontSize: '0.8rem', background: '#38bdf8', borderColor: '#38bdf8', color: '#000' }}
                  >
                    <Send size={14} /> Submit to NHIA
                  </button>

                  <button 
                    onClick={handleAdjudicateBatch} 
                    className="btn-outline-gold" 
                    style={{ fontSize: '0.8rem', borderColor: '#22c55e', color: '#22c55e' }}
                  >
                    <CheckCircle size={14} /> Electronic Adjudication
                  </button>

                  <button 
                    onClick={() => setShowVoucherModal(true)} 
                    className="btn-gold" 
                    disabled={selectedBatch.status !== 'ADJUDICATED'}
                    style={{ fontSize: '0.8rem', background: '#eab308', color: '#000' }}
                  >
                    <FileCheck size={14} /> Issue Reconciliation Voucher
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLAIMS REGISTER */}
      {activeTab === 'CLAIMS' && (
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--gold-400)', fontSize: '1.1rem' }}>
                Encounter Claims in {selectedBatch?.batchNumber || 'Batch'}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Validated against Ghana Diagnostic-Related Groups (G-DRG) & ICD-10 diagnostic protocols
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddClaimModal(true)} className="btn-gold" style={{ fontSize: '0.8rem' }}>
                <PlusCircle size={14} /> Add Claim to Batch
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-gold)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>CLAIM #</th>
                  <th style={{ padding: '10px' }}>PATIENT / NHIS NUMBER</th>
                  <th style={{ padding: '10px' }}>G-DRG TARIFF</th>
                  <th style={{ padding: '10px' }}>ICD-10 DIAGNOSIS</th>
                  <th style={{ padding: '10px' }}>CLAIMED</th>
                  <th style={{ padding: '10px' }}>APPROVED</th>
                  <th style={{ padding: '10px' }}>STATUS</th>
                  <th style={{ padding: '10px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {batchClaims.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--gold-400)' }}>
                      {c.claimNumber}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{c.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.nhisNumber} ({c.nhisCardValidity})</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{c.gdrgCode}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.gdrgDescription}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-outline-gold" style={{ fontSize: '0.75rem' }}>
                        {c.primaryDiagnosisIcd10}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>
                      GHS {parseFloat(c.claimedAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', color: '#22c55e', fontWeight: 700 }}>
                      {c.approvedAmount !== null ? `GHS ${parseFloat(c.approvedAmount).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`badge ${
                        c.adjudicationStatus === 'APPROVED_FULL' ? 'badge-success' :
                        c.adjudicationStatus === 'REJECTED' ? 'badge-danger' :
                        c.adjudicationStatus === 'APPEALED' ? 'badge-gold' :
                        c.adjudicationStatus === 'VETTING_FLAGGED' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {c.adjudicationStatus}
                      </span>
                      {c.rejectionReason && (
                        <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '2px' }}>
                          {c.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {c.adjudicationStatus === 'REJECTED' && (
                        <button 
                          onClick={() => { setSelectedClaimForAppeal(c); setShowAppealModal(true); }}
                          className="btn-outline-gold" 
                          style={{ fontSize: '0.75rem', padding: '2px 8px', borderColor: '#eab308', color: '#eab308' }}
                        >
                          Appeal
                        </button>
                      )}
                      {c.adjudicationStatus === 'APPEALED' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>Under Appeal</span>
                      )}
                    </td>
                  </tr>
                ))}
                {batchClaims.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No claims added to this batch yet. Click "+ Add Claim to Batch" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBER ELIGIBILITY CHECKER */}
      {activeTab === 'ELIGIBILITY' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--gold-400)', fontSize: '1.1rem' }}>
              Real-Time NHIS Eligibility & Policy Verification
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Verify membership status, Ghana Card integration, copayment exemptions, and primary provider gatekeeper assignment.
            </p>

            <form onSubmit={handleCheckEligibility} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Enter NHIS Number (e.g. NHIS-GH-123456)" 
                value={eligibilityQuery} 
                onChange={e => setEligibilityQuery(e.target.value)} 
                required 
                style={{ flex: 1, padding: '10px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              />
              <button type="submit" className="btn-gold" disabled={eligibilityLoading}>
                {eligibilityLoading ? 'Verifying...' : 'Verify Member'}
              </button>
            </form>

            {eligibilityResult && !eligibilityResult.error && (
              <div style={{ border: '1px solid var(--border-gold-strong)', padding: '16px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{eligibilityResult.fullName}</h4>
                  <span className={`badge ${eligibilityResult.isEligibleForCare ? 'badge-success' : 'badge-danger'}`}>
                    {eligibilityResult.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>NHIS Card:</span> {eligibilityResult.nhisNumber}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Ghana Card:</span> {eligibilityResult.ghanaCardNumber || 'Verified'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Member Type:</span> {eligibilityResult.memberType}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Gatekeeper:</span> {eligibilityResult.primaryFacilityCode}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Expiry Date:</span> {new Date(eligibilityResult.expiryDate).toLocaleDateString()}</div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Copayment:</span> 
                    <span style={{ color: eligibilityResult.copayRequired ? '#eab308' : '#22c55e', fontWeight: 700, marginLeft: '4px' }}>
                      {eligibilityResult.copayRequired ? 'Standard Copay' : '100% Fully Exempt'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--gold-400)', fontSize: '1.1rem' }}>
              NHIA Member Exemption Schemes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              {catalogs.memberCategories.map(mc => (
                <div key={mc.code} style={{ border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--gold-300)' }}>{mc.label}</span>
                    <span className={`badge ${mc.copayRequired ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                      {mc.copayRequired ? 'Copay Required' : 'Exempt'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Code: {mc.code} • Covered under National Health Insurance Act
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: G-DRG TARIFFS */}
      {activeTab === 'TARIFFS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', color: 'var(--gold-400)', fontSize: '1.1rem' }}>
            Ghana Diagnostic-Related Group (G-DRG) Tariff Schedule
          </h3>
          <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Authoritative national tariff schedule applied for electronic adjudication and billing claim reconciliation.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-gold)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>G-DRG CODE</th>
                  <th style={{ padding: '10px' }}>SERVICE / CLINICAL CONDITION</th>
                  <th style={{ padding: '10px' }}>CATEGORY</th>
                  <th style={{ padding: '10px' }}>NATIONAL TARIFF (GHS)</th>
                  <th style={{ padding: '10px' }}>COPAY STATUS</th>
                </tr>
              </thead>
              <tbody>
                {catalogs.gdrgTariffs.map(t => (
                  <tr key={t.code} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--gold-400)' }}>{t.code}</td>
                    <td style={{ padding: '10px' }}>{t.name}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-outline-gold" style={{ fontSize: '0.75rem' }}>{t.category}</span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#22c55e' }}>
                      GHS {parseFloat(t.tariffGhs).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {t.copayExempt ? (
                        <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>Fully Exempt</span>
                      ) : (
                        <span style={{ color: '#eab308', fontSize: '0.75rem' }}>Standard Copay</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BATCH */}
      {showCreateBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', border: '1px solid var(--border-gold-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--gold-400)' }}>Initialize Monthly Claims Batch</h3>
              <button onClick={() => setShowCreateBatchModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period Month *</label>
                  <select value={batchForm.periodMonth} onChange={e => setBatchForm({ ...batchForm, periodMonth: parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period Year *</label>
                  <input type="number" value={batchForm.periodYear} onChange={e => setBatchForm({ ...batchForm, periodYear: parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider Code *</label>
                <input type="text" value={batchForm.providerNumber} onChange={e => setBatchForm({ ...batchForm, providerNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider Facility Name *</label>
                <input type="text" value={batchForm.providerName} onChange={e => setBatchForm({ ...batchForm, providerName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>E-Claims Schema Format *</label>
                <select value={batchForm.submissionType} onChange={e => setBatchForm({ ...batchForm, submissionType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="E_CLAIMS_XML">NHIA XML Standard v2.4 (Encrypted)</option>
                  <option value="E_CLAIMS_JSON">NHIA JSON REST Transmission</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowCreateBatchModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Initialize Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CLAIM */}
      {showAddClaimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', border: '1px solid var(--border-gold-strong)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--gold-400)' }}>Add Encounter Claim to Batch</h3>
              <button onClick={() => setShowAddClaimModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddClaim} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Name *</label>
                  <input required type="text" placeholder="e.g. Abena Serwaa" value={claimForm.patientName} onChange={e => setClaimForm({ ...claimForm, patientName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NHIS Card Number *</label>
                  <input required type="text" placeholder="e.g. NHIS-GH-789012" value={claimForm.nhisNumber} onChange={e => setClaimForm({ ...claimForm, nhisNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Encounter Type</label>
                  <select value={claimForm.encounterType} onChange={e => setClaimForm({ ...claimForm, encounterType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="OPD">OPD Consultation</option>
                    <option value="IPD">Inpatient Admission</option>
                    <option value="SURGERY">Surgical Case</option>
                    <option value="EMERGENCY">Emergency / EMS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                  <select value={claimForm.gender} onChange={e => setClaimForm({ ...claimForm, gender: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary ICD-10 Code *</label>
                  <input required type="text" placeholder="e.g. B54.0 or O80.0" value={claimForm.primaryDiagnosisIcd10} onChange={e => setClaimForm({ ...claimForm, primaryDiagnosisIcd10: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>G-DRG Tariff Classification *</label>
                <select 
                  value={claimForm.gdrgCode} 
                  onChange={e => {
                    const code = e.target.value;
                    const tariff = catalogs.gdrgTariffs.find(t => t.code === code);
                    setClaimForm({
                      ...claimForm,
                      gdrgCode: code,
                      claimedAmount: tariff ? tariff.tariffGhs : claimForm.claimedAmount
                    });
                  }}
                  style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
                >
                  {catalogs.gdrgTariffs.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.code} — {t.name} (GHS {t.tariffGhs})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claimed Amount (GHS) *</label>
                  <input required type="number" step="0.01" value={claimForm.claimedAmount} onChange={e => setClaimForm({ ...claimForm, claimedAmount: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Copay Paid (GHS)</label>
                  <input type="number" step="0.01" value={claimForm.copayPaid} onChange={e => setClaimForm({ ...claimForm, copayPaid: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAddClaimModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Add Claim to Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW E-CLAIMS XML/JSON PAYLOAD */}
      {showPayloadModal && eclaimsPayload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '24px', border: '1px solid var(--border-gold-strong)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--gold-400)' }}>NHIA Compliant E-Claims XML Payload</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  SHA-256 Checksum: <code style={{ color: '#38bdf8' }}>{eclaimsPayload.payloadChecksum}</code>
                </div>
              </div>
              <button onClick={() => setShowPayloadModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <pre style={{ background: '#0a0907', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', color: '#86efac', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '400px' }}>
              {eclaimsPayload.xmlPayload}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button 
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(eclaimsPayload.xmlPayload);
                  }
                  setFeedback({ type: 'success', msg: 'E-Claims XML payload copied to clipboard.' });
                }} 
                className="btn-outline-gold"
              >
                Copy XML Payload
              </button>
              <button
                onClick={() => {
                  setShowPayloadModal(false);
                  if (window.gbsNavigateDetail) {
                    window.gbsNavigateDetail({
                      detailType: 'VIEW_REPORTS',
                      recordId: eclaimsPayload.batchNumber || 'ECLAIMS_XML',
                      title: `NHIA E-Claims XML Transmission Dossier — ${eclaimsPayload.batchNumber || ''}`,
                      payload: eclaimsPayload
                    });
                  }
                }}
                className="btn-outline-gold"
              >
                Open Dedicated Page
              </button>
              <button onClick={() => setShowPayloadModal(false)} className="btn-gold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECONCILIATION VOUCHER */}
      {showVoucherModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border-gold-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--gold-400)' }}>Issue NHIA Reconciliation Voucher</h3>
              <button onClick={() => setShowVoucherModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleIssueVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Withholding Tax (%) *</label>
                <input required type="number" step="0.1" value={voucherForm.withholdingTaxPercent} onChange={e => setVoucherForm({ ...voucherForm, withholdingTaxPercent: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Electronic Treasury Transfer Reference *</label>
                <input required type="text" value={voucherForm.paymentReference} onChange={e => setVoucherForm({ ...voucherForm, paymentReference: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auditor Certification Note *</label>
                <textarea rows={3} required value={voucherForm.adjudicatorNote} onChange={e => setVoucherForm({ ...voucherForm, adjudicatorNote: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowVoucherModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Authorize & Issue Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPEAL CLAIM */}
      {showAppealModal && selectedClaimForAppeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border-gold-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--gold-400)' }}>Clinical Appeal: {selectedClaimForAppeal.claimNumber}</h3>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>
                  Rejection Reason: {selectedClaimForAppeal.rejectionReason}
                </div>
              </div>
              <button onClick={() => setShowAppealModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAppealClaim} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corrective ICD-10 Diagnosis (if applicable)</label>
                <input type="text" placeholder="e.g. B50.9" value={appealForm.correctiveIcd10} onChange={e => setAppealForm({ ...appealForm, correctiveIcd10: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Justification & Regulatory Evidence *</label>
                <textarea rows={4} required placeholder="State clinical rationale, attaching proof of card renewal or consultant co-signature..." value={appealForm.appealNotes} onChange={e => setAppealForm({ ...appealForm, appealNotes: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAppealModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Submit Clinical Appeal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
