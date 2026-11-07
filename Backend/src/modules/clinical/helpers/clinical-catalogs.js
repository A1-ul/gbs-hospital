"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
CLINICAL REFERENCE CATALOGS & STANDARDS
ICD-10 Diagnostic Codes, Medications & Lab Tests
LOCATION: src/modules/clinical/helpers/clinical-catalogs.js
====================================================
*/

/**
 * Authoritative ICD-10 Clinical Diagnostic Reference Catalog
 * Standard WHO Disease Classification Codes
 */
const ICD10_CATALOG = Object.freeze([
    // Communicable & Infectious Diseases
    { code: "B50.9", name: "Plasmodium falciparum malaria, unspecified", category: "Infectious & Parasitic" },
    { code: "B54", name: "Unspecified malaria", category: "Infectious & Parasitic" },
    { code: "A09", name: "Infectious gastroenteritis and colitis, unspecified", category: "Infectious & Parasitic" },
    { code: "A01.0", name: "Typhoid fever", category: "Infectious & Parasitic" },
    { code: "A15.0", name: "Tuberculosis of lung, confirmed by sputum microscopy", category: "Infectious & Parasitic" },
    { code: "B20", name: "Human immunodeficiency virus [HIV] disease", category: "Infectious & Parasitic" },
    { code: "B16.9", name: "Acute hepatitis B without delta-agent and without hepatic coma", category: "Infectious & Parasitic" },
    { code: "B18.2", name: "Chronic viral hepatitis C", category: "Infectious & Parasitic" },

    // Respiratory System
    { code: "J06.9", name: "Acute upper respiratory infection, unspecified", category: "Respiratory System" },
    { code: "J02.9", name: "Acute pharyngitis, unspecified", category: "Respiratory System" },
    { code: "J03.9", name: "Acute tonsillitis, unspecified", category: "Respiratory System" },
    { code: "J18.9", name: "Pneumonia, unspecified organism", category: "Respiratory System" },
    { code: "J20.9", name: "Acute bronchitis, unspecified", category: "Respiratory System" },
    { code: "J45.9", name: "Asthma, unspecified", category: "Respiratory System" },
    { code: "J44.9", name: "Chronic obstructive pulmonary disease, unspecified", category: "Respiratory System" },

    // Cardiovascular System
    { code: "I10", name: "Essential (primary) hypertension", category: "Circulatory System" },
    { code: "I11.9", name: "Hypertensive heart disease without heart failure", category: "Circulatory System" },
    { code: "I20.9", name: "Angina pectoris, unspecified", category: "Circulatory System" },
    { code: "I21.9", name: "Acute myocardial infarction, unspecified", category: "Circulatory System" },
    { code: "I50.9", name: "Heart failure, unspecified", category: "Circulatory System" },
    { code: "I64", name: "Stroke, not specified as haemorrhage or infarction", category: "Circulatory System" },

    // Endocrine, Nutritional & Metabolic Diseases
    { code: "E11.9", name: "Type 2 diabetes mellitus without complications", category: "Endocrine & Metabolic" },
    { code: "E11.2", name: "Type 2 diabetes mellitus with renal complications", category: "Endocrine & Metabolic" },
    { code: "E10.9", name: "Type 1 diabetes mellitus without complications", category: "Endocrine & Metabolic" },
    { code: "E78.5", name: "Hyperlipidaemia, unspecified", category: "Endocrine & Metabolic" },
    { code: "E66.9", name: "Obesity, unspecified", category: "Endocrine & Metabolic" },
    { code: "E03.9", name: "Hypothyroidism, unspecified", category: "Endocrine & Metabolic" },

    // Blood & Blood-Forming Organs
    { code: "D50.9", name: "Iron deficiency anaemia, unspecified", category: "Blood & Immunity" },
    { code: "D57.0", name: "Sickle-cell anaemia with crisis", category: "Blood & Immunity" },
    { code: "D57.1", name: "Sickle-cell anaemia without crisis", category: "Blood & Immunity" },

    // Digestive System
    { code: "K29.7", name: "Gastritis, unspecified", category: "Digestive System" },
    { code: "K27.9", name: "Peptic ulcer, site unspecified, unspecified as acute or chronic", category: "Digestive System" },
    { code: "K21.9", name: "Gastro-oesophageal reflux disease without oesophagitis", category: "Digestive System" },
    { code: "K35.8", name: "Acute appendicitis, other and unspecified", category: "Digestive System" },
    { code: "K40.9", name: "Unilateral inguinal hernia, without obstruction or gangrene", category: "Digestive System" },

    // Genitourinary System
    { code: "N39.0", name: "Urinary tract infection, site not specified", category: "Genitourinary System" },
    { code: "N18.9", name: "Chronic kidney disease, unspecified", category: "Genitourinary System" },
    { code: "N40", name: "Hyperplasia of prostate (Benign prostatic hyperplasia)", category: "Genitourinary System" },
    { code: "N76.0", name: "Acute vaginitis", category: "Genitourinary System" },

    // Musculoskeletal & Connective Tissue
    { code: "M54.5", name: "Low back pain", category: "Musculoskeletal System" },
    { code: "M19.9", name: "Osteoarthritis, unspecified", category: "Musculoskeletal System" },
    { code: "M79.1", name: "Myalgia", category: "Musculoskeletal System" },

    // Nervous System & Sensory Organs
    { code: "G43.9", name: "Migraine, unspecified", category: "Nervous System" },
    { code: "G44.2", name: "Tension-type headache", category: "Nervous System" },
    { code: "H10.9", name: "Conjunctivitis, unspecified", category: "Eye & Adnexa" },
    { code: "H66.9", name: "Otitis media, unspecified", category: "Ear & Mastoid" },

    // Skin & Subcutaneous Tissue
    { code: "L03.9", name: "Cellulitis, unspecified", category: "Skin & Subcutaneous" },
    { code: "L20.9", name: "Atopic dermatitis, unspecified", category: "Skin & Subcutaneous" },
    { code: "L30.9", name: "Dermatitis, unspecified", category: "Skin & Subcutaneous" }
]);

