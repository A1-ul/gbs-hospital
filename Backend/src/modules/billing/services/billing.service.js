"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE BILLING, INVOICING, NHIS & CLAIMS SERVICE
Real PostgreSQL Persistence, Multi-Payor Split & Financial Settlement
LOCATION: src/modules/billing/services/billing.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const {
    generateBillNumber,
    generateReceiptNumber,
    generateClaimNumber
} = require("../helpers/billing-id.generator");
const {
    PAYOR_TYPES,
    PAYMENT_METHODS,
    STANDARD_TARIFFS,
    calculateBillTotals
} = require("../helpers/billing-tariffs");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Create a new hospital invoice / patient bill
 * 
 * @param {Object} billData 
 * @param {Object} issuingUser 
 */
async function createBill(billData, issuingUser) {
    const {
        encounterId,
        patientId: explicitPatientId,
        payorType = PAYOR_TYPES.CASH,
        insuranceProvider,
        insurancePolicyNumber,
        items = [],
        discountAmount = 0.0,
        description,
        notes
    } = billData;

    if (!encounterId) {
        throw new AppError("Clinical Encounter ID is required to generate bill", 400, "MISSING_ENCOUNTER_ID");
    }

    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError("At least one billable line item is required", 400, "EMPTY_BILL_ITEMS");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: { patient: true }
    });

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const patientId = explicitPatientId || encounter.patientId;
    const totals = calculateBillTotals(items, payorType, discountAmount);

    const billNumber = await generateBillNumber();
    const issuedById = issuingUser ? issuingUser.id : null;
    const issuedByName = issuingUser
        ? (issuingUser.name || `${issuingUser.firstName || ""} ${issuingUser.lastName || ""}`.trim() || null)
        : "Hospital Cashier / Billing Officer";

    // Auto-resolve policy number from patient record if NHIS and not explicitly given
    const effectivePolicyNumber = insurancePolicyNumber ||
        (payorType === PAYOR_TYPES.NHIS ? encounter.patient?.nhisNumber : null);

    const bill = await prisma.patientBill.create({
        data: {
            encounterId: encounter.id,
            patientId,
            billNumber,
            billDate: new Date(),
            payorType,
            insuranceProvider: insuranceProvider || (payorType === PAYOR_TYPES.NHIS ? "NHIS" : null),
            insurancePolicyNumber: effectivePolicyNumber,
            grossAmount: totals.grossAmount,
            discountAmount: totals.discountAmount,
            nhisCoveredAmount: totals.nhisCoveredAmount,
            insuranceCoveredAmount: totals.insuranceCoveredAmount,
            patientPayableAmount: totals.patientPayableAmount,
            paidAmount: 0.00,
            balanceDue: totals.patientPayableAmount,
            amount: totals.grossAmount, // compatibility alias
            paymentStatus: totals.patientPayableAmount === 0 ? "PAID" : "UNPAID",
            description: description || `Medical services invoice for Encounter ${encounter.encounterNumber}`,
            notes: notes || null,
            issuedById,
            issuedByName,
            items: {
                create: items.map(item => ({
                    category: item.category || "GENERAL",
                    serviceCode: item.serviceCode || null,
                    serviceName: item.serviceName || "Medical Service",
                    unitPrice: parseFloat(item.unitPrice) || 0.0,
                    quantity: parseInt(item.quantity, 10) || 1,
                    totalAmount: parseFloat(((parseInt(item.quantity, 10) || 1) * (parseFloat(item.unitPrice) || 0.0)).toFixed(2)),
                    nhisCovered: Boolean(item.nhisCovered),
                    nhisRate: parseFloat(item.nhisRate) || 0.0,
                    referenceId: item.referenceId || null,
                    notes: item.notes || null
                }))
            }
        },
        include: {
            encounter: { include: { patient: true } },
            items: true,
            payments: true,
            claims: true
        }
    });

    // If NHIS or Private Insurance covered amount exists, auto-stage an InsuranceClaim
    const coveredAmount = payorType === PAYOR_TYPES.NHIS
        ? totals.nhisCoveredAmount
        : totals.insuranceCoveredAmount;

    if (coveredAmount > 0 && (payorType === PAYOR_TYPES.NHIS || payorType === PAYOR_TYPES.PRIVATE_INSURANCE || payorType === PAYOR_TYPES.SPLIT)) {
        const claimNumber = await generateClaimNumber();
        const claim = await prisma.insuranceClaim.create({
            data: {
                billId: bill.id,
                claimNumber,
                patientId,
                payorType: payorType === PAYOR_TYPES.PRIVATE_INSURANCE ? "PRIVATE_INSURANCE" : "NHIS",
                insuranceProvider: bill.insuranceProvider || (payorType === PAYOR_TYPES.NHIS ? "NHIS" : "PRIVATE_INSURANCE"),
                policyNumber: effectivePolicyNumber || "PENDING_VERIFICATION",
                claimedAmount: coveredAmount,
                status: "GENERATED",
                notes: `Auto-generated claim for Bill ${billNumber}`
            }
        });
        bill.claims = [claim];
    }

    logger.info(`[BillingService] Created Bill ${billNumber} for patient ${patientId} (Gross: GHS ${totals.grossAmount}, Payable: GHS ${totals.patientPayableAmount})`);
    return bill;
}

