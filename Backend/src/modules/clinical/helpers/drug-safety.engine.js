"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENT SAFETY GUARDRAILS — DRUG INTERACTION & ALLERGY ENGINE
Master Blueprint Immutable Rules:
- Allergy Alerts Never Disabled
- Drug Interaction Alerts Always Active
- Clinical Override Logging Always Enabled
LOCATION: Backend/src/modules/clinical/helpers/drug-safety.engine.js
====================================================
*/

const IMMUTABLE_SAFETY_GUARDRAILS = Object.freeze({
    clinicalSystemsNeverLock: true,
    emergencyAccessAlwaysAvailable: true,
    allSuggestionsRequireHumanApproval: true,
    clinicalOverrideLoggingEnabled: true,
    clinicalInteractionAlertsAlwaysActive: true,
    drugInteractionAlertsAlwaysActive: true,
    allergyAlertsNeverDisabled: true
});

/**
 * Cross-reactivity allergy families (allergen keyword -> medication keywords)
 */
const ALLERGY_CLASS_FAMILIES = [
    {
        family: "BETA_LACTAM_PENICILLIN",
        allergenKeywords: ["penicillin", "amoxicillin", "ampicillin", "beta-lactam", "beta lactam", "augmentin", "cloxacillin", "flucloxacillin"],
        drugKeywords: ["penicillin", "amoxicillin", "ampicillin", "augmentin", "amoxyclav", "co-amoxiclav", "cloxacillin", "flucloxacillin", "piperacillin", "tazobactam"],
        severity: "CONTRAINDICATED",
        guidance: "Beta-lactam / Penicillin hypersensitivity risk (anaphylaxis/urticaria). Consider macrolide (Azithromycin) or non-beta-lactam alternative."
    },
    {
        family: "CEPHALOSPORIN",
        allergenKeywords: ["cephalosporin", "ceftriaxone", "cefuroxime", "cephalexin", "cefixime"],
        drugKeywords: ["ceftriaxone", "cefuroxime", "cephalexin", "cefixime", "ceftazidime", "cefepime"],
        severity: "HIGH",
        guidance: "Documented cephalosporin hypersensitivity. Review cross-reactivity risk prior to administration."
    },
    {
        family: "SULFONAMIDE",
        allergenKeywords: ["sulfa", "sulfonamide", "cotrimoxazole", "sulfamethoxazole", "bactrim", "septrin", "fansidar"],
        drugKeywords: ["sulfamethoxazole", "cotrimoxazole", "trimethoprim-sulfamethoxazole", "bactrim", "septrin", "sulfadiazine", "sulfadoxine"],
        severity: "CONTRAINDICATED",
        guidance: "Sulfonamide allergy carries risk of Stevens-Johnson syndrome or severe hypersensitivity. Avoid sulfa-containing agents."
    },
    {
        family: "NSAID_ASPIRIN",
        allergenKeywords: ["nsaid", "aspirin", "ibuprofen", "diclofenac", "naproxen", "piroxicam", "ketorolac", "meloxicam"],
        drugKeywords: ["aspirin", "ibuprofen", "diclofenac", "naproxen", "piroxicam", "ketorolac", "meloxicam", "indomethacin", "celecoxib"],
        severity: "HIGH",
        guidance: "NSAID/Salicylate hypersensitivity risk (bronchospasm, angioedema, GI bleed). Consider Paracetamol/Acetaminophen alternative."
    },
    {
        family: "MACROLIDE",
        allergenKeywords: ["erythromycin", "azithromycin", "clarithromycin", "macrolide"],
        drugKeywords: ["erythromycin", "azithromycin", "clarithromycin"],
        severity: "HIGH",
        guidance: "Documented macrolide allergy. Select alternative antimicrobial class."
    },
    {
        family: "FLUOROQUINOLONE",
        allergenKeywords: ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "quinolone", "fluoroquinolone"],
        drugKeywords: ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "norfloxacin"],
        severity: "HIGH",
        guidance: "Documented fluoroquinolone allergy."
    },
    {
        family: "OPIOID",
        allergenKeywords: ["morphine", "codeine", "tramadol", "pethidine", "fentanyl", "opioid"],
        drugKeywords: ["morphine", "codeine", "tramadol", "pethidine", "meperidine", "fentanyl", "oxycodone"],
        severity: "HIGH",
        guidance: "Documented opioid allergy/intolerance. Distinguish true IgE allergy vs pseudo-allergy and monitor airway."
    },
    {
        family: "IODINATED_CONTRAST",
        allergenKeywords: ["iodine", "contrast", "contrast dye"],
        drugKeywords: ["contrast", "iohexol", "iopamidol", "amiodarone", "povidone-iodine"],
        severity: "HIGH",
        guidance: "Iodine/contrast sensitivity documented. Pre-medicate or choose non-contrast modality."
    }
];