/**
 * Authoritative Clinical Medication Formulary Reference Catalog
 */
const MEDICATION_CATALOG = Object.freeze([
    {
        name: "Artemether / Lumefantrine (Coartem)",
        form: "Tablet",
        dosage: "20mg / 120mg",
        frequency: "BD",
        duration: "3 days",
        instructions: "Take 4 tablets initially, then 4 tablets after 8 hours, then 4 tablets twice daily for 2 days. Take with fatty food or milk.",
        category: "Antimalarials"
    },
    {
        name: "Artesunate / Amodiaquine",
        form: "Tablet",
        dosage: "100mg / 270mg",
        frequency: "OD",
        duration: "3 days",
        instructions: "Take with food. Do not chew.",
        category: "Antimalarials"
    },
    {
        name: "Amoxicillin",
        form: "Capsule",
        dosage: "500mg",
        frequency: "TDS",
        duration: "5 days",
        instructions: "Take every 8 hours with water. Complete full course.",
        category: "Antibiotics"
    },
    {
        name: "Amoxicillin / Clavulanic Acid (Augmentin)",
        form: "Tablet",
        dosage: "625mg",
        frequency: "BD",
        duration: "7 days",
        instructions: "Take at start of meal to minimize gastrointestinal discomfort.",
        category: "Antibiotics"
    },
    {
        name: "Ciprofloxacin",
        form: "Tablet",
        dosage: "500mg",
        frequency: "BD",
        duration: "5 days",
        instructions: "Take 2 hours after meals with plenty of fluids. Avoid dairy products.",
        category: "Antibiotics"
    },
    {
        name: "Metronidazole",
        form: "Tablet",
        dosage: "400mg",
        frequency: "TDS",
        duration: "5 days",
        instructions: "Take with or after food. Absolutely avoid all alcohol during treatment.",
        category: "Antibiotics / Antiprotozoals"
    },
    {
        name: "Azithromycin",
        form: "Tablet",
        dosage: "500mg",
        frequency: "OD",
        duration: "3 days",
        instructions: "Take 1 hour before or 2 hours after food.",
        category: "Antibiotics"
    },
    {
        name: "Amlodipine",
        form: "Tablet",
        dosage: "5mg",
        frequency: "OD",
        duration: "30 days",
        instructions: "Take in the morning with or without food for blood pressure control.",
        category: "Antihypertensives"
    },
    {
        name: "Lisinopril",
        form: "Tablet",
        dosage: "10mg",
        frequency: "OD",
        duration: "30 days",
        instructions: "Take at the same time each day. Monitor blood pressure regularly.",
        category: "Antihypertensives"
    },
    {
        name: "Metformin",
        form: "Tablet",
        dosage: "500mg",
        frequency: "BD",
        duration: "30 days",
        instructions: "Take with or immediately after meals to reduce stomach upset.",
        category: "Antidiabetics"
    },
    {
        name: "Glibenclamide",
        form: "Tablet",
        dosage: "5mg",
        frequency: "OD",
        duration: "30 days",
        instructions: "Take with breakfast or first main meal.",
        category: "Antidiabetics"
    },
    {
        name: "Paracetamol",
        form: "Tablet",
        dosage: "1000mg",
        frequency: "TDS",
        duration: "3 days",
        instructions: "Take for pain or fever. Maximum 4000mg in 24 hours.",
        category: "Analgesics & Antipyretics"
    },
    {
        name: "Ibuprofen",
        form: "Tablet",
        dosage: "400mg",
        frequency: "TDS",
        duration: "3 days",
        instructions: "Take strictly after meals with water.",
        category: "NSAIDs"
    },
    {
        name: "Omeprazole",
        form: "Capsule",
        dosage: "20mg",
        frequency: "OD",
        duration: "14 days",
        instructions: "Take 30 minutes before breakfast on an empty stomach.",
        category: "Gastrointestinal"
    },
    {
        name: "Cetirizine",
        form: "Tablet",
        dosage: "10mg",
        frequency: "OD",
        duration: "5 days",
        instructions: "Take at night before bed.",
        category: "Antihistamines"
    },
    {
        name: "Salbutamol Inhaler",
        form: "Inhaler",
        dosage: "100mcg/puff",
        frequency: "PRN",
        duration: "30 days",
        instructions: "Inhale 1-2 puffs as needed for acute shortness of breath or wheezing.",
        category: "Respiratory"
    }
]);

