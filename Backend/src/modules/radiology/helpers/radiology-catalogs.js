"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
RADIOLOGY REFERENCE CATALOGS & DICOM PROTOCOLS
Modality Presets, Window Center/Width, & Panic Finding Detector
LOCATION: src/modules/radiology/helpers/radiology-catalogs.js
====================================================
*/

/**
 * Standard Diagnostic Imaging Modalities
 */
const MODALITIES = Object.freeze({
    XRAY: "XRAY",
    CT_SCAN: "CT_SCAN",
    MRI: "MRI",
    ULTRASOUND: "ULTRASOUND",
    MAMMOGRAPHY: "MAMMOGRAPHY",
    FLUOROSCOPY: "FLUOROSCOPY",
    ECHOCARDIOGRAM: "ECHOCARDIOGRAM"
});

/**
 * Standard Anatomical Regions
 */
const BODY_PARTS = Object.freeze({
    CHEST: "CHEST",
    BRAIN: "BRAIN",
    ABDOMEN: "ABDOMEN",
    SPINE: "SPINE",
    PELVIS: "PELVIS",
    EXTREMITY: "EXTREMITY",
    NECK: "NECK",
    CARDIAC: "CARDIAC",
    MUSCULOSKELETAL: "MUSCULOSKELETAL"
});

/**
 * Standard Window Center (Level) and Window Width (WW/WC) Presets
 * (Hounsfield Units for CT / Grayscale LUT parameters for DICOM display)
 */
const DICOM_WINDOW_PRESETS = Object.freeze({
    CHEST_LUNG: { windowWidth: 1500, windowCenter: -600, label: "Lung Window" },
    CHEST_MEDIASTINUM: { windowWidth: 350, windowCenter: 50, label: "Mediastinum Window" },
    BONE: { windowWidth: 2000, windowCenter: 350, label: "Bone Window" },
    BRAIN_SOFT_TISSUE: { windowWidth: 80, windowCenter: 40, label: "Brain Soft Tissue Window" },
    SUBDURAL_HEMORRHAGE: { windowWidth: 150, windowCenter: 75, label: "Subdural Window" },
    ABDOMEN_SOFT_TISSUE: { windowWidth: 400, windowCenter: 40, label: "Abdomen Soft Tissue" },
    ANGIOGRAPHY: { windowWidth: 600, windowCenter: 200, label: "Vascular Window" }
});

/**
 * Standard Diagnostic Imaging Procedures Catalog
 */
