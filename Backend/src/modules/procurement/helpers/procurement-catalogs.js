"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN - CATALOGS & THREE-WAY MATCHING
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/helpers/procurement-catalogs.js
====================================================
*/

const VENDOR_CATEGORIES = Object.freeze({
    PHARMACEUTICALS: {
        code: "PHARMACEUTICALS",
        name: "Pharmaceuticals & IV Fluids",
        requiresColdChainAudit: true,
        defaultTaxRate: 0.0
    },
    SURGICAL_CONSUMABLES: {
        code: "SURGICAL_CONSUMABLES",
        name: "Surgical & Theatre Consumables",
        requiresSterilityCert: true,
        defaultTaxRate: 0.15
    },
    LAB_REAGENTS: {
        code: "LAB_REAGENTS",
        name: "Laboratory Reagents & Test Kits",
        requiresTemperatureAudit: true,
        defaultTaxRate: 0.15
    },
    MEDICAL_EQUIPMENT: {
        code: "MEDICAL_EQUIPMENT",
        name: "Biomedical & Diagnostic Equipment",
        requiresWarrantySla: true,
        defaultTaxRate: 0.15
    },
    FACILITIES_ENGINEERING: {
        code: "FACILITIES_ENGINEERING",
        name: "Facilities, Oxygen Plants & Power Infrastructure",
        requiresWarrantySla: true,
        defaultTaxRate: 0.15
    },
    GENERAL_SUPPLIES: {
        code: "GENERAL_SUPPLIES",
        name: "General Hospital Stationary & Disposables",
        requiresColdChainAudit: false,
        defaultTaxRate: 0.15
    }
});

const PAYMENT_TERMS = Object.freeze([
    "NET_30",
    "NET_60",
    "NET_90",
    "IMMEDIATE_CASH",
    "ADVANCE_50_PERCENT"
]);

const CONTRACT_TYPES = Object.freeze([
    "EXCLUSIVE_SUPPLY",
    "FRAMEWORK_AGREEMENT",
    "SERVICE_LEVEL_AGREEMENT",
    "ONE_TIME_PURCHASE"
]);

const PO_STATUSES = Object.freeze([
    "DRAFT",
    "SUBMITTED_FOR_APPROVAL",
    "APPROVED",
    "ISSUED_TO_VENDOR",
    "PARTIALLY_RECEIVED",
    "FULLY_RECEIVED",
    "CANCELLED"
]);

const PO_PRIORITIES = Object.freeze([
    "ROUTINE",
    "URGENT",
    "EMERGENCY_STOCKOUT"
]);

const HOSPITAL_DEPARTMENTS = Object.freeze([
    "CENTRAL_STORES",
    "PHARMACY",
    "THEATRE",
    "LABORATORY",
    "BIOMEDICAL",
    "EMERGENCY",
    "GENERAL"
]);

/**
 * Three-Way Matching Engine:
 * Compares Purchase Order (quantities & unit costs) against
 * Goods Receipt Note (actual quantities accepted) against
 * Supplier Invoice Amount.
 * Tolerance threshold: 0.01 GHS
 */
function evaluateThreeWayMatch({ purchaseOrder, grnItems, invoiceAmount }) {
    if (!purchaseOrder || !Array.isArray(grnItems)) {
        return {
            isMatch: false,
            variance: 0,
            expectedTotal: 0,
            invoiceAmount: Number(invoiceAmount) || 0,
            notes: "Invalid PO or GRN items provided for three-way match."
        };
    }

    // Calculate expected total for accepted received quantities
    let expectedTotal = 0;
    const lineDiscrepancies = [];

    for (const grnItem of grnItems) {
        const matchingPoItem = (purchaseOrder.items || []).find(
            poi => poi.itemCode === grnItem.itemCode || poi.id === grnItem.poItemId
        );

        const unitCost = Number(grnItem.unitCost || (matchingPoItem ? matchingPoItem.unitCost : 0));
        const acceptedQty = Number(grnItem.quantityAccepted || 0);
        const lineTotal = acceptedQty * unitCost;
        expectedTotal += lineTotal;

        if (matchingPoItem && matchingPoItem.quantityOrdered < acceptedQty) {
            lineDiscrepancies.push({
                itemCode: grnItem.itemCode,
                issue: `Received quantity (${acceptedQty}) exceeds PO quantity (${matchingPoItem.quantityOrdered})`
            });
        }
    }

    // Add PO tax ratio if applicable
    const poSubtotal = Number(purchaseOrder.subtotal) || 1;
    const poTaxAmount = Number(purchaseOrder.taxAmount) || 0;
    const taxRate = poTaxAmount / poSubtotal;
    const expectedTax = expectedTotal * taxRate;
    const finalExpectedPayable = Math.round((expectedTotal + expectedTax) * 100) / 100;

    const actualInvoice = Number(invoiceAmount) || 0;
    const variance = Math.round((actualInvoice - finalExpectedPayable) * 100) / 100;
    const isMatch = Math.abs(variance) <= 0.05 && lineDiscrepancies.length === 0;

    return {
        isMatch,
        expectedTotal: finalExpectedPayable,
        invoiceAmount: actualInvoice,
        variance,
        lineDiscrepancies,
        taxApplied: expectedTax,
        notes: isMatch
            ? "Three-way match verified successfully. PO, GRN, and Invoice values align."
            : `Three-way match variance detected: ${variance > 0 ? "+" : ""}${variance} GHS deviation.`
    };
}

module.exports = {
    VENDOR_CATEGORIES,
    PAYMENT_TERMS,
    CONTRACT_TYPES,
    PO_STATUSES,
    PO_PRIORITIES,
    HOSPITAL_DEPARTMENTS,
    evaluateThreeWayMatch
};
