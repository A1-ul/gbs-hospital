import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Shield, Brain, AlertTriangle, CheckCircle, Search, RefreshCw, Lock, FileCheck, Eye } from 'lucide-react';

const AI_ASSISTANTS = [
  { id: 'TRIAGE_ASSISTANT', label: 'AI Triage Assistant', desc: 'NEWS2 + red-flag acuity triage recommendations' },
  { id: 'DIAGNOSIS_SUGGESTIONS', label: 'Diagnosis Suggestions', desc: 'ICD-10 differential diagnosis candidates' },
  { id: 'TREATMENT_SUGGESTIONS', label: 'Treatment Suggestions', desc: 'Guideline therapy cross-checked with allergies' },
  { id: 'DRUG_INTERACTION_CHECK', label: 'Drug Interaction Check', desc: 'Live drug-drug & allergy conflict check' },
  { id: 'CLINICAL_SUMMARIZATION', label: 'Clinical Summarization', desc: 'Structured SBAR patient clinical handoff' },
  { id: 'RISK_PREDICTION', label: 'Risk Prediction', desc: 'Sepsis, deterioration & polypharmacy risk score' }
];

export default function AiSafetyCenterView({ onNavigateDetail }) {
  const openDetail = (payload) => {
    const fn = onNavigateDetail || (typeof window !== 'undefined' ? window.gbsNavigateDetail : null);
    if (typeof fn === 'function') fn(payload);
  };
  const [guardrails, setGuardrails] = useState(null);
  const [aiTelemetry, setAiTelemetry] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAllergies, setPatientAllergies] = useState([]);

  // Allergy form
  const [allergyForm, setAllergyForm] = useState({ allergyName: '', allergyType: 'DRUG', severity: 'SEVERE', reaction: '' });
  // Drug interaction checker
  const [proposedMedsText, setProposedMedsText] = useState('Amoxicillin, Warfarin, Ibuprofen');
  const [safetyResult, setSafetyResult] = useState(null);
  const [overrideReasonInput, setOverrideReasonInput] = useState('');

  // AI Clinical Analysis form
  const [assistantType, setAssistantType] = useState('TRIAGE_ASSISTANT');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [reviewNotesMap, setReviewNotesMap] = useState({});
  const [finalDecisionMap, setFinalDecisionMap] = useState({});

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadAll = async () => {
    try {
      const [gr, aiTel, ovr, sug, pats] = await Promise.all([
        api.getSafetyGuardrailsStatus().catch(() => null),
        api.getAiClinicalTelemetry().catch(() => null),
        api.getClinicalSafetyOverrides().catch(() => ({ overrides: [] })),
        api.getAiClinicalSuggestions().catch(() => ({ suggestions: [] })),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setGuardrails(gr);
      setAiTelemetry(aiTel);
      setOverrides(ovr?.overrides || []);
      setSuggestions(sug?.suggestions || []);
      setPatients(Array.isArray(pats) ? pats : (pats?.patients || pats?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSelectPatient = async (pat) => {
    setSelectedPatient(pat);
    setSafetyResult(null);
    try {
      const al = await api.getPatientAllergies(pat.id);
      setPatientAllergies(al?.allergies || []);
    } catch (_e) {
      setPatientAllergies([]);
    }
  };

  const handleAddAllergy = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Select a patient before documenting an allergy.' });
      return;
    }
    setLoading(true);
    try {
      await api.recordPatientAllergy(selectedPatient.id, allergyForm);
      setAllergyForm({ allergyName: '', allergyType: 'DRUG', severity: 'SEVERE', reaction: '' });
      setFeedback({ type: 'success', msg: 'Patient allergy saved and immediately active in prescribing & pharmacy safety guardrails.' });
      await handleSelectPatient(selectedPatient);
      await loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRunSafetyCheck = async () => {
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Select a patient first to run real-time allergy & drug interaction screening.' });
      return;
    }
    const meds = proposedMedsText.split(',').map((s) => s.trim()).filter(Boolean);
    setLoading(true);
    try {
      const res = await api.checkClinicalMedicationSafety({ patientId: selectedPatient.id, proposedMedications: meds });
      setSafetyResult(res);
      setFeedback({
        type: res.safeToProceedWithoutOverride ? 'success' : 'error',
        msg: res.safeToProceedWithoutOverride
          ? 'Medication safety check clear — no blocking allergies or high-risk drug-drug interactions.'
          : `CLINICAL SAFETY ALERT: ${res.blockingAlertsCount} high-severity conflict(s) detected! Documented clinician override required.`
      });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogOverride = async (alert) => {
    if (!selectedPatient) return;
    if (!overrideReasonInput || overrideReasonInput.trim().length < 10) {
      setFeedback({ type: 'error', msg: 'Enter a clinical override justification of at least 10 characters first.' });
      return;
    }
    try {
      await api.recordClinicalSafetyOverride({
        patientId: selectedPatient.id,
        alertCategory: alert.category,
        severity: alert.severity,
        offendingMedication: alert.offendingMedication,
        conflictingAgent: alert.conflictingAgent,
        alertSummary: alert.summary,
        overrideReason: overrideReasonInput.trim()
      });
      setOverrideReasonInput('');
      setFeedback({ type: 'success', msg: 'Clinical override logged to PostgreSQL immutable audit trail.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleGenerateAiSuggestion = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Select a patient first to run AI Clinical Assistance.' });
      return;
    }
    setLoading(true);
    try {
      const meds = proposedMedsText.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.analyzeAiClinical({
        patientId: selectedPatient.id,
        assistantType,
        symptoms: symptomsInput,
        proposedMedications: meds
      });
      setFeedback({
        type: 'success',
        msg: `Advisory AI suggestion (${res.suggestionCode}) created in SUGGESTED status. Licensed clinician review & final decision required.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuggestion = async (sugId, decision) => {
    try {
      await api.reviewAiClinicalSuggestion(sugId, {
        decision,
        overrideNotes: reviewNotesMap[sugId] || ''
      });
      setFeedback({ type: 'success', msg: `Human clinician review recorded: ${decision}.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleFinalDecision = async (sugId) => {
    const decisionText = (finalDecisionMap[sugId] || '').trim();
    if (decisionText.length < 5) {
      setFeedback({ type: 'error', msg: 'Enter the licensed clinician Final Decision statement before signing.' });
      return;
    }
    try {
      await api.finalizeAiClinicalSuggestion(sugId, { finalDecisionText: decisionText });
      setFeedback({ type: 'success', msg: 'Final binding clinical decision signed and audited in PostgreSQL.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/quality_infection_control_real.jpg"
          alt="Patient Safety Guardrails & AI Clinical Assistance"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> Immutable Patient Safety Guardrails • Human-in-the-Loop AI
            </span>
            <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '4px 0' }}>
              Patient Safety Guardrails &amp; AI Clinical Assistance Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#fcd34d', margin: 0, fontWeight: 600 }}>
              All AI outputs are recommendations only. Final clinical decision always requires a licensed clinician.
            </p>
          </div>
          <button type="button" onClick={loadAll} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Safety &amp; AI Hub
          </button>
        </div>
      </div>

      {/* 7 Master Blueprint Immutable Patient Safety Guardrails Strip */}
      <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid #10b981' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={14} /> Permanent Patient Safety Guardrails (Cannot Be Disabled)
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            'Clinical Systems Never Lock',
            'Emergency Access Always Available',
            'All Suggestions Require Human Approval',
            'Clinical Override Logging Enabled',
            'Clinical Interaction Alerts Always Active',
            'Drug Interaction Alerts Always Active',
            'Allergy Alerts Never Disabled'
          ].map((rule) => (
            <span key={rule} className="badge badge-success" style={{ textTransform: 'none', fontSize: '0.72rem' }}>
              ✓ {rule}
            </span>
          ))}
        </div>
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

      {/* Patient Selector */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--gold-400)', fontSize: '0.92rem' }}>Select Active Patient for Safety Screening &amp; AI Review</strong>
            {selectedPatient && (
              <button
                type="button"
                onClick={() =>
                  openDetail({
                    detailType: 'VIEW_PROFILE',
                    moduleKey: 'AI_SAFETY',
                    recordId: String(selectedPatient.id),
                    title: `Patient Profile: ${selectedPatient.firstName} ${selectedPatient.lastName}`,
                    recordData: selectedPatient
                  })
                }
                className="btn-outline-gold"
                style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Eye size={12} /> View Patient Profile
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient name or MRN..." style={{ width: '220px', padding: '6px 10px', fontSize: '0.8rem' }} />
            <button type="button" onClick={loadAll} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              <Search size={13} /> Find
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {patients.slice(0, 8).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPatient(p)}
              className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'}
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            >
              {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
            </button>
          ))}
        </div>
      </div>

      {/* Dual Grid: Patient Allergies + Live Drug Safety Check */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        {/* Allergy Registry */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} /> Patient Allergy Registry ({patientAllergies.length} Active)
          </h3>
          <form onSubmit={handleAddAllergy} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <input required type="text" placeholder="Allergen (e.g. Penicillin, Sulfa, Aspirin)" value={allergyForm.allergyName} onChange={(e) => setAllergyForm({ ...allergyForm, allergyName: e.target.value })} />
            <select value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}>
              <option value="SEVERE">SEVERE (Anaphylaxis)</option>
              <option value="HIGH">HIGH</option>
              <option value="MODERATE">MODERATE</option>
              <option value="MILD">MILD</option>
            </select>
            <input type="text" placeholder="Reaction (e.g. Anaphylaxis, Hives)" value={allergyForm.reaction} onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })} />
            <button type="submit" disabled={loading} className="btn-danger">Document Allergy</button>
          </form>
          {patientAllergies.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No active allergies recorded for selected patient.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {patientAllergies.map((al) => (
                <div key={al.id} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>{al.allergyName}</strong> — {al.reaction || 'Hypersensitivity'}</span>
                  <span className="badge badge-danger">{al.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Drug-Interaction & Allergy Checker */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} /> Real-Time Drug Interaction &amp; Allergy Screening
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input type="text" value={proposedMedsText} onChange={(e) => setProposedMedsText(e.target.value)} placeholder="Comma-separated proposed medications" />
            <button type="button" onClick={handleRunSafetyCheck} disabled={loading} className="btn-gold" style={{ whiteSpace: 'nowrap' }}>
              Run Safety Check
            </button>
          </div>

          {safetyResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: safetyResult.safeToProceedWithoutOverride ? '#10b981' : '#ef4444' }}>
                Result: {safetyResult.highestSeverity} • {safetyResult.totalAlerts} Alert(s) ({safetyResult.blockingAlertsCount} Requiring Override)
              </div>
              {safetyResult.alerts.map((al, idx) => (
                <div key={idx} style={{ padding: '10px', borderRadius: '6px', background: 'rgba(239,68,68,0.14)', border: '1px solid #ef4444', fontSize: '0.76rem' }}>
                  <div style={{ fontWeight: 700, color: '#fca5a5' }}>{al.summary}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '3px' }}>{al.recommendation}</div>
                  {al.requiresOverride && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <input type="text" placeholder="Clinical override rationale (>= 10 chars)..." value={overrideReasonInput} onChange={(e) => setOverrideReasonInput(e.target.value)} style={{ fontSize: '0.74rem', padding: '5px 8px' }} />
                      <button type="button" onClick={() => handleLogOverride(al)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        Log Override
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Clinical Assistance — Mandatory 4-Step Human Approval Workflow */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} /> AI Clinical Assistance (Human Approval Workflow Required)
            </h3>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Workflow: <strong>1. Suggest</strong> → <strong>2. Review by Human</strong> → <strong>3. Override (if needed)</strong> → <strong>4. Final Decision</strong> • Pending Review: {aiTelemetry?.awaitingReview ?? 0} | Signed Decisions: {aiTelemetry?.finalDecisionsRecorded ?? 0}
            </div>
          </div>
        </div>

        {/* 6 Assistant Selector Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {AI_ASSISTANTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAssistantType(a.id)}
              className={assistantType === a.id ? 'btn-gold' : 'btn-outline-gold'}
              style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{a.label}</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 500 }}>{a.desc}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleGenerateAiSuggestion} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <input
            type="text"
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
            placeholder="Enter clinical symptoms, vitals context, or handoff notes (e.g. fever, chills, chest pain)..."
            style={{ flex: 1, minWidth: '280px' }}
          />
          <button type="submit" disabled={loading} className="btn-gold">
            <Brain size={15} /> {loading ? 'Analyzing EHR...' : `Run ${assistantType.replace(/_/g, ' ')}`}
          </button>
        </form>

        {/* Suggestions Queue with Mandatory Human Review / Override / Final Decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suggestions.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '14px', textAlign: 'center', background: 'rgba(6,12,24,0.6)', borderRadius: '8px' }}>
              No AI clinical suggestions recorded yet. Select a patient and run an advisory check above.
            </div>
          ) : (
            suggestions.slice(0, 10).map((s) => (
              <div key={s.id} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 800, marginRight: '8px' }}>{s.suggestionCode}</span>
                    <span className="badge badge-cyan" style={{ marginRight: '6px' }}>{s.assistantType}</span>
                    <span className={s.riskLevel === 'CRITICAL' ? 'badge badge-danger' : s.riskLevel === 'HIGH' ? 'badge badge-warning' : 'badge badge-success'}>
                      {s.riskLevel} RISK
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-gold">{s.workflowStatus}</span>
                    <button
                      type="button"
                      onClick={() =>
                        openDetail({
                          detailType: 'VIEW_DETAILS',
                          moduleKey: 'AI_SAFETY',
                          recordId: String(s.suggestionCode || s.id),
                          title: `AI Clinical Suggestion: ${s.suggestionCode}`,
                          recordData: s
                        })
                      }
                      className="btn-outline-gold"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={11} /> Details
                    </button>
                  </div>
                </div>

              <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
                {s.patient ? `${s.patient.firstName} ${s.patient.lastName} (${s.patient.patientNumber}) — ` : ''}{s.recommendationSummary}
              </div>

              <ul style={{ margin: '6px 0 10px 18px', padding: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {(Array.isArray(s.recommendations) ? s.recommendations : []).map((r, idx) => (
                  <li key={idx}><strong>{r.title}:</strong> {r.detail}</li>
                ))}
              </ul>

              <div style={{ fontSize: '0.72rem', color: '#fcd34d', fontStyle: 'italic', marginBottom: '10px' }}>
                {s.disclaimer}
              </div>

              {s.workflowStatus !== 'FINAL_DECISION_RECORDED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Clinician review / override notes (mandatory >= 10 chars if overriding)..."
                      value={reviewNotesMap[s.id] || ''}
                      onChange={(e) => setReviewNotesMap({ ...reviewNotesMap, [s.id]: e.target.value })}
                      style={{ flex: 1, minWidth: '220px', fontSize: '0.76rem', padding: '6px 10px' }}
                    />
                    <button type="button" onClick={() => handleReviewSuggestion(s.id, 'APPROVE')} className="btn-gold" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                      <CheckCircle size={13} /> 2. Approve
                    </button>
                    <button type="button" onClick={() => handleReviewSuggestion(s.id, 'OVERRIDE')} className="btn-outline-gold" style={{ padding: '5px 10px', fontSize: '0.74rem', borderColor: '#f59e0b', color: '#fcd34d' }}>
                      3. Override
                    </button>
                    <button type="button" onClick={() => handleReviewSuggestion(s.id, 'REJECT')} className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.74rem' }}>
                      Reject
                    </button>
                  </div>

                  {s.reviewedById && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Step 4 — Enter binding Licensed Clinician Final Decision..."
                        value={finalDecisionMap[s.id] || ''}
                        onChange={(e) => setFinalDecisionMap({ ...finalDecisionMap, [s.id]: e.target.value })}
                        style={{ flex: 1, minWidth: '240px', fontSize: '0.76rem', padding: '6px 10px' }}
                      />
                      <button type="button" onClick={() => handleFinalDecision(s.id)} className="btn-gold" style={{ padding: '5px 12px', fontSize: '0.74rem' }}>
                        <FileCheck size={13} /> 4. Sign Final Decision
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.4)', fontSize: '0.78rem', color: '#6ee7b7' }}>
                  <strong>Final Clinician Decision ({s.finalDecidedByName} • {s.finalDecidedByRole}):</strong> {s.finalDecisionText}
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {/* Immutable Clinical Safety Overrides Table */}
      <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)' }}>
          Immutable Clinical Override Audit Trail ({overrides.length})
        </h3>
        {overrides.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No clinical safety overrides logged yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Override #</th>
                <th>Patient</th>
                <th>Category / Severity</th>
                <th>Conflict</th>
                <th>Clinician Rationale</th>
                <th>Clinician</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((ov) => (
                <tr key={ov.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{ov.overrideCode}</td>
                  <td>{ov.patient ? `${ov.patient.firstName} ${ov.patient.lastName}` : ov.patientId}</td>
                  <td><span className="badge badge-warning">{ov.alertCategory} • {ov.severity}</span></td>
                  <td style={{ fontSize: '0.78rem' }}>{ov.offendingMedication} vs {ov.conflictingAgent}</td>
                  <td style={{ fontSize: '0.78rem', color: '#fff' }}>{ov.overrideReason}</td>
                  <td style={{ fontSize: '0.76rem' }}>{ov.clinicianName} ({ov.clinicianRole})</td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        openDetail({
                          detailType: 'VIEW_DETAILS',
                          moduleKey: 'AI_SAFETY',
                          recordId: String(ov.overrideCode || ov.id),
                          title: `Safety Override Audit: ${ov.overrideCode}`,
                          recordData: ov
                        })
                      }
                      className="btn-outline-gold"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={11} /> Details
                    </button>
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