/**
 * Evidence-based high-risk drug-drug interaction matrix
 */
const DRUG_INTERACTION_RULES = [
    {
        id: "DDI-001",
        groupA: ["warfarin"],
        groupB: ["aspirin", "ibuprofen", "diclofenac", "naproxen", "ketorolac", "piroxicam", "clopidogrel"],
        severity: "CONTRAINDICATED",
        effect: "Major gastrointestinal and intracranial hemorrhage risk due to additive anticoagulant + antiplatelet/NSAID mucosal injury.",
        recommendation: "Avoid concurrent NSAID with Warfarin; use Paracetamol for analgesia and monitor INR closely."
    },
    {
        id: "DDI-002",
        groupA: ["warfarin"],
        groupB: ["metronidazole", "ciprofloxacin", "fluconazole", "cotrimoxazole", "erythromycin", "clarithromycin"],
        severity: "HIGH",
        effect: "CYP2C9/CYP3A4 inhibition dramatically elevates Warfarin plasma concentration and INR, risking severe bleeding.",
        recommendation: "Select non-interacting antibiotic or reduce Warfarin dose with frequent INR checks."
    },
    {
        id: "DDI-003",
        groupA: ["lisinopril", "enalapril", "ramipril", "captopril", "losartan", "valsartan"],
        groupB: ["spironolactone", "potassium chloride", "potassium", "amiloride"],
        severity: "HIGH",
        effect: "Life-threatening hyperkalemia and fatal cardiac arrhythmia risk.",
        recommendation: "Monitor serum potassium and renal function closely or avoid routine potassium supplementation."
    },
    {
        id: "DDI-004",
        groupA: ["gentamicin", "amikacin", "vancomycin"],
        groupB: ["furosemide", "ibuprofen", "diclofenac", "naproxen", "cisplatin"],
        severity: "HIGH",
        effect: "Additive acute nephrotoxicity and irreversible ototoxicity.",
        recommendation: "Monitor serum creatinine, trough drug levels, and urine output closely; avoid concurrent NSAIDs."
    },
    {
        id: "DDI-005",
        groupA: ["artemether", "lumefantrine", "coartem", "halofantrine", "quinine"],
        groupB: ["erythromycin", "clarithromycin", "ciprofloxacin", "levofloxacin", "amiodarone", "ondansetron", "haloperidol"],
        severity: "HIGH",
        effect: "Additive QTc interval prolongation risking Torsades de Pointes ventricular arrhythmia.",
        recommendation: "Obtain baseline ECG or choose alternative non-QT-prolonging agent."
    },
    {
        id: "DDI-006",
        groupA: ["ciprofloxacin", "erythromycin", "clarithromycin"],
        groupB: ["theophylline", "aminophylline"],
        severity: "HIGH",
        effect: "Reduced hepatic clearance causing Theophylline toxicity (seizures, tachyarrhythmia).",
        recommendation: "Avoid combination or monitor serum theophylline levels with dose reduction."
    },
    {
        id: "DDI-007",
        groupA: ["sildenafil", "tadalafil"],
        groupB: ["nitroglycerin", "isosorbide", "gtn", "glyceryl trinitrate"],
        severity: "CONTRAINDICATED",
        effect: "Severe refractory hypotension and cardiovascular collapse.",
        recommendation: "Strictly contraindicated. Do not co-administer PDE-5 inhibitors with organic nitrates."
    },
    {
        id: "DDI-008",
        groupA: ["metformin"],
        groupB: ["contrast", "iohexol", "iopamidol"],
        severity: "HIGH",
        effect: "Increased risk of contrast-associated acute kidney injury and lactic acidosis.",
        recommendation: "Hold Metformin for 48 hours around iodinated contrast procedures and recheck eGFR."
    },
    {
        id: "DDI-009",
        groupA: ["tramadol", "pethidine", "fentanyl"],
        groupB: ["fluoxetine", "sertraline", "citalopram", "amitriptyline", "linezolid", "diazepam", "lorazepam"],
        severity: "HIGH",
        effect: "Risk of Serotonin Syndrome (with SSRIs/Linezolid) or severe CNS/respiratory depression (with benzodiazepines).",
        recommendation: "Avoid co-prescribing where possible; monitor mental status and respiratory drive."
    },
    {
        id: "DDI-010",
        groupA: ["simvastatin", "atorvastatin"],
        groupB: ["clarithromycin", "erythromycin", "ketoconazole", "itraconazole", "ritonavir"],
        severity: "HIGH",
        effect: "CYP3A4 inhibition increases statin exposure leading to severe myopathy and rhabdomyolysis.",
        recommendation: "Suspend statin during short course of potent CYP3A4 inhibitor or switch to Azithromycin."
    },
    {
        id: "DDI-011",
        groupA: ["methotrexate"],
        groupB: ["cotrimoxazole", "trimethoprim", "ibuprofen", "diclofenac", "naproxen", "aspirin"],
        severity: "CONTRAINDICATED",
        effect: "Severe bone marrow suppression (pancytopenia) and Methotrexate toxicity.",
        recommendation: "Contraindicated with trimethoprim/sulfamethoxazole; avoid concurrent NSAIDs."
    },
    {
        id: "DDI-012",
        groupA: ["digoxin"],
        groupB: ["amiodarone", "verapamil", "clarithromycin", "furosemide"],
        severity: "HIGH",
        effect: "Elevated serum Digoxin levels or hypokalemia-precipitated Digoxin toxicity (bradycardia, AV block).",
        recommendation: "Reduce Digoxin dose by 30-50%, check serum potassium and Digoxin levels."
    },
    {
        id: "DDI-013",
        groupA: ["rifampicin", "rifampin"],
        groupB: ["warfarin", "nevirapine", "efavirenz", "dolutegravir", "oral contraceptive", "levonorgestrel"],
        severity: "HIGH",
        effect: "Potent CYP450 induction substantially lowers plasma efficacy of co-administered therapy.",
        recommendation: "Adjust dose per national HIV/TB guidelines (e.g., double Dolutegravir dose) or select alternative."
    },
    {
        id: "DDI-014",
        groupA: ["ibuprofen", "diclofenac", "naproxen"],
        groupB: ["prednisolone", "dexamethasone", "hydrocortisone"],
        severity: "MODERATE",
        effect: "Increased risk of peptic ulceration and upper GI bleeding.",
        recommendation: "Add gastroprotection (Omeprazole) if combination is clinically essential."
    }
];

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function matchesAnyKeyword(drugName, keywords) {
    const norm = normalizeText(drugName);
    if (!norm) return false;
    return keywords.some((kw) => norm.includes(kw));
}