/**
 * Authoritative Clinical Laboratory Investigation Test Panels
 */
const LAB_TEST_CATALOG = Object.freeze([
    {
        testCode: "LAB-FBC",
        testName: "Full Blood Count (FBC / CBC)",
        department: "Hematology",
        specimen: "Whole Blood (EDTA)",
        turnaroundMinutes: 30
    },
    {
        testCode: "LAB-MAL-RDT",
        testName: "Malaria Rapid Diagnostic Test (RDT)",
        department: "Parasitology",
        specimen: "Capillary / Venous Blood",
        turnaroundMinutes: 15
    },
    {
        testCode: "LAB-MAL-MIC",
        testName: "Malaria Parasite (MP) Microscopy & Density",
        department: "Parasitology",
        specimen: "Whole Blood (EDTA)",
        turnaroundMinutes: 45
    },
    {
        testCode: "LAB-URN-DIP",
        testName: "Urinalysis (Urine Routine & Dipstick)",
        department: "Biochemistry",
        specimen: "Midstream Clean-Catch Urine",
        turnaroundMinutes: 15
    },
    {
        testCode: "LAB-GLU-FBG",
        testName: "Fasting Blood Glucose (FBG)",
        department: "Biochemistry",
        specimen: "Fluoride Oxalate Plasma",
        turnaroundMinutes: 20
    },
    {
        testCode: "LAB-GLU-RBS",
        testName: "Random Blood Sugar (RBS)",
        department: "Biochemistry",
        specimen: "Whole Blood",
        turnaroundMinutes: 10
    },
    {
        testCode: "LAB-HBA1C",
        testName: "Hemoglobin A1c (HbA1c Glycated Hemoglobin)",
        department: "Biochemistry",
        specimen: "Whole Blood (EDTA)",
        turnaroundMinutes: 60
    },
    {
        testCode: "LAB-KFT",
        testName: "Renal / Kidney Function Test (Urea, Electrolytes, Creatinine - U&E)",
        department: "Biochemistry",
        specimen: "Serum",
        turnaroundMinutes: 45
    },
    {
        testCode: "LAB-LFT",
        testName: "Liver Function Tests (ALT, AST, ALP, Total Bilirubin, Albumin)",
        department: "Biochemistry",
        specimen: "Serum",
        turnaroundMinutes: 45
    },
    {
        testCode: "LAB-LIP",
        testName: "Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)",
        department: "Biochemistry",
        specimen: "Serum (12hr Fasting)",
        turnaroundMinutes: 60
    },
    {
        testCode: "LAB-TYP-WID",
        testName: "Widal Agglutination Test (Typhoid Serology)",
        department: "Microbiology & Serology",
        specimen: "Serum",
        turnaroundMinutes: 30
    },
    {
        testCode: "LAB-HEP-B",
        testName: "Hepatitis B Surface Antigen (HBsAg) Screening",
        department: "Serology",
        specimen: "Serum",
        turnaroundMinutes: 20
    },
    {
        testCode: "LAB-HEP-C",
        testName: "Hepatitis C Virus (HCV) Antibody Screening",
        department: "Serology",
        specimen: "Serum",
        turnaroundMinutes: 20
    },
    {
        testCode: "LAB-HIV-SCR",
        testName: "HIV 1&2 Rapid Diagnostic Antibody Screening",
        department: "Serology",
        specimen: "Serum / Whole Blood",
        turnaroundMinutes: 20
    },
    {
        testCode: "LAB-SCK-TST",
        testName: "Sickling Test (Sodium Metabisulfite)",
        department: "Hematology",
        specimen: "Whole Blood (EDTA)",
        turnaroundMinutes: 30
    },
    {
        testCode: "LAB-STOOL-RE",
        testName: "Stool Routine Examination (Microscopy, Ova & Parasites)",
        department: "Parasitology",
        specimen: "Fresh Stool",
        turnaroundMinutes: 30
    }
]);