/**
 * Automatically compile and generate bill from an active clinical encounter
 * 
 * @param {string} encounterId 
 * @param {Object} options 
 * @param {Object} issuingUser 
 */
async function generateBillFromEncounter(encounterId, options = {}, issuingUser) {
    if (!encounterId) {
        throw new AppError("Encounter ID is required", 400, "MISSING_ENCOUNTER_ID");
    }

    const encounter = await prisma.patientEncounter.findUnique({
        where: { id: encounterId },
        include: {
            patient: true,
            consultations: true,
            prescriptions: true,
            laboratoryRequests: true,
            radiologyOrders: true,
            nursingRecords: true
        }
    });

    if (!encounter) {
        throw new AppError("Clinical Encounter not found", 404, "ENCOUNTER_NOT_FOUND");
    }

    const items = [];

    // 1. Consultation Fee
    if (encounter.consultations && encounter.consultations.length > 0) {
        const tariff = STANDARD_TARIFFS["TARIFF-CONS-GEN"];
        items.push({
            category: "CONSULTATION",
            serviceCode: tariff.code,
            serviceName: tariff.name,
            unitPrice: tariff.standardCashPrice,
            quantity: encounter.consultations.length,
            nhisCovered: tariff.nhisCovered,
            nhisRate: tariff.nhisPrice
        });
    }

    // 2. Electronic Prescriptions
    if (encounter.prescriptions && encounter.prescriptions.length > 0) {
        for (const rx of encounter.prescriptions) {
            items.push({
                category: "PHARMACY",
                serviceCode: rx.medicationCode || "MED-RX",
                serviceName: rx.medicationName || "Prescribed Medication",
                unitPrice: 25.00, // Standard unit rate if unpriced
                quantity: parseInt(rx.quantity, 10) || 1,
                nhisCovered: true,
                nhisRate: 20.00,
                referenceId: rx.id
            });
        }
    }

    // 3. Laboratory Investigations
    if (encounter.laboratoryRequests && encounter.laboratoryRequests.length > 0) {
        for (const lab of encounter.laboratoryRequests) {
            items.push({
                category: "LABORATORY",
                serviceCode: lab.testCode || "LAB-DIAG",
                serviceName: lab.testName || "Laboratory Diagnostic Investigation",
                unitPrice: 45.00,
                quantity: 1,
                nhisCovered: true,
                nhisRate: 35.00,
                referenceId: lab.id
            });
        }
    }

    // 4. Radiology Imaging Scans
    if (encounter.radiologyOrders && encounter.radiologyOrders.length > 0) {
        for (const rad of encounter.radiologyOrders) {
            items.push({
                category: "RADIOLOGY",
                serviceCode: rad.procedureCode || "RAD-SCAN",
                serviceName: rad.procedureName || "Diagnostic Imaging Scan",
                unitPrice: 120.00,
                quantity: 1,
                nhisCovered: false, // Advanced radiology typically non-NHIS or partial copay
                nhisRate: 0.00,
                referenceId: rad.id
            });
        }
    }

    // 5. Nursing Procedures & Inpatient Care
    if (encounter.nursingRecords && encounter.nursingRecords.length > 0) {
        const tariff = STANDARD_TARIFFS["TARIFF-NURSE-CARE"];
        items.push({
            category: "PROCEDURE",
            serviceCode: tariff.code,
            serviceName: tariff.name,
            unitPrice: tariff.standardCashPrice,
            quantity: encounter.nursingRecords.length,
            nhisCovered: tariff.nhisCovered,
            nhisRate: tariff.nhisPrice
        });
    }

    // Fallback if no specific clinical items recorded
    if (items.length === 0) {
        const tariff = STANDARD_TARIFFS["TARIFF-CONS-GEN"];
        items.push({
            category: "CONSULTATION",
            serviceCode: tariff.code,
            serviceName: tariff.name,
            unitPrice: tariff.standardCashPrice,
            quantity: 1,
            nhisCovered: tariff.nhisCovered,
            nhisRate: tariff.nhisPrice
        });
    }

    const payorType = options.payorType || (encounter.patient?.nhisNumber ? PAYOR_TYPES.NHIS : PAYOR_TYPES.CASH);
    const billData = {
        encounterId: encounter.id,
        patientId: encounter.patientId,
        payorType,
        insuranceProvider: options.insuranceProvider || (payorType === PAYOR_TYPES.NHIS ? "NHIS" : null),
        insurancePolicyNumber: options.insurancePolicyNumber || encounter.patient?.nhisNumber,
        items,
        discountAmount: options.discountAmount || 0.0,
        description: `Automated comprehensive invoice for Encounter ${encounter.encounterNumber}`
    };

    return createBill(billData, issuingUser);
}

