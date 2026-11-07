import React, { useState, useEffect } from 'react';
import { 
  Database, UploadCloud, RefreshCw, CheckCircle, AlertTriangle, 
  RotateCcw, FileText, Settings, ArrowRight, Play, Eye, 
  Layers, ShieldAlert, Cpu, Download, Sparkles, Filter, X, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api.service';

export default function MigrationView() {
  const [activeTab, setActiveTab] = useState('PIPELINE'); // PIPELINE, JOBS, TEMPLATES, TELEMETRY
  const [telemetry, setTelemetry] = useState(null);
  const [catalogs, setCatalogs] = useState({ supportedSources: [], targetEntities: {} });
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Active Wizard Pipeline State
  const [wizardStep, setWizardStep] = useState(1); // 1: Upload, 2: Mapping, 3: Validation Preview, 4: Execute / Rollback
  const [activeJob, setActiveJob] = useState(null);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [validationSummary, setValidationSummary] = useState(null);
  const [sampleItems, setSampleItems] = useState([]);

  // Upload Form (Zero pre-filled fake records)
  const [uploadForm, setUploadForm] = useState({
    targetEntity: 'PATIENTS',
    sourceType: 'CSV',
    fileName: '',
    rawData: ''
  });

  // Template Save State
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState('SKIP');

  // Job Details Modal
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCatalogs();
    fetchTelemetry();
    fetchJobs();
    fetchTemplates();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const res = await api.getMigrationCatalogs();
      if (res && res.data) {
        setCatalogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load migration catalogs:', err);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await api.getMigrationTelemetry();
      if (res && res.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.error('Failed to load migration telemetry:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.getMigrationJobs();
      if (res && res.data) {
        setJobs(res.data);
      }
    } catch (err) {
      console.error('Failed to load migration jobs:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.getMigrationTemplates();
      if (res && res.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // 1. Initialize Upload
  const handleInitializeJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.initializeMigrationJob(uploadForm);
      if (res && res.success) {
        setActiveJob(res.data.job);
        setDetectedHeaders(res.data.detectedHeaders || []);
        
        // Auto-guess column mappings based on entity requirements
        const spec = catalogs.targetEntities[uploadForm.targetEntity];
        const initialMap = {};
        if (spec && spec.fields) {
          spec.fields.forEach(f => {
            const matchedHeader = res.data.detectedHeaders.find(h => 
              h.toLowerCase() === f.key.toLowerCase() ||
              h.toLowerCase().includes(f.key.toLowerCase()) ||
              f.key.toLowerCase().includes(h.toLowerCase())
            );
            if (matchedHeader) {
              initialMap[f.key] = matchedHeader;
            }
          });
        }
        setColumnMappings(initialMap);
        setWizardStep(2);
        setFeedback({ type: 'success', text: `Job ${res.data.job.jobCode} initialized with ${res.data.totalRecords} records.` });
        fetchJobs();
        fetchTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Initialization failed' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Apply Column Mappings & Validate
  const handleApplyMapping = async () => {
    if (!activeJob) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.applyMigrationMapping(activeJob.id, {
        columnMappings,
        saveAsTemplate: !!saveTemplateName.trim(),
        templateName: saveTemplateName.trim() || undefined
      });

      if (res && res.success) {
        setActiveJob(res.data.job);
        setValidationSummary(res.data.summary);
        setSampleItems(res.data.sampleItems || []);
        setWizardStep(3);
        setFeedback({ type: 'success', text: `Mapping validated: ${res.data.summary.valid} valid, ${res.data.summary.duplicate} duplicates, ${res.data.summary.invalid} invalid.` });
        fetchJobs();
        fetchTelemetry();
        if (saveTemplateName.trim()) fetchTemplates();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Validation failed' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Human Approval Gate
  const handleApproveJob = async () => {
    if (!activeJob) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.approveMigrationJob(activeJob.id);
      if (res && res.success) {
        setActiveJob(res.data);
        setFeedback({ type: 'success', text: `Job ${res.data.jobCode} approved by Clinical Informatics Officer. Ready for database execution.` });
        fetchJobs();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Approval failed' });
    } finally {
      setLoading(false);
    }
  };

  // 4. Execute Background Import
  const handleExecuteImport = async () => {
    if (!activeJob) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.executeMigrationImport(activeJob.id, { duplicateStrategy });
      if (res && res.success) {
        setActiveJob(res.data.job);
        setWizardStep(4);
        setFeedback({ type: 'success', text: `Import complete! ${res.data.summary.imported} records written to PostgreSQL database.` });
        fetchJobs();
        fetchTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Import execution failed' });
    } finally {
      setLoading(false);
    }
  };

  // 5. Atomic Rollback
  const handleRollback = async (jobId) => {
    const targetId = jobId || (activeJob && activeJob.id);
    if (!targetId) return;
    if (!window.confirm('CAUTION: Are you sure you want to execute an ATOMIC ROLLBACK? All database entities created by this migration job will be permanently reverted.')) {
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.rollbackMigrationJob(targetId, { reason: 'User initiated atomic rollback from Command Center' });
      if (res && res.success) {
        if (activeJob && activeJob.id === targetId) {
          setActiveJob(res.data.job);
        }
        setFeedback({ type: 'success', text: `Atomic rollback executed! ${res.data.revertedCount} entities reverted in PostgreSQL.` });
        fetchJobs();
        fetchTelemetry();
        if (showDetailsModal) setShowDetailsModal(false);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Rollback failed' });
    } finally {
      setLoading(false);
    }
  };

  // View Job Details
  const handleViewJobDetails = async (jobId) => {
    setLoading(true);
    try {
      const res = await api.getMigrationJob(jobId);
      if (res && res.data) {
        setSelectedJobDetails(res.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to fetch job details' });
    } finally {
      setLoading(false);
    }
  };

  // Load Preset Template
  const handleApplyTemplate = (tmpl) => {
    setColumnMappings(tmpl.columnMappings || {});
    setUploadForm(prev => ({ ...prev, targetEntity: tmpl.targetEntity, sourceType: tmpl.sourceType }));
    setActiveTab('PIPELINE');
    setFeedback({ type: 'info', text: `Loaded template '${tmpl.name}' into mapping matrix.` });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Header with Photographic Visual */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white shadow-2xl border border-amber-500/20">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay">
          <img 
            src="/assets/images/migration_data_center_real.jpg" 
            alt="Hospital Data Migration Center" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Procedure 20 &bull; Enterprise Migration Service &bull; BullMQ Architecture
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Data Import & Integration Hub
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Multi-source ingestion pipeline supporting Microsoft Excel, CSV, Google Sheets, PostgreSQL, and REST APIs. Features schema mapping, real-time duplicate checks, preview grids, human sign-off gates, and 1-click atomic rollback.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setActiveTab('PIPELINE'); setWizardStep(1); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Start New Migration
            </button>
            <button
              onClick={() => { fetchTelemetry(); fetchJobs(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Hub
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          feedback.type === 'error' ? 'bg-red-950/40 border-red-500/30 text-red-200' :
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' :
          'bg-amber-950/40 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" /> :
             feedback.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> :
             <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />}
            <span className="text-sm font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        {[
          { id: 'PIPELINE', label: 'Migration Pipeline', icon: Layers },
          { id: 'JOBS', label: 'Job History & Audit', icon: FileText },
          { id: 'TEMPLATES', label: 'Mapping Templates', icon: Settings },
          { id: 'TELEMETRY', label: 'System Telemetry', icon: Cpu }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                isActive 
                  ? 'border-amber-400 text-amber-400 bg-amber-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MIGRATION PIPELINE */}
      {activeTab === 'PIPELINE' && (
        <div className="space-y-6">
          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { num: 1, title: 'Upload & Source', desc: 'Select target and payload' },
              { num: 2, title: 'Field Mapping', desc: 'Map columns to schema' },
              { num: 3, title: 'Validation & Gate', desc: 'Verify duplicates & approve' },
              { num: 4, title: 'Execution & Rollback', desc: 'Commit to PostgreSQL' }
            ].map(step => {
              const isCurrent = wizardStep === step.num;
              const isDone = wizardStep > step.num;
              return (
                <div 
                  key={step.num}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10' :
                    isDone ? 'bg-slate-900/60 border-emerald-500/40 text-slate-300' :
                    'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent ? 'bg-amber-500 text-slate-950' :
                      isDone ? 'bg-emerald-500 text-slate-950' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {isDone ? <CheckCircle className="w-4 h-4" /> : step.num}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isCurrent ? 'text-amber-300' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-400">{step.desc}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STEP 1: Upload Source Data */}
          {wizardStep === 1 && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-amber-400" />
                    Step 1 &bull; Source Selection & Raw Ingestion
                  </h2>
                  <p className="text-xs text-slate-400">Choose the destination database table and provide raw CSV or JSON data</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadForm({
                      targetEntity: 'INVENTORY_ITEMS',
                      sourceType: 'JSON',
                      fileName: 'pharmacy_stock_v1.json',
                      rawData: JSON.stringify([
                        { DrugName: "Paracetamol 500mg", DrugClass: "ANALGESICS", Form: "TABLET", Dose: "500mg", PriceGHS: 15.00, MinStock: 50 },
                        { DrugName: "Amoxicillin 250mg", DrugClass: "ANTIBIOTICS", Form: "CAPSULE", Dose: "250mg", PriceGHS: 30.00, MinStock: 30 },
                        { DrugName: "Ciprofloxacin 500mg", DrugClass: "ANTIBIOTICS", Form: "TABLET", Dose: "500mg", PriceGHS: 45.00, MinStock: 20 }
                      ], null, 2)
                    });
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Load Pharmacy Inventory Sample
                </button>
              </div>

              <form onSubmit={handleInitializeJob} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Target Entity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Target PostgreSQL Entity</label>
                    <select
                      value={uploadForm.targetEntity}
                      onChange={(e) => setUploadForm({ ...uploadForm, targetEntity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="PATIENTS">Patients (Master Patient Index - Patient)</option>
                      <option value="INVENTORY_ITEMS">Pharmacy Items (Medications - PharmacyItem)</option>
                      <option value="BILLING_TARIFFS">Billing Tariffs (G-DRG & Cash - BillingTariffItem)</option>
                      <option value="STAFF_RECORDS">Staff Registry (Hospital Staff - HospitalStaff)</option>
                    </select>
                  </div>

                  {/* Source Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Data Source Connector</label>
                    <select
                      value={uploadForm.sourceType}
                      onChange={(e) => setUploadForm({ ...uploadForm, sourceType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      {catalogs.supportedSources && catalogs.supportedSources.length > 0 ? (
                        catalogs.supportedSources.map(s => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="CSV">Comma Separated Values (.csv)</option>
                          <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                          <option value="JSON">JSON File / REST API Payload</option>
                          <option value="GOOGLE_SHEETS">Google Sheets Cloud Connector</option>
                          <option value="POSTGRESQL">PostgreSQL Database Dump</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* File Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Dataset Reference Name</label>
                    <input
                      type="text"
                      value={uploadForm.fileName}
                      onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                      placeholder="e.g. legacy_patients_2026.csv"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Raw Data Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">Raw Data Text Stream (CSV or JSON)</label>
                    <span className="text-xs text-slate-500">Supports up to 50,000 rows per job</span>
                  </div>
                  <textarea
                    rows={8}
                    value={uploadForm.rawData}
                    onChange={(e) => setUploadForm({ ...uploadForm, rawData: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed"
                    placeholder="Paste CSV with headers or JSON array here..."
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Initialize Job & Detect Headers
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Field Mapping Matrix */}
          {wizardStep === 2 && activeJob && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Step 2 &bull; Schema Mapping Matrix ({activeJob.targetEntity})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Job Code: <span className="font-mono text-amber-300">{activeJob.jobCode}</span> &bull; Detected Headers: {detectedHeaders.join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  &larr; Back to Ingestion
                </button>
              </div>

              {/* Mapping Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Target Database Field</th>
                      <th className="py-3 px-4">Required</th>
                      <th className="py-3 px-4">Field Type</th>
                      <th className="py-3 px-4">Source Uploaded Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {catalogs.targetEntities[activeJob.targetEntity]?.fields?.map(field => (
                      <tr key={field.key} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-white">
                          {field.label}
                          <span className="block font-mono text-xs text-amber-400/80">{field.key}</span>
                        </td>
                        <td className="py-3 px-4">
                          {field.required ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-950/60 border border-red-500/40 text-red-300 font-semibold">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Optional</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">
                          {field.type}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={columnMappings[field.key] || ''}
                            onChange={(e) => setColumnMappings({ ...columnMappings, [field.key]: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 w-64"
                          >
                            <option value="">-- Do Not Import / Leave Blank --</option>
                            {detectedHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save as Template Option */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Save Mapping as Reusable Template</div>
                    <div className="text-xs text-slate-400">Easily re-apply these exact column mappings to future batches</div>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Template Name (e.g. Ghana Clinic V1 Patients)"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-72 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleApplyMapping}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Validate Records & Check Duplicates
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Validation Preview & Approval Gate */}
          {wizardStep === 3 && activeJob && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Step 3 &bull; Validation Analysis & Human Approval Gate
                  </h2>
                  <p className="text-xs text-slate-400">
                    Review pre-import validation results, duplicate detection, and sign-off before database insertion
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  &larr; Adjust Mapping
                </button>
              </div>

              {/* Statistics Pill Counters */}
              {validationSummary && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400">Total Scanned</div>
                    <div className="text-2xl font-bold text-white">{validationSummary.total}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <div className="text-xs text-emerald-400">Valid & Clean</div>
                    <div className="text-2xl font-bold text-emerald-300">{validationSummary.valid}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                    <div className="text-xs text-amber-400">Duplicates Detected</div>
                    <div className="text-2xl font-bold text-amber-300">{validationSummary.duplicate}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30">
                    <div className="text-xs text-red-400">Invalid / Errored</div>
                    <div className="text-2xl font-bold text-red-300">{validationSummary.invalid}</div>
                  </div>
                </div>
              )}

              {/* Sample Data Grid */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Pre-Import Sample Records (First 10)</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Mapped Values</th>
                        <th className="py-2.5 px-3">Remarks / Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sampleItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-800/40 font-mono">
                          <td className="py-2.5 px-3 text-slate-400">#{item.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                              item.status === 'VALID' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' :
                              item.status === 'DUPLICATE' ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300' :
                              'bg-red-950/60 border border-red-500/40 text-red-300'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.mappedData ? JSON.stringify(item.mappedData).slice(0, 100) + '...' : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs">
                            {item.errorMessage ? (
                              <span className="text-amber-400">{item.errorMessage}</span>
                            ) : (
                              <span className="text-emerald-400">Ready for database commit</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Handling Strategy & Approval Gate */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Duplicate Resolution Policy</div>
                  <div className="text-xs text-slate-400">Action when an existing record is encountered in PostgreSQL</div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="SKIP">SKIP - Omit duplicate rows safely</option>
                    <option value="ERROR">FAIL - Abort on duplicate detection</option>
                  </select>
                </div>
              </div>

              {/* Approval Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Current Status: <span className="font-semibold text-amber-400">{activeJob.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  {activeJob.status !== 'APPROVED' ? (
                    <button
                      type="button"
                      onClick={handleApproveJob}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Human Sign-Off Approval
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4" />
                      Approved by {activeJob.approvedBy || 'Admin'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={loading || activeJob.status !== 'APPROVED'}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-40"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Execute Production Import
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Execution Results & Atomic Rollback */}
          {wizardStep === 4 && activeJob && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-8 space-y-6 shadow-xl text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Migration Job Successfully Executed</h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Job <span className="font-mono text-amber-300">{activeJob.jobCode}</span> completed. Real records were written directly to PostgreSQL and assigned authoritative sequential identifiers.
                </p>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">Imported</div>
                  <div className="text-2xl font-bold text-emerald-400">{activeJob.importedRecords}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">Failed / Omitted</div>
                  <div className="text-2xl font-bold text-slate-400">{activeJob.failedRecords}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">Status</div>
                  <div className="text-xl font-bold text-amber-400">{activeJob.status}</div>
                </div>
              </div>

              {/* Rollback & Next Actions */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleRollback(activeJob.id)}
                  disabled={loading || activeJob.status === 'ROLLED_BACK'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  1-Click Atomic Rollback
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('JOBS'); fetchJobs(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  View Migration Audit Trail
                </button>
                <button
                  type="button"
                  onClick={() => { setWizardStep(1); setActiveJob(null); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold"
                >
                  <UploadCloud className="w-4 h-4" />
                  Import Another Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: JOB HISTORY & AUDIT */}
      {activeTab === 'JOBS' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Migration Jobs Ledger & Audit Trail
              </h2>
              <p className="text-xs text-slate-400">All data ingestion jobs with row counts, status, and atomic rollback triggers</p>
            </div>
            <button
              onClick={fetchJobs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Jobs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job Code</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Imported</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Initiated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {jobs.length > 0 ? (
                  jobs.map(job => (
                    <tr key={job.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-amber-300">
                        {job.jobCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {job.targetEntity}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {job.sourceType}
                      </td>
                      <td className="py-3 px-4">
                        {job.totalRecords}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">
                        {job.importedRecords}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          job.status === 'COMPLETED' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' :
                          job.status === 'ROLLED_BACK' ? 'bg-red-950/60 border border-red-500/40 text-red-300' :
                          job.status === 'APPROVED' ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300' :
                          job.status === 'PROCESSING' ? 'bg-purple-950/60 border border-purple-500/40 text-purple-300 animate-pulse' :
                          'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewJobDetails(job.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-all"
                        >
                          Details
                        </button>
                        {job.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleRollback(job.id)}
                            className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-xs text-red-300 transition-all"
                          >
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                      No migration jobs found in PostgreSQL database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MAPPING TEMPLATES */}
      {activeTab === 'TEMPLATES' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                Reusable Field Mapping Templates
              </h2>
              <p className="text-xs text-slate-400">Standardized transformation configurations for recurring legacy integrations</p>
            </div>
            <button
              onClick={fetchTemplates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length > 0 ? (
              templates.map(tmpl => (
                <div key={tmpl.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {tmpl.targetEntity}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{tmpl.sourceType}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{tmpl.name}</h3>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Mapped Fields: <span className="text-slate-200 font-mono">{Object.keys(tmpl.columnMappings || {}).length} rules</span></div>
                      <div>Created By: <span className="text-slate-300">{tmpl.createdBy}</span></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-all"
                  >
                    Load into Pipeline
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                No saved mapping templates yet. Save one during Step 2 of the pipeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM TELEMETRY */}
      {activeTab === 'TELEMETRY' && telemetry && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Total Migration Jobs</div>
              <div className="text-3xl font-extrabold text-white">{telemetry.totalJobs}</div>
              <div className="text-xs text-emerald-400 mt-2">{telemetry.completedJobs} Completed Successfully</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Total Records Processed</div>
              <div className="text-3xl font-extrabold text-amber-400">{telemetry.totalRecordsProcessed}</div>
              <div className="text-xs text-slate-400 mt-2">{telemetry.totalRecordsImported} Written to Database</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Overall Ingestion Success</div>
              <div className="text-3xl font-extrabold text-emerald-400">{telemetry.overallSuccessRate}%</div>
              <div className="text-xs text-slate-400 mt-2">{telemetry.totalRecordsFailed} Invalid / Filtered</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Atomic Rollbacks</div>
              <div className="text-3xl font-extrabold text-red-400">{telemetry.rolledBackJobs}</div>
              <div className="text-xs text-slate-400 mt-2">{telemetry.totalDuplicatesDetected} Duplicates Blocked</div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Distribution by Target PostgreSQL Entity
              </h3>
              <div className="space-y-3">
                {telemetry.targetBreakdown?.map(item => (
                  <div key={item.entity} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-sm text-slate-200">{item.entity}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300">
                      {item.count} jobs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                Distribution by Ingestion Source Format
              </h3>
              <div className="space-y-3">
                {telemetry.sourceBreakdown?.map(item => (
                  <div key={item.source} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-sm text-slate-200">{item.source}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">
                      {item.count} jobs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Comprehensive Job Details */}
      {showDetailsModal && selectedJobDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Job Audit Trail &bull; {selectedJobDetails.jobCode}
                </h3>
                <p className="text-xs text-slate-400">Target: {selectedJobDetails.targetEntity} &bull; Source: {selectedJobDetails.sourceType}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Total Rows:</span>
                <span className="text-white font-bold text-sm">{selectedJobDetails.totalRecords}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Imported:</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedJobDetails.importedRecords}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Status:</span>
                <span className="text-amber-400 font-bold text-sm">{selectedJobDetails.status}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Initiated By:</span>
                <span className="text-slate-300 font-bold text-xs">{selectedJobDetails.initiatedBy}</span>
              </div>
            </div>

            {/* Records List */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase mb-2">Record-Level Breakdown</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-64">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Destination Entity ID</th>
                      <th className="py-2 px-3">Error / Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedJobDetails.records?.map(r => (
                      <tr key={r.id} className="font-mono hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400">#{r.rowNumber}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            r.status === 'IMPORTED' ? 'bg-emerald-950/60 text-emerald-300' :
                            r.status === 'ROLLED_BACK' ? 'bg-red-950/60 text-red-300' :
                            r.status === 'VALID' ? 'bg-blue-950/60 text-blue-300' :
                            'bg-amber-950/60 text-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                          {r.destinationId || '-'}
                        </td>
                        <td className="py-2 px-3 font-sans text-xs text-slate-400">
                          {r.errorMessage || 'Clean'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              {selectedJobDetails.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => handleRollback(selectedJobDetails.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-200 transition-all"
                >
                  Rollback Created Entities
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
