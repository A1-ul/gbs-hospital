"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BILLING TARIFFS, NHIS ENGINE & FEE SCHEDULES
Master Rates, Multi-Payor Split & Copayment Calculation
LOCATION: src/modules/billing/helpers/billing-tariffs.js
====================================================
*/

/**
 * Standard Payor Classifications
 */
const PAYOR_TYPES = Object.freeze({
    CASH: "CASH",
    NHIS: "NHIS",
    PRIVATE_INSURANCE: "PRIVATE_INSURANCE",
    SPLIT: "SPLIT"
});

/**
 * Supported Payment Channels
 */
const PAYMENT_METHODS = Object.freeze({
    CASH: "CASH",
    MOBILE_MONEY: "MOBILE_MONEY",
    BANK_CARD: "BANK_CARD",
    BANK_TRANSFER: "BANK_TRANSFER",
    CHEQUE: "CHEQUE"
});

/**
 * Standard Ghana Health Service & NHIS Tariff Master Schedule
 */
const STANDARD_TARIFFS = Object.freeze({
    "TARIFF-CONS-GEN": {
        code: "TARIFF-CONS-GEN",
        category: "CONSULTATION",
        name: "General Outpatient (OPD) Consultation",
        standardCashPrice: 50.00,
        nhisPrice: 35.00,
        nhisCovered: true,
        privateInsurancePrice: 65.00
    },
    "TARIFF-CONS-SPEC": {
        code: "TARIFF-CONS-SPEC",
        category: "CONSULTATION",
        name: "Specialist Physician Consultation",
        standardCashPrice: 120.00,
        nhisPrice: 70.00,
        nhisCovered: true,
        privateInsurancePrice: 150.00
    },
    "TARIFF-CONS-EMG": {
        code: "TARIFF-CONS-EMG",
        category: "CONSULTATION",
        name: "Emergency Triage & Resuscitation Assessment",
        standardCashPrice: 80.00,
        nhisPrice: 55.00,
        nhisCovered: true,
        privateInsurancePrice: 100.00
    },
    "TARIFF-BED-GEN": {
        code: "TARIFF-BED-GEN",
        category: "ADMISSION",
        name: "General Ward Bed (Per Day)",
        standardCashPrice: 80.00,
        nhisPrice: 50.00,
        nhisCovered: true,
        privateInsurancePrice: 100.00
    },
    "TARIFF-BED-SEMI": {
        code: "TARIFF-BED-SEMI",
        category: "ADMISSION",
        name: "Semi-Private Room Bed (Per Day)",
        standardCashPrice: 180.00,
        nhisPrice: 50.00,
        nhisCovered: true,
        privateInsurancePrice: 220.00
    },
    "TARIFF-BED-VIP": {
        code: "TARIFF-BED-VIP",
        category: "ADMISSION",
        name: "Private VIP Suite Bed (Per Day)",
        standardCashPrice: 350.00,
        nhisPrice: 50.00,
        nhisCovered: true,
        privateInsurancePrice: 400.00
    },
    "TARIFF-BED-ICU": {
        code: "TARIFF-BED-ICU",
        category: "ADMISSION",
        name: "Intensive Care Unit (ICU) Bed (Per Day)",
        standardCashPrice: 600.00,
        nhisPrice: 200.00,
        nhisCovered: true,
        privateInsurancePrice: 750.00
    },
    "TARIFF-NURSE-CARE": {
        code: "TARIFF-NURSE-CARE",
        category: "PROCEDURE",
        name: "Daily Inpatient Nursing Care & Monitoring",
        standardCashPrice: 30.00,
        nhisPrice: 25.00,
        nhisCovered: true,
        privateInsurancePrice: 40.00
    },
    "TARIFF-NURSE-CAN": {
        code: "TARIFF-NURSE-CAN",
        category: "PROCEDURE",
        name: "Intravenous (IV) Cannulation & Infusion Setup",
        standardCashPrice: 20.00,
        nhisPrice: 15.00,
        nhisCovered: true,
        privateInsurancePrice: 30.00
    },
    "TARIFF-NURSE-DRESS": {
        code: "TARIFF-NURSE-DRESS",
        category: "PROCEDURE",
        name: "Surgical Wound Debridement & Sterile Dressing",
        standardCashPrice: 45.00,
        nhisPrice: 30.00,
        nhisCovered: true,
        privateInsurancePrice: 60.00
    }
});

/**
 * Multi-Payor Split & NHIS Copayment Calculation Engine
 * 
 * @param {Array<Object>} items - Array of line items
 * @param {string} payorType - CASH, NHIS, PRIVATE_INSURANCE, SPLIT
 * @param {number} [discountAmount=0] - Optional discount applied to bill
 * @returns {Object} Calculated financial breakdown
 */
function calculateBillTotals(items = [], payorType = PAYOR_TYPES.CASH, discountAmount = 0) {
    let grossAmount = 0.0;
    let nhisCoveredAmount = 0.0;
    let insuranceCoveredAmount = 0.0;

    for (const item of items) {
        const itemQty = parseInt(item.quantity, 10) || 1;
        const itemUnitPrice = parseFloat(item.unitPrice) || 0.0;
        const itemTotal = parseFloat((itemQty * itemUnitPrice).toFixed(2));
        grossAmount += itemTotal;

        if (payorType === PAYOR_TYPES.NHIS) {
            if (item.nhisCovered) {
                // If specific NHIS tariff rate provided, use it; otherwise default to 80% coverage
                const nhisRate = item.nhisRate !== undefined && item.nhisRate !== null
                    ? parseFloat(item.nhisRate) * itemQty
                    : parseFloat((itemTotal * 0.80).toFixed(2));
                nhisCoveredAmount += Math.min(nhisRate, itemTotal);
            }
        } else if (payorType === PAYOR_TYPES.PRIVATE_INSURANCE) {
            // Private insurance default 85% coverage on authorized items
            insuranceCoveredAmount += parseFloat((itemTotal * 0.85).toFixed(2));
        } else if (payorType === PAYOR_TYPES.SPLIT) {
            if (item.nhisCovered) {
                const nhisRate = item.nhisRate !== undefined && item.nhisRate !== null
                    ? parseFloat(item.nhisRate) * itemQty
                    : parseFloat((itemTotal * 0.70).toFixed(2));
                nhisCoveredAmount += Math.min(nhisRate, itemTotal);
            }
        }
    }

    grossAmount = parseFloat(grossAmount.toFixed(2));
    discountAmount = parseFloat(discountAmount.toFixed(2));
    nhisCoveredAmount = parseFloat(nhisCoveredAmount.toFixed(2));
    insuranceCoveredAmount = parseFloat(insuranceCoveredAmount.toFixed(2));

    const totalCovered = nhisCoveredAmount + insuranceCoveredAmount;
    const subtotalAfterCover = Math.max(0, grossAmount - totalCovered);
    const patientPayableAmount = parseFloat(Math.max(0, subtotalAfterCover - discountAmount).toFixed(2));

    return {
        grossAmount,
        discountAmount,
        nhisCoveredAmount,
        insuranceCoveredAmount,
        patientPayableAmount,
        balanceDue: patientPayableAmount
    };
}

module.exports = {
    PAYOR_TYPES,
    PAYMENT_METHODS,
    STANDARD_TARIFFS,
    calculateBillTotals
};