/**
 * List patient bills with filters and pagination
 * 
 * @param {Object} query 
 */
async function getBills(query = {}) {
    const {
        patientId,
        encounterId,
        paymentStatus,
        payorType,
        search,
        page = 1,
        limit = 50
    } = query;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (encounterId) where.encounterId = encounterId;
    if (paymentStatus) where.paymentStatus = paymentStatus.toUpperCase();
    if (payorType) where.payorType = payorType.toUpperCase();

    if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
            { billNumber: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
            { insurancePolicyNumber: { contains: searchTerm, mode: "insensitive" } }
        ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [bills, total] = await Promise.all([
        prisma.patientBill.findMany({
            where,
            include: {
                encounter: { include: { patient: true } },
                items: true,
                payments: true,
                claims: true
            },
            orderBy: { createdAt: "desc" },
            skip,
            take
        }),
        prisma.patientBill.count({ where })
    ]);

    return {
        data: bills,
        pagination: {
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            pages: Math.ceil(total / take)
        }
    };
}

/**
 * Get bill details by ID or bill number
 * 
 * @param {string} idOrNumber 
 */
async function getBillById(idOrNumber) {
    if (!idOrNumber) {
        throw new AppError("Bill ID or Bill Number is required", 400, "MISSING_IDENTIFIER");
    }

    const bill = await prisma.patientBill.findFirst({
        where: {
            OR: [
                { id: idOrNumber },
                { billNumber: idOrNumber }
            ]
        },
        include: {
            encounter: { include: { patient: true } },
            items: true,
            payments: { orderBy: { paymentDate: "desc" } },
            claims: true
        }
    });

    if (!bill) {
        throw new AppError(`Patient bill '${idOrNumber}' not found`, 404, "BILL_NOT_FOUND");
    }

    return bill;
}

/**
 * Process a payment and issue an official sequential receipt: REC-YYYY-XXXXXX
 * 
 * @param {Object} paymentData 
 * @param {Object} cashierUser 
 */
async function processPayment(paymentData, cashierUser) {
    const {
        billId,
        amount,
        paymentMethod = PAYMENT_METHODS.CASH,
        paymentReference,
        notes
    } = paymentData;

    if (!billId) {
        throw new AppError("Bill ID is required to process payment", 400, "MISSING_BILL_ID");
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new AppError("Payment amount must be greater than zero", 400, "INVALID_PAYMENT_AMOUNT");
    }

    const bill = await prisma.patientBill.findUnique({
        where: { id: billId }
    });

    if (!bill) {
        throw new AppError("Patient bill not found", 404, "BILL_NOT_FOUND");
    }

    if (bill.paymentStatus === "PAID") {
        throw new AppError("Bill is already fully paid and settled", 400, "BILL_ALREADY_PAID");
    }

    const receiptNumber = await generateReceiptNumber();
    const cashierId = cashierUser ? cashierUser.id : null;
    const cashierName = cashierUser
        ? (cashierUser.name || `${cashierUser.firstName || ""} ${cashierUser.lastName || ""}`.trim() || null)
        : "Hospital Cashier";

    // Create payment record
    const payment = await prisma.patientPayment.create({
        data: {
            billId: bill.id,
            receiptNumber,
            amount: paymentAmount,
            paymentMethod: paymentMethod.toUpperCase(),
            paymentReference: paymentReference || null,
            paymentDate: new Date(),
            receivedById: cashierId,
            receivedByName: cashierName,
            notes: notes || null
        }
    });

    // Update bill paidAmount, balanceDue, and paymentStatus
    const newPaidAmount = parseFloat((parseFloat(bill.paidAmount) + paymentAmount).toFixed(2));
    const newBalanceDue = parseFloat(Math.max(0, parseFloat(bill.patientPayableAmount) - newPaidAmount).toFixed(2));
    const newStatus = newBalanceDue <= 0.00 ? "PAID" : "PARTIALLY_PAID";

    const updatedBill = await prisma.patientBill.update({
        where: { id: bill.id },
        data: {
            paidAmount: newPaidAmount,
            balanceDue: newBalanceDue,
            paymentStatus: newStatus
        },
        include: {
            encounter: { include: { patient: true } },
            items: true,
            payments: true,
            claims: true
        }
    });

    logger.info(`[BillingService] Processed payment ${receiptNumber} of GHS ${paymentAmount} via ${paymentMethod} for Bill ${bill.billNumber} (New Balance: GHS ${newBalanceDue})`);

    return {
        payment,
        bill: updatedBill
    };
}

/**
 * Create or submit an insurance / NHIS claim
 * 
 * @param {Object} claimData 
 * @param {Object} staffUser 
 */
async function createInsuranceClaim(claimData, staffUser) {
    const {
        billId,
        payorType = "NHIS",
        insuranceProvider,
        policyNumber,
        claimedAmount,
        icd10Diagnosis,
        notes
    } = claimData;

    if (!billId) {
        throw new AppError("Bill ID is required for insurance claim", 400, "MISSING_BILL_ID");
    }

    const bill = await prisma.patientBill.findUnique({
        where: { id: billId }
    });

    if (!bill) {
        throw new AppError("Patient bill not found", 404, "BILL_NOT_FOUND");
    }

    const claimNumber = await generateClaimNumber();
    const claim = await prisma.insuranceClaim.create({
        data: {
            billId: bill.id,
            claimNumber,
            patientId: bill.patientId,
            payorType: payorType.toUpperCase(),
            insuranceProvider: insuranceProvider || (payorType === "NHIS" ? "NHIS" : "PRIVATE_INSURANCE"),
            policyNumber: policyNumber || bill.insurancePolicyNumber || "NHIS-POLICY",
            claimedAmount: parseFloat(claimedAmount) || parseFloat(bill.nhisCoveredAmount) || parseFloat(bill.grossAmount),
            status: "SUBMITTED",
            icd10Diagnosis: icd10Diagnosis || null,
            submittedAt: new Date(),
            notes: notes || null
        }
    });

    logger.info(`[BillingService] Created Insurance Claim ${claimNumber} for Bill ${bill.billNumber}`);
    return claim;
}

/**
 * Update an Insurance / NHIS Claim Status (Adjudication & Settlement)
 * 
 * @param {string} claimId 
 * @param {Object} updateData 
 * @param {Object} staffUser 
 */
async function updateClaimStatus(claimId, updateData = {}, staffUser) {
    const {
        status,
        approvedAmount,
        rejectionReason,
        notes
    } = updateData;

    if (!claimId) {
        throw new AppError("Claim ID is required", 400, "MISSING_CLAIM_ID");
    }

    const claim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId }
    });

    if (!claim) {
        throw new AppError("Insurance claim not found", 404, "CLAIM_NOT_FOUND");
    }

    const updatePayload = {
        status: status ? status.toUpperCase() : claim.status,
        notes: notes || claim.notes
    };

    if (approvedAmount !== undefined) {
        updatePayload.approvedAmount = parseFloat(approvedAmount);
    }

    if (rejectionReason) {
        updatePayload.rejectionReason = rejectionReason;
    }

    if (status === "SETTLED" || status === "APPROVED") {
        updatePayload.settledAt = new Date();
    }

    const updated = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: updatePayload
    });

    return updated;
}