/**
 * Evaluate proposed medications against patient's documented allergies & active/concurrent medications.
 *
 * @param {Object} params
 * @param {Array<string|Object>} params.proposedMedications
 * @param {Array<Object>} params.patientAllergies
 * @param {Array<string|Object>} params.activeMedications
 */
function evaluateClinicalMedicationSafety({
    proposedMedications = [],
    patientAllergies = [],
    activeMedications = []
}) {
    const proposedNames = proposedMedications
        .map((m) => (typeof m === "string" ? m : m?.medicationName || m?.name || ""))
        .map((s) => s.trim())
        .filter(Boolean);

    const activeNames = activeMedications
        .map((m) => (typeof m === "string" ? m : m?.medicationName || m?.name || ""))
        .map((s) => s.trim())
        .filter(Boolean);

    const alerts = [];
    const seenKeys = new Set();

    // 1. Allergy Alerts (NEVER DISABLED)
    for (const proposed of proposedNames) {
        const normProposed = normalizeText(proposed);

        for (const allergy of patientAllergies) {
            if (allergy.active === false || String(allergy.status || "").toUpperCase() === "RESOLVED") {
                continue;
            }
            const allergenName = String(allergy.allergyName || "").trim();
            const normAllergen = normalizeText(allergenName);
            if (!normAllergen) continue;

            // Direct name match
            if (normProposed.includes(normAllergen) || normAllergen.includes(normProposed)) {
                const key = `ALLERGY:DIRECT:${normProposed}:${normAllergen}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    alerts.push({
                        category: "ALLERGY",
                        severity: String(allergy.severity || "").toUpperCase() === "SEVERE" ? "CONTRAINDICATED" : "HIGH",
                        offendingMedication: proposed,
                        conflictingAgent: allergenName,
                        reaction: allergy.reaction || "Documented hypersensitivity reaction",
                        summary: `ALLERGY ALERT: Patient has an active ${allergy.severity || "HIGH"} allergy to "${allergenName}" (${allergy.reaction || "hypersensitivity"}). Direct conflict with "${proposed}".`,
                        recommendation: "Do NOT administer unless formally overridden by licensed clinician with documented clinical rationale.",
                        requiresOverride: true
                    });
                }
                continue;
            }

            // Drug-class cross-reactivity match
            for (const fam of ALLERGY_CLASS_FAMILIES) {
                const allergenMatchesFam = matchesAnyKeyword(allergenName, fam.allergenKeywords);
                const drugMatchesFam = matchesAnyKeyword(proposed, fam.drugKeywords);
                if (allergenMatchesFam && drugMatchesFam) {
                    const key = `ALLERGY:CLASS:${fam.family}:${normProposed}:${normAllergen}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        alerts.push({
                            category: "ALLERGY",
                            severity: fam.severity,
                            offendingMedication: proposed,
                            conflictingAgent: `${allergenName} (${fam.family.replace(/_/g, " ")})`,
                            reaction: allergy.reaction || "Cross-reactive drug class hypersensitivity",
                            summary: `ALLERGY CROSS-REACTIVITY ALERT: "${proposed}" belongs to ${fam.family.replace(/_/g, " ")} and conflicts with documented "${allergenName}" allergy.`,
                            recommendation: fam.guidance,
                            requiresOverride: true
                        });
                    }
                }
            }
        }
    }

    // 2. Drug-Drug Interaction Checks (proposed vs active AND proposed vs proposed)
    const comparisonPairs = [];
    for (let i = 0; i < proposedNames.length; i++) {
        for (let j = i + 1; j < proposedNames.length; j++) {
            comparisonPairs.push([proposedNames[i], proposedNames[j]]);
        }
        for (const existing of activeNames) {
            if (normalizeText(existing) !== normalizeText(proposedNames[i])) {
                comparisonPairs.push([proposedNames[i], existing]);
            }
        }
    }

    for (const [drug1, drug2] of comparisonPairs) {
        for (const rule of DRUG_INTERACTION_RULES) {
            const forwardMatch = matchesAnyKeyword(drug1, rule.groupA) && matchesAnyKeyword(drug2, rule.groupB);
            const reverseMatch = matchesAnyKeyword(drug1, rule.groupB) && matchesAnyKeyword(drug2, rule.groupA);
            if (forwardMatch || reverseMatch) {
                const sortedPair = [normalizeText(drug1), normalizeText(drug2)].sort().join("|");
                const key = `DDI:${rule.id}:${sortedPair}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    alerts.push({
                        category: "DRUG_INTERACTION",
                        ruleId: rule.id,
                        severity: rule.severity,
                        offendingMedication: drug1,
                        conflictingAgent: drug2,
                        summary: `DRUG INTERACTION (${rule.severity}): "${drug1}" + "${drug2}" — ${rule.effect}`,
                        recommendation: rule.recommendation,
                        requiresOverride: rule.severity === "CONTRAINDICATED" || rule.severity === "HIGH"
                    });
                }
            }
        }
    }

    // 3. Duplicate Therapy Detection
    for (const proposed of proposedNames) {
        const normProposed = normalizeText(proposed);
        const dup = activeNames.find((a) => normalizeText(a) === normProposed);
        if (dup) {
            const key = `DUP:${normProposed}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                alerts.push({
                    category: "DUPLICATE_THERAPY",
                    severity: "MODERATE",
                    offendingMedication: proposed,
                    conflictingAgent: dup,
                    summary: `DUPLICATE THERAPY WARNING: Patient already has an active prescription/medication matching "${dup}".`,
                    recommendation: "Confirm intended dose escalation or discontinue duplicate order.",
                    requiresOverride: false
                });
            }
        }
    }

    const blockingAlerts = alerts.filter((a) => a.requiresOverride);
    const highestSeverity = alerts.some((a) => a.severity === "CONTRAINDICATED")
        ? "CONTRAINDICATED"
        : alerts.some((a) => a.severity === "HIGH")
            ? "HIGH"
            : alerts.some((a) => a.severity === "MODERATE")
                ? "MODERATE"
                : "SAFE";

    return {
        safeToProceedWithoutOverride: blockingAlerts.length === 0,
        highestSeverity,
        totalAlerts: alerts.length,
        blockingAlertsCount: blockingAlerts.length,
        allergyAlertsCount: alerts.filter((a) => a.category === "ALLERGY").length,
        drugInteractionAlertsCount: alerts.filter((a) => a.category === "DRUG_INTERACTION").length,
        alerts,
        guardrails: IMMUTABLE_SAFETY_GUARDRAILS
    };
}

module.exports = {
    IMMUTABLE_SAFETY_GUARDRAILS,
    ALLERGY_CLASS_FAMILIES,
    DRUG_INTERACTION_RULES,
    evaluateClinicalMedicationSafety
};