const STANDARD_RADIOLOGY_PROCEDURES = Object.freeze({
    "RAD-CXR": {
        code: "RAD-CXR",
        procedureName: "Chest X-Ray PA & Lateral",
        modality: MODALITIES.XRAY,
        bodyPart: BODY_PARTS.CHEST,
        standardViews: "PA, Lateral",
        defaultWindow: DICOM_WINDOW_PRESETS.CHEST_LUNG,
        estimatedMinutes: 10,
        costPrice: 40.0,
        sellingPrice: 120.0
    },
    "RAD-CT-BRAIN": {
        code: "RAD-CT-BRAIN",
        procedureName: "Non-Contrast CT Brain",
        modality: MODALITIES.CT_SCAN,
        bodyPart: BODY_PARTS.BRAIN,
        standardViews: "Axial, Coronal, Sagittal reconstructions (2.5mm slices)",
        defaultWindow: DICOM_WINDOW_PRESETS.BRAIN_SOFT_TISSUE,
        estimatedMinutes: 20,
        costPrice: 250.0,
        sellingPrice: 650.0
    },
    "RAD-CT-CHEST": {
        code: "RAD-CT-CHEST",
        procedureName: "High-Resolution CT Chest (HRCT)",
        modality: MODALITIES.CT_SCAN,
        bodyPart: BODY_PARTS.CHEST,
        standardViews: "Axial 1mm thin slice, MinIP, MIP",
        defaultWindow: DICOM_WINDOW_PRESETS.CHEST_LUNG,
        estimatedMinutes: 25,
        costPrice: 300.0,
        sellingPrice: 750.0
    },
    "RAD-CT-ABD-PEL": {
        code: "RAD-CT-ABD-PEL",
        procedureName: "CT Abdomen & Pelvis with IV Contrast",
        modality: MODALITIES.CT_SCAN,
        bodyPart: BODY_PARTS.ABDOMEN,
        standardViews: "Arterial, Venous, Delayed phases (5mm)",
        defaultWindow: DICOM_WINDOW_PRESETS.ABDOMEN_SOFT_TISSUE,
        estimatedMinutes: 30,
        costPrice: 350.0,
        sellingPrice: 850.0
    },
    "RAD-MRI-BRAIN": {
        code: "RAD-MRI-BRAIN",
        procedureName: "MRI Brain with & without Gadolinium Contrast",
        modality: MODALITIES.MRI,
        bodyPart: BODY_PARTS.BRAIN,
        standardViews: "T1, T2, FLAIR, DWI/ADC, T1+C (Axial, Sagittal, Coronal)",
        defaultWindow: DICOM_WINDOW_PRESETS.BRAIN_SOFT_TISSUE,
        estimatedMinutes: 45,
        costPrice: 500.0,
        sellingPrice: 1200.0
    },
    "RAD-MRI-LSPINE": {
        code: "RAD-MRI-LSPINE",
        procedureName: "MRI Lumbar Spine Routine",
        modality: MODALITIES.MRI,
        bodyPart: BODY_PARTS.SPINE,
        standardViews: "Sagittal T1, T2, STIR; Axial T2 through disc spaces",
        defaultWindow: DICOM_WINDOW_PRESETS.BONE,
        estimatedMinutes: 35,
        costPrice: 450.0,
        sellingPrice: 1100.0
    },
    "RAD-US-ABD": {
        code: "RAD-US-ABD",
        procedureName: "Complete Abdominal Ultrasound",
        modality: MODALITIES.ULTRASOUND,
        bodyPart: BODY_PARTS.ABDOMEN,
        standardViews: "Liver, Gallbladder, Biliary Tree, Pancreas, Spleen, Kidneys, Aorta",
        defaultWindow: DICOM_WINDOW_PRESETS.ABDOMEN_SOFT_TISSUE,
        estimatedMinutes: 20,
        costPrice: 50.0,
        sellingPrice: 180.0
    },
    "RAD-US-PELVIS": {
        code: "RAD-US-PELVIS",
        procedureName: "Pelvic Ultrasound (Transabdominal / Transvaginal)",
        modality: MODALITIES.ULTRASOUND,
        bodyPart: BODY_PARTS.PELVIS,
        standardViews: "Uterus, Endometrium, Ovaries, Adnexa, Pouch of Douglas",
        defaultWindow: DICOM_WINDOW_PRESETS.ABDOMEN_SOFT_TISSUE,
        estimatedMinutes: 20,
        costPrice: 60.0,
        sellingPrice: 200.0
    },
    "RAD-ECHO-2D": {
        code: "RAD-ECHO-2D",
        procedureName: "Transthoracic Echocardiogram (TTE) with Doppler",
        modality: MODALITIES.ECHOCARDIOGRAM,
        bodyPart: BODY_PARTS.CARDIAC,
        standardViews: "PLAX, PSAX, Apical 4-Chamber, 2-Chamber, Subcostal",
        defaultWindow: DICOM_WINDOW_PRESETS.CHEST_MEDIASTINUM,
        estimatedMinutes: 30,
        costPrice: 100.0,
        sellingPrice: 350.0
    }
});

/**
 * High-Risk / Panic Findings Keywords
 * Automatic clinical red-flag triggers for radiologist reports
 */
const CRITICAL_PANIC_FINDINGS = Object.freeze([
    "tension pneumothorax",
    "pneumothorax",
    "intracranial hemorrhage",
    "intracerebral hemorrhage",
    "epidural hematoma",
    "subdural hematoma",
    "subarachnoid hemorrhage",
    "midline shift",
    "herniation",
    "pulmonary embolism",
    "saddle embolus",
    "aortic dissection",
    "ruptured aortic aneurysm",
    "free air under diaphragm",
    "pneumoperitoneum",
    "bowel perforation",
    "testicular torsion",
    "ovarian torsion",
    "ectopic pregnancy",
    "acute spinal cord compression",
    "displaced fracture with neurovascular compromise"
]);

/**
 * Detect critical / panic findings from radiology narrative text
 * 
 * @param {string} findingsText 
 * @param {string} impressionText 
 * @returns {{ isCritical: boolean, matchedKeywords: string[], alertNotes: string|null }}
 */
function detectCriticalFindings(findingsText = "", impressionText = "") {
    const combined = `${findingsText || ""} ${impressionText || ""}`.toLowerCase();
    const matches = [];

    for (const keyword of CRITICAL_PANIC_FINDINGS) {
        if (combined.includes(keyword)) {
            matches.push(keyword);
        }
    }

    if (matches.length > 0) {
        return {
            isCritical: true,
            matchedKeywords: matches,
            alertNotes: `CRITICAL PANIC RADIOLOGY FINDING DETECTED: [${matches.join(", ")}]. Immediate clinical notification required.`
        };
    }

    return {
        isCritical: false,
        matchedKeywords: [],
        alertNotes: null
    };
}

module.exports = {
    MODALITIES,
    BODY_PARTS,
    DICOM_WINDOW_PRESETS,
    STANDARD_RADIOLOGY_PROCEDURES,
    CRITICAL_PANIC_FINDINGS,
    detectCriticalFindings
};