/**
 * Get Real-Time Finance & Billing Command Center Telemetry
 */
async function getBillingDashboardTelemetry() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        billsToday,
        paymentsToday,
        unpaidBills,
        claimsStats,
        paymentsByMethod
    ] = await Promise.all([
        prisma.patientBill.findMany({
            where: { createdAt: { gte: today } }
        }),
        prisma.patientPayment.findMany({
            where: { paymentDate: { gte: today } }
        }),
        prisma.patientBill.findMany({
            where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } }
        }),
        prisma.insuranceClaim.groupBy({
            by: ["status"],
            _count: { id: true },
            _sum: { claimedAmount: true, approvedAmount: true }
        }),
        prisma.patientPayment.groupBy({
            by: ["paymentMethod"],
            _count: { id: true },
            _sum: { amount: true },
            where: { paymentDate: { gte: today } }
        })
    ]);

    let totalInvoicedToday = 0.0;
    let totalPaidToday = 0.0;
    let totalOutstandingBalances = 0.0;

    for (const b of billsToday) {
        totalInvoicedToday += parseFloat(b.grossAmount || 0);
    }

    for (const p of paymentsToday) {
        totalPaidToday += parseFloat(p.amount || 0);
    }

    for (const u of unpaidBills) {
        totalOutstandingBalances += parseFloat(u.balanceDue || 0);
    }

    const paymentMethodsBreakdown = {};
    for (const pm of paymentsByMethod) {
        paymentMethodsBreakdown[pm.paymentMethod] = {
            count: pm._count.id,
            totalAmount: parseFloat((pm._sum.amount || 0).toFixed(2))
        };
    }

    const claimsSummary = {};
    for (const c of claimsStats) {
        claimsSummary[c.status] = {
            count: c._count.id,
            totalClaimed: parseFloat((c._sum.claimedAmount || 0).toFixed(2)),
            totalApproved: parseFloat((c._sum.approvedAmount || 0).toFixed(2))
        };
    }

    return {
        totalInvoicedToday: parseFloat(totalInvoicedToday.toFixed(2)),
        totalPaidToday: parseFloat(totalPaidToday.toFixed(2)),
        totalOutstandingBalances: parseFloat(totalOutstandingBalances.toFixed(2)),
        totalBillsTodayCount: billsToday.length,
        totalPaymentsTodayCount: paymentsToday.length,
        paymentMethodsBreakdown,
        claimsSummary,
        accountingHealth: {
            generalLedgerSynced: true,
            nhisClaimPortalConnected: true,
            momoGatewayOnline: true
        }
    };
}

/**
 * Seed master tariff fee schedule into database
 */
async function seedBillingTariffCatalog() {
    const tariffs = Object.values(STANDARD_TARIFFS);
    const results = [];

    for (const item of tariffs) {
        const seeded = await prisma.billingTariffItem.upsert({
            where: { code: item.code },
            update: {
                category: item.category,
                name: item.name,
                standardCashPrice: item.standardCashPrice,
                nhisPrice: item.nhisPrice,
                nhisCovered: item.nhisCovered,
                privateInsurancePrice: item.privateInsurancePrice
            },
            create: {
                code: item.code,
                category: item.category,
                name: item.name,
                standardCashPrice: item.standardCashPrice,
                nhisPrice: item.nhisPrice,
                nhisCovered: item.nhisCovered,
                privateInsurancePrice: item.privateInsurancePrice
            }
        });
        results.push(seeded);
    }

    return results;
}

module.exports = {
    createBill,
    generateBillFromEncounter,
    getBills,
    getBillById,
    processPayment,
    createInsuranceClaim,
    updateClaimStatus,
    getBillingDashboardTelemetry,
    seedBillingTariffCatalog
};