/**
 * Search ICD-10 diagnostic codes and names
 * @param {string} query - Keyword or code
 * @returns {Array<Object>}
 */
function searchICD10(query = "") {
    if (!query || query.trim() === "") {
        return ICD10_CATALOG.slice(0, 20);
    }
    const cleanQuery = query.trim().toLowerCase();
    return ICD10_CATALOG.filter(item =>
        item.code.toLowerCase().includes(cleanQuery) ||
        item.name.toLowerCase().includes(cleanQuery) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
}

/**
 * Search standard medication formulary
 * @param {string} query - Keyword
 * @returns {Array<Object>}
 */
function searchMedications(query = "") {
    if (!query || query.trim() === "") {
        return MEDICATION_CATALOG.slice(0, 20);
    }
    const cleanQuery = query.trim().toLowerCase();
    return MEDICATION_CATALOG.filter(item =>
        item.name.toLowerCase().includes(cleanQuery) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
}

/**
 * Search laboratory tests catalog
 * @param {string} query - Keyword or code
 * @returns {Array<Object>}
 */
function searchLabTests(query = "") {
    if (!query || query.trim() === "") {
        return LAB_TEST_CATALOG.slice(0, 20);
    }
    const cleanQuery = query.trim().toLowerCase();
    return LAB_TEST_CATALOG.filter(item =>
        item.testCode.toLowerCase().includes(cleanQuery) ||
        item.testName.toLowerCase().includes(cleanQuery) ||
        item.department.toLowerCase().includes(cleanQuery)
    );
}

module.exports = {
    ICD10_CATALOG,
    MEDICATION_CATALOG,
    LAB_TEST_CATALOG,
    searchICD10,
    searchMedications,
    searchLabTests
};
