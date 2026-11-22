'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/core/database/prisma.client');

describe('Phase 28 — Procedure 3: Dental Clinic, Eye Clinic, ICU Live Vitals, Patient Safety Guardrails & AI Clinical Human Approval', () => {
  const RUN_ID = Date.now();
  let adminToken;
  let doctorToken;
  let dentistToken;
  let eyeDoctorToken;
  let patientRoleToken;
  let testPatientId;
  let testEncounterId;
  let createdUserEmails = [];

  async function createApprovedStaff(role, suffix, password) {
    const email = `p28.${suffix}.${RUN_ID}@hospital.test`;
    createdUserEmails.push(email);
    const s = await request(app)
      .post('/api/v1/auth/signup')
      .send({ firstName: 'P28', lastName: suffix, email, password, role });
    expect(s.statusCode).toBe(201);
    const a = await request(app)
      .patch(`/api/v1/users/${s.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(a.statusCode).toBe(200);
    const l = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(l.statusCode).toBe(200);
    return l.body.data.token;
  }

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gbs.com', password: 'Admin123' });
    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.data.token;

    doctorToken = await createApprovedStaff('DOCTOR', 'doc', 'DocPass123!');
    dentistToken = await createApprovedStaff('DENTIST', 'den', 'DenPass123!');
    eyeDoctorToken = await createApprovedStaff('EYE_DOCTOR', 'eye', 'EyePass123!');
    patientRoleToken = await createApprovedStaff('PATIENT', 'pat', 'PatPass123!');

    const patRes = await request(app)
      .post('/api/v1/patients/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Phase28',
        lastName: `ClinicalPatient${RUN_ID}`,
        gender: 'FEMALE',
        dateOfBirth: '1988-06-15',
        phone: `+23324${String(RUN_ID).slice(-7)}`
      });
    expect(patRes.statusCode).toBe(201);
    testPatientId = patRes.body.data.patient?.id || patRes.body.data.id;
    expect(testPatientId).toBeTruthy();

    const opdRes = await request(app)
      .post('/api/v1/clinical/opd/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        priority: 'ROUTINE',
        chiefComplaint: 'Fever, headache and dental discomfort'
      });
    expect(opdRes.statusCode).toBe(201);
    testEncounterId = opdRes.body.data.encounter?.id || opdRes.body.data.encounterId;
  });

  afterAll(async () => {
    try {
      if (testPatientId) {
        await prisma.patient.delete({ where: { id: testPatientId } });
      }
      for (const email of createdUserEmails) {
        const u = await prisma.user.findUnique({ where: { email } });
        if (u) {
          await prisma.session.deleteMany({ where: { userId: u.id } });
          await prisma.auditLog.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }
      }
    } catch (_e) { }
    await prisma.$disconnect();
  });

  test('1. Dental Clinic: Dentist creates FDI odontogram + oral surgery record and retrieves aggregated odontogram', async () => {
    const createRes = await request(app)
      .post('/api/v1/dental/records')
      .set('Authorization', `Bearer ${dentistToken}`)
      .send({
        patientId: testPatientId,
        chiefComplaint: 'Severe pain in lower left first molar',
        category: 'ORAL_SURGERY',
        procedureCode: 'DEN-007',
        procedureName: 'Surgical Impacted Wisdom Tooth Extraction',
        toothNumbers: ['36', '38'],
        odontogram: {
          '36': { condition: 'ROOT_CANAL', procedure: 'Endodontic Therapy' },
          '38': { condition: 'EXTRACTION', procedure: 'Surgical Extraction' }
        },
        anesthesiaUsed: 'Lidocaine 2% Inferior Alveolar Nerve Block',
        oralSurgeryNotes: 'Clean surgical extraction with 3-0 vicryl suture and gauze pack.'
      });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.recordNumber).toMatch(/^DEN-\d{4}-\d{6}$/);

    const odoRes = await request(app)
      .get(`/api/v1/dental/patients/${testPatientId}/odontogram`)
      .set('Authorization', `Bearer ${dentistToken}`);
    expect(odoRes.statusCode).toBe(200);
    expect(odoRes.body.data.odontogram['38'].condition).toBe('EXTRACTION');
    expect(odoRes.body.data.odontogram['36'].condition).toBe('ROOT_CANAL');

    const telRes = await request(app)
      .get('/api/v1/dental/telemetry')
      .set('Authorization', `Bearer ${dentistToken}`);
    expect(telRes.statusCode).toBe(200);
    expect(telRes.body.data.oralSurgeryCases).toBeGreaterThanOrEqual(1);
  });

  test('2. Eye Clinic: Eye Doctor records visual acuity, refraction Rx & elevated IOP triggers ocular hypertension alert', async () => {
    const examRes = await request(app)
      .post('/api/v1/eye-clinic/exams')
      .set('Authorization', `Bearer ${eyeDoctorToken}`)
      .send({
        patientId: testPatientId,
        chiefComplaint: 'Halos around lights and peripheral visual loss',
        visualAcuityOD: '6/12',
        visualAcuityOS: '6/9',
        iopRightMmHg: 26.5,
        iopLeftMmHg: 18.0,
        refractionOD: { sphere: '-1.25', cylinder: '-0.50', axis: '90', add: '+1.50' },
        refractionOS: { sphere: '-0.75', cylinder: '0.00', axis: '180', add: '+1.50' },
        pupillaryDistanceMm: 62,
        slitLampFindings: 'Clear cornea, deep anterior chamber',
        funduscopyFindings: 'Cup-to-disc ratio 0.7 OD',
        diagnosis: 'Suspect Primary Open-Angle Glaucoma OD',
        eyeDropMedication: 'Latanoprost 0.005% nocte OD'
      });
    expect(examRes.statusCode).toBe(201);
    expect(examRes.body.data.examNumber).toMatch(/^EYE-\d{4}-\d{6}$/);
    expect(examRes.body.data.ocularHypertensionFlag).toBe(true);

    const histRes = await request(app)
      .get(`/api/v1/eye-clinic/patients/${testPatientId}/history`)
      .set('Authorization', `Bearer ${eyeDoctorToken}`);
    expect(histRes.statusCode).toBe(200);
    expect(histRes.body.data.total).toBeGreaterThanOrEqual(1);
  });

  test('3. ICU & Live Vitals: Critical hypoxemia/hypotension computes MAP & NEWS2, triggers CRITICAL alert & supports clinician acknowledgement + trends', async () => {
    const icuRes = await request(app)
      .post('/api/v1/icu/monitors')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: testPatientId,
        wardName: 'Adult ICU',
        bedNumber: 'ICU-04',
        heartRateBpm: 138,
        systolicBP: 82,
        diastolicBP: 50,
        oxygenSaturationPct: 88,
        respiratoryRate: 28,
        temperatureC: 39.4,
        glasgowComaScale: 10,
        ventilatorMode: 'NON_REBREATHER',
        fio2Percent: 80,
        criticalCareInterventions: 'Initiated sepsis resuscitation bundle and high-flow oxygen'
      });
    expect(icuRes.statusCode).toBe(201);
    expect(icuRes.body.data.alertLevel).toBe('CRITICAL');
    expect(icuRes.body.data.news2Score).toBeGreaterThanOrEqual(7);
    expect(icuRes.body.data.meanArterialPressure).toBeLessThan(65);
    expect(icuRes.body.data.triggeredAlerts.length).toBeGreaterThanOrEqual(4);

    const ackRes = await request(app)
      .patch(`/api/v1/icu/monitors/${icuRes.body.data.id}/acknowledge`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ interventionNote: 'Started norepinephrine infusion and arterial line monitoring' });
    expect(ackRes.statusCode).toBe(200);
    expect(ackRes.body.data.isAcknowledged).toBe(true);

    const trendRes = await request(app)
      .get(`/api/v1/icu/patients/${testPatientId}/trends`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(trendRes.statusCode).toBe(200);
    expect(trendRes.body.data.totalPoints).toBeGreaterThanOrEqual(1);
  });

  test('4. Patient Safety Guardrails: Allergy & Drug-Interaction alerts cannot be disabled, block unsafe prescribing (409), and allow audited clinician override', async () => {
    // Attempt to disable allergy alerts must ALWAYS be rejected (403)
    const disableRes = await request(app)
      .post('/api/v1/clinical-safety/guardrails/toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ guardrail: 'allergyAlertsNeverDisabled', enabled: false });
    expect(disableRes.statusCode).toBe(403);
    expect(disableRes.body.code).toBe('SAFETY_GUARDRAIL_IMMUTABLE');

    // Document severe Penicillin allergy
    const allergyRes = await request(app)
      .post(`/api/v1/clinical-safety/patients/${testPatientId}/allergies`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        allergyName: 'Penicillin',
        allergyType: 'DRUG',
        severity: 'SEVERE',
        reaction: 'Anaphylaxis and airway edema'
      });
    expect(allergyRes.statusCode).toBe(201);

    // Real-time check flags cross-reactive Amoxicillin + Warfarin/Ibuprofen bleeding interaction
    const checkRes = await request(app)
      .post('/api/v1/clinical-safety/check')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: testPatientId,
        proposedMedications: ['Amoxicillin 500mg', 'Warfarin 5mg', 'Ibuprofen 400mg']
      });
    expect(checkRes.statusCode).toBe(200);
    expect(checkRes.body.data.safeToProceedWithoutOverride).toBe(false);
    expect(checkRes.body.data.allergyAlertsCount).toBeGreaterThanOrEqual(1);
    expect(checkRes.body.data.drugInteractionAlertsCount).toBeGreaterThanOrEqual(1);

    // Doctor consultation prescribing Amoxicillin WITHOUT override MUST BE BLOCKED (409)
    const blockedRx = await request(app)
      .post(`/api/v1/clinical/encounters/${testEncounterId}/consultation`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        assessment: 'Bacterial infection test',
        prescriptions: [{ medicationName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'TDS', duration: '5 days' }]
      });
    expect(blockedRx.statusCode).toBe(409);

    // Doctor consultation WITH documented clinical override reason proceeds AND logs immutable ClinicalSafetyOverride!
    const overriddenRx = await request(app)
      .post(`/api/v1/clinical/encounters/${testEncounterId}/consultation`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        assessment: 'Desensitization protocol approved by allergy specialist',
        safetyOverrideReason: 'Patient underwent formal penicillin desensitization under ICU monitoring',
        prescriptions: [{ medicationName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'TDS', duration: '5 days' }]
      });
    expect(overriddenRx.statusCode).toBe(201);
    expect(overriddenRx.body.data.safetyOverridesLogged.length).toBeGreaterThanOrEqual(1);

    const overridesList = await request(app)
      .get(`/api/v1/clinical-safety/overrides?patientId=${testPatientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(overridesList.statusCode).toBe(200);
    expect(overridesList.body.data.total).toBeGreaterThanOrEqual(1);
  });

  test('5. AI Clinical Assistance: Enforces 4-step Human Approval Workflow (Suggest -> Review -> Override -> Final Decision) & rejects non-clinicians', async () => {
    // Non-clinical PATIENT role cannot run AI clinical decision support
    const forbiddenAi = await request(app)
      .post('/api/v1/ai-clinical/analyze')
      .set('Authorization', `Bearer ${patientRoleToken}`)
      .send({ patientId: testPatientId, assistantType: 'TRIAGE_ASSISTANT', symptoms: 'chest pain' });
    expect(forbiddenAi.statusCode).toBe(403);

    // Step 1: Suggest
    const suggestRes = await request(app)
      .post('/api/v1/ai-clinical/analyze')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: testPatientId,
        assistantType: 'DIAGNOSIS_SUGGESTIONS',
        symptoms: 'fever, chills, rigors, headache, chest pain'
      });
    expect(suggestRes.statusCode).toBe(201);
    const sugId = suggestRes.body.data.id;
    expect(suggestRes.body.data.workflowStatus).toBe('SUGGESTED');
    expect(suggestRes.body.data.disclaimer).toContain('recommendations only');

    // Attempting Final Decision BEFORE human review is blocked (409)
    const prematureFinal = await request(app)
      .post(`/api/v1/ai-clinical/suggestions/${sugId}/final-decision`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ finalDecisionText: 'Attempting to skip human review step' });
    expect(prematureFinal.statusCode).toBe(409);

    // Step 2 & 3: Licensed Clinician Review with OVERRIDE (requires overrideNotes >= 10 chars)
    const weakOverride = await request(app)
      .post(`/api/v1/ai-clinical/suggestions/${sugId}/review`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ decision: 'OVERRIDE', overrideNotes: 'short' });
    expect(weakOverride.statusCode).toBe(400);

    const reviewRes = await request(app)
      .post(`/api/v1/ai-clinical/suggestions/${sugId}/review`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        decision: 'OVERRIDE',
        overrideNotes: 'ECG normal and troponin negative; prioritizing malaria RDT & blood film workup first.'
      });
    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.workflowStatus).toBe('OVERRIDDEN');

    // Step 4: Final Binding Clinical Decision signed by Licensed Clinician
    const finalRes = await request(app)
      .post(`/api/v1/ai-clinical/suggestions/${sugId}/final-decision`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        finalDecisionText: 'Admit for malaria RDT, serial ECG monitoring, and supportive IV hydration.'
      });
    expect(finalRes.statusCode).toBe(200);
    expect(finalRes.body.data.workflowStatus).toBe('FINAL_DECISION_RECORDED');
    expect(finalRes.body.data.finalDecidedByRole).toBe('DOCTOR');

    // Also verify SBAR Clinical Summarization & Risk Prediction work cleanly
    const sumRes = await request(app)
      .post('/api/v1/ai-clinical/analyze')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId: testPatientId, assistantType: 'CLINICAL_SUMMARIZATION' });
    expect(sumRes.statusCode).toBe(201);

    const riskRes = await request(app)
      .post('/api/v1/ai-clinical/analyze')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId: testPatientId, assistantType: 'RISK_PREDICTION' });
    expect(riskRes.statusCode).toBe(201);
  });
});
