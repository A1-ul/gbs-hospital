"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PROCUREMENT & SUPPLY CHAIN CORE SERVICE
Phase 16 Production Hardened - CommonJS Only
LOCATION: src/modules/procurement/procurement.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const logger = require("../../core/utils/logger");
const {
    generateVendorCode,
    generateContractNumber,
    generatePurchaseOrderNumber,
    generateGrnNumber
} = require("./helpers/procurement-id.generator");
const {
    VENDOR_CATEGORIES,
    PAYMENT_TERMS,
    CONTRACT_TYPES,
    PO_STATUSES,
    PO_PRIORITIES,
    HOSPITAL_DEPARTMENTS,
    evaluateThreeWayMatch
} = require("./helpers/procurement-catalogs");

/**
 * Returns procurement standard catalogs and configuration options
 */
async function getProcurementCatalogs() {
    return {
        vendorCategories: Object.values(VENDOR_CATEGORIES),
        paymentTerms: PAYMENT_TERMS,
        contractTypes: CONTRACT_TYPES,
        poStatuses: PO_STATUSES,
        poPriorities: PO_PRIORITIES,
        departments: HOSPITAL_DEPARTMENTS
    };
}

/**
 * Aggregates live PostgreSQL Command Center telemetry for Supply Chain & Procurement
 */
async function getProcurementStats() {
    const [
        totalVendors,
        activeVendors,
        pendingPOs,
        approvedPOs,
        fullyReceivedPOs,
        allPOs,
        totalGrns,
        matchedGrns,
        pendingInspectionGrns,
        activeContractsCount
    ] = await Promise.all([
        prisma.procurementVendor.count(),
        prisma.procurementVendor.count({ where: { status: "ACTIVE" } }),
        prisma.purchaseOrder.count({
            where: { status: { in: ["DRAFT", "SUBMITTED_FOR_APPROVAL"] } }
        }),
        prisma.purchaseOrder.count({
            where: { status: { in: ["APPROVED", "ISSUED_TO_VENDOR"] } }
        }),
        prisma.purchaseOrder.count({
            where: { status: "FULLY_RECEIVED" }
        }),
        prisma.purchaseOrder.findMany({
            where: { status: { in: ["APPROVED", "ISSUED_TO_VENDOR", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"] } },
            select: { totalAmount: true }
        }),
        prisma.goodsReceiptNote.count(),
        prisma.goodsReceiptNote.count({ where: { threeWayMatchVerified: true } }),
        prisma.goodsReceiptNote.count({
            where: {
                OR: [
                    { status: "RECEIVED_IN_QUARANTINE" },
                    { inspectionStatus: { not: "INSPECTION_PASSED" } }
                ]
            }
        }),
        prisma.vendorContract.count({ where: { status: "ACTIVE" } })
    ]);

    const totalSpend = allPOs.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const threeWayMatchCompliancePercent = totalGrns > 0
        ? Math.round((matchedGrns / totalGrns) * 100)
        : 100;

    return {
        totalVendors,
        activeVendors,
        pendingPurchaseOrders: pendingPOs,
        approvedPurchaseOrders: approvedPOs,
        fullyReceivedOrders: fullyReceivedPOs,
        totalSpendYtd: Math.round(totalSpend * 100) / 100,
        currency: "GHS",
        threeWayMatchCompliancePercent,
        pendingGrnInspections: pendingInspectionGrns,
        activeContractsCount
    };
}

/**
 * Registers a new procurement vendor with sequential VND-YYYY-XXXXXX code
 */
async function registerVendor(data) {
    if (!data.name || !data.category || !data.contactPerson || !data.email || !data.phone || !data.address) {
        throw new AppError("Vendor name, category, contact person, email, phone, and address are required.", 400);
    }

    const vendorCode = await generateVendorCode();

    const vendor = await prisma.procurementVendor.create({
        data: {
            vendorCode,
            name: data.name.trim(),
            category: data.category,
            taxIdentificationNumber: data.taxIdentificationNumber ? data.taxIdentificationNumber.trim() : null,
            contactPerson: data.contactPerson.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
            address: data.address.trim(),
            bankName: data.bankName ? data.bankName.trim() : null,
            bankAccountNumber: data.bankAccountNumber ? data.bankAccountNumber.trim() : null,
            bankBranch: data.bankBranch ? data.bankBranch.trim() : null,
            paymentTerms: data.paymentTerms || "NET_30",
            rating: typeof data.rating === "number" ? data.rating : 5.0,
            status: data.status || "ACTIVE",
            notes: data.notes || null
        }
    });

    logger.info(`Registered vendor ${vendor.vendorCode} (${vendor.name})`);
    return vendor;
}

/**
 * Retrieves list of vendors with optional filtering
 */
async function getVendors(filters = {}) {
    const where = {};

    if (filters.category) {
        where.category = filters.category;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
            { vendorCode: { contains: s, mode: "insensitive" } },
            { name: { contains: s, mode: "insensitive" } },
            { contactPerson: { contains: s, mode: "insensitive" } },
            { email: { contains: s, mode: "insensitive" } }
        ];
    }

    return prisma.procurementVendor.findMany({
        where,
        include: {
            _count: {
                select: {
                    contracts: true,
                    purchaseOrders: true,
                    goodsReceipts: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Retrieves a single vendor by ID with all relations
 */
async function getVendorById(id) {
    const vendor = await prisma.procurementVendor.findUnique({
        where: { id },
        include: {
            contracts: { orderBy: { createdAt: "desc" } },
            purchaseOrders: {
                orderBy: { createdAt: "desc" },
                include: { items: true }
            },
            goodsReceipts: {
                orderBy: { createdAt: "desc" },
                include: { items: true }
            }
        }
    });

    if (!vendor) {
        throw new AppError("Vendor not found.", 404);
    }
    return vendor;
}

/**
 * Updates vendor profile or status
 */
async function updateVendor(id, data) {
    const existing = await prisma.procurementVendor.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Vendor not found.", 404);
    }

    return prisma.procurementVendor.update({
        where: { id },
        data: {
            name: data.name !== undefined ? data.name.trim() : existing.name,
            category: data.category || existing.category,
            taxIdentificationNumber: data.taxIdentificationNumber !== undefined ? data.taxIdentificationNumber : existing.taxIdentificationNumber,
            contactPerson: data.contactPerson !== undefined ? data.contactPerson.trim() : existing.contactPerson,
            email: data.email !== undefined ? data.email.trim().toLowerCase() : existing.email,
            phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
            address: data.address !== undefined ? data.address.trim() : existing.address,
            bankName: data.bankName !== undefined ? data.bankName : existing.bankName,
            bankAccountNumber: data.bankAccountNumber !== undefined ? data.bankAccountNumber : existing.bankAccountNumber,
            bankBranch: data.bankBranch !== undefined ? data.bankBranch : existing.bankBranch,
            paymentTerms: data.paymentTerms || existing.paymentTerms,
            rating: typeof data.rating === "number" ? data.rating : existing.rating,
            status: data.status || existing.status,
            notes: data.notes !== undefined ? data.notes : existing.notes
        }
    });
}

/**
 * Registers a formal Vendor Contract with sequential CON-YYYY-XXXXXX
 */
async function registerVendorContract(data) {
    if (!data.vendorId || !data.title || !data.startDate || !data.endDate) {
        throw new AppError("Vendor ID, title, start date, and end date are required.", 400);
    }

    const vendor = await prisma.procurementVendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) {
        throw new AppError("Vendor not found.", 404);
    }

    const contractNumber = await generateContractNumber();

    const contract = await prisma.vendorContract.create({
        data: {
            contractNumber,
            vendorId: data.vendorId,
            title: data.title.trim(),
            contractType: data.contractType || "FRAMEWORK_AGREEMENT",
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            contractValue: typeof data.contractValue === "number" ? data.contractValue : 0.0,
            currency: data.currency || "GHS",
            status: data.status || "ACTIVE",
            termsConditions: data.termsConditions || null,
            signedByRepresentative: data.signedByRepresentative || null,
            signedByHospitalDirector: data.signedByHospitalDirector || null
        },
        include: { vendor: true }
    });

    logger.info(`Registered vendor contract ${contract.contractNumber} for ${vendor.name}`);
    return contract;
}

/**
 * Retrieves vendor contracts
 */
async function getVendorContracts(filters = {}) {
    const where = {};
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.status) where.status = filters.status;
    if (filters.contractType) where.contractType = filters.contractType;

    return prisma.vendorContract.findMany({
        where,
        include: { vendor: true },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Creates a Purchase Order with line items and sequential PO-YYYY-XXXXXX
 */
async function createPurchaseOrder(data) {
    if (!data.vendorId || !data.requisitionedBy || !Array.isArray(data.items) || data.items.length === 0) {
        throw new AppError("Vendor ID, requisitionedBy, and at least one line item are required.", 400);
    }

    const vendor = await prisma.procurementVendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) {
        throw new AppError("Vendor not found.", 404);
    }

    if (vendor.status !== "ACTIVE") {
        throw new AppError(`Cannot create PO for vendor in '${vendor.status}' status.`, 400);
    }

    const poNumber = await generatePurchaseOrderNumber();

    // Compute line costs and totals
    let subtotal = 0;
    const processedItems = data.items.map(item => {
        if (!item.itemCode || !item.description || !item.quantityOrdered || item.quantityOrdered <= 0) {
            throw new AppError("Each PO item requires valid itemCode, description, and positive quantityOrdered.", 400);
        }
        const unitCost = Number(item.unitCost) || 0;
        const qty = Number(item.quantityOrdered);
        const totalCost = Math.round(qty * unitCost * 100) / 100;
        subtotal += totalCost;

        return {
            itemCode: item.itemCode.trim(),
            description: item.description.trim(),
            quantityOrdered: qty,
            quantityReceived: 0,
            unitCost,
            totalCost,
            unitOfMeasure: item.unitOfMeasure || "UNIT"
        };
    });

    const taxAmount = typeof data.taxAmount === "number" ? Math.round(data.taxAmount * 100) / 100 : 0.0;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const isEmergencyStockout = data.priority === "EMERGENCY_STOCKOUT";

    const po = await prisma.$transaction(async (tx) => {
        const createdPo = await tx.purchaseOrder.create({
            data: {
                poNumber,
                vendorId: data.vendorId,
                department: data.department || "CENTRAL_STORES",
                orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
                expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
                subtotal,
                taxAmount,
                totalAmount,
                currency: data.currency || "GHS",
                status: data.status || "DRAFT",
                priority: data.priority || "ROUTINE",
                emergencyStockoutLogged: isEmergencyStockout,
                requisitionedBy: data.requisitionedBy.trim(),
                approvedBy: data.approvedBy || null,
                approvedAt: data.approvedBy ? new Date() : null,
                notes: data.notes || null,
                items: {
                    create: processedItems
                }
            },
            include: {
                vendor: true,
                items: true
            }
        });

        return createdPo;
    });

    if (isEmergencyStockout) {
        logger.warn(`EMERGENCY STOCKOUT PO ISSUED: ${po.poNumber} for Department ${po.department} - Value ${po.totalAmount} GHS`);
    } else {
        logger.info(`Created Purchase Order ${po.poNumber} for Vendor ${vendor.name} - Total: ${po.totalAmount} GHS`);
    }

    return po;
}

/**
 * Retrieves Purchase Orders with optional filters
 */
async function getPurchaseOrders(filters = {}) {
    const where = {};
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.department) where.department = filters.department;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
            { poNumber: { contains: s, mode: "insensitive" } },
            { requisitionedBy: { contains: s, mode: "insensitive" } },
            { vendor: { name: { contains: s, mode: "insensitive" } } }
        ];
    }

    return prisma.purchaseOrder.findMany({
        where,
        include: {
            vendor: true,
            items: true,
            goodsReceipts: {
                select: {
                    id: true,
                    grnNumber: true,
                    status: true,
                    threeWayMatchVerified: true,
                    receivedAt: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Retrieves a single Purchase Order by ID
 */
async function getPurchaseOrderById(id) {
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
            vendor: true,
            items: true,
            goodsReceipts: {
                include: { items: true },
                orderBy: { createdAt: "desc" }
            }
        }
    });

    if (!po) {
        throw new AppError("Purchase Order not found.", 404);
    }
    return po;
}

/**
 * Updates status of a Purchase Order (e.g. approve, issue, cancel)
 */
async function updatePurchaseOrderStatus(id, { status, approvedBy, notes }) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
        throw new AppError("Purchase Order not found.", 404);
    }

    const dataToUpdate = { status };
    if (notes) dataToUpdate.notes = notes;

    if (status === "APPROVED") {
        if (!approvedBy && !po.approvedBy) {
            throw new AppError("Approving officer name is required to approve Purchase Order.", 400);
        }
        dataToUpdate.approvedBy = approvedBy || po.approvedBy;
        dataToUpdate.approvedAt = new Date();
    }

    const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: dataToUpdate,
        include: { vendor: true, items: true }
    });

    logger.info(`Updated PO ${updated.poNumber} status to ${status}`);
    return updated;
}

/**
 * Creates Goods Receipt Note (GRN) upon physical delivery of goods
 * Transitions PO to PARTIALLY_RECEIVED or FULLY_RECEIVED
 */
async function createGoodsReceiptNote(data) {
    if (!data.purchaseOrderId || !data.receivedBy || !data.waybillOrInvoiceNumber || !Array.isArray(data.items) || data.items.length === 0) {
        throw new AppError("purchaseOrderId, receivedBy, waybillOrInvoiceNumber, and items array are required.", 400);
    }

    const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true, vendor: true }
    });

    if (!po) {
        throw new AppError("Purchase Order not found.", 404);
    }

    if (!["APPROVED", "ISSUED_TO_VENDOR", "PARTIALLY_RECEIVED"].includes(po.status)) {
        throw new AppError(`Cannot receive goods against PO in '${po.status}' status. PO must be approved or issued.`, 400);
    }

    const grnNumber = await generateGrnNumber();

    const result = await prisma.$transaction(async (tx) => {
        // Create GRN
        const grn = await tx.goodsReceiptNote.create({
            data: {
                grnNumber,
                purchaseOrderId: po.id,
                vendorId: po.vendorId,
                waybillOrInvoiceNumber: data.waybillOrInvoiceNumber.trim(),
                receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
                receivedBy: data.receivedBy.trim(),
                inspectedBy: data.inspectedBy ? data.inspectedBy.trim() : null,
                inspectionStatus: data.inspectionStatus || "INSPECTION_PASSED",
                rejectionReason: data.rejectionReason || null,
                temperatureCompliant: typeof data.temperatureCompliant === "boolean" ? data.temperatureCompliant : true,
                status: data.inspectionStatus === "INSPECTION_PASSED" ? "INSPECTED_ACCEPTED" : "RECEIVED_IN_QUARANTINE",
                notes: data.notes || null
            }
        });

        // Create GRN items & update PO items
        for (const item of data.items) {
            const matchingPoItem = po.items.find(
                pi => pi.itemCode === item.itemCode || pi.id === item.poItemId
            );

            const qtyReceived = Number(item.quantityReceived) || 0;
            const qtyAccepted = typeof item.quantityAccepted === "number" ? Number(item.quantityAccepted) : qtyReceived;
            const qtyRejected = typeof item.quantityRejected === "number" ? Number(item.quantityRejected) : Math.max(0, qtyReceived - qtyAccepted);
            const unitCost = Number(item.unitCost || (matchingPoItem ? matchingPoItem.unitCost : 0));

            await tx.goodsReceiptItem.create({
                data: {
                    grnId: grn.id,
                    poItemId: matchingPoItem ? matchingPoItem.id : null,
                    itemCode: item.itemCode.trim(),
                    description: item.description ? item.description.trim() : (matchingPoItem ? matchingPoItem.description : "Item"),
                    quantityReceived: qtyReceived,
                    quantityAccepted: qtyAccepted,
                    quantityRejected: qtyRejected,
                    batchNumber: item.batchNumber ? item.batchNumber.trim() : null,
                    expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                    unitCost,
                    destinationDepartment: item.destinationDepartment || po.department || "CENTRAL_STORES"
                }
            });

            // Increment quantity received on matching PO item
            if (matchingPoItem) {
                await tx.purchaseOrderItem.update({
                    where: { id: matchingPoItem.id },
                    data: {
                        quantityReceived: {
                            increment: qtyAccepted
                        }
                    }
                });
            }
        }

        // Fetch refreshed PO items to compute new overall PO status
        const refreshedPoItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: po.id }
        });

        const allItemsFullyReceived = refreshedPoItems.every(
            pi => pi.quantityReceived >= pi.quantityOrdered
        );

        const newPoStatus = allItemsFullyReceived ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED";

        await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { status: newPoStatus }
        });

        return tx.goodsReceiptNote.findUnique({
            where: { id: grn.id },
            include: {
                purchaseOrder: { include: { items: true } },
                vendor: true,
                items: true
            }
        });
    });

    logger.info(`Recorded Goods Receipt Note ${result.grnNumber} against PO ${po.poNumber} (${result.status})`);
    return result;
}

/**
 * Retrieves Goods Receipt Notes
 */
async function getGoodsReceiptNotes(filters = {}) {
    const where = {};
    if (filters.purchaseOrderId) where.purchaseOrderId = filters.purchaseOrderId;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.status) where.status = filters.status;
    if (filters.inspectionStatus) where.inspectionStatus = filters.inspectionStatus;

    return prisma.goodsReceiptNote.findMany({
        where,
        include: {
            purchaseOrder: true,
            vendor: true,
            items: true
        },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Retrieves a single GRN by ID
 */
async function getGoodsReceiptNoteById(id) {
    const grn = await prisma.goodsReceiptNote.findUnique({
        where: { id },
        include: {
            purchaseOrder: { include: { items: true } },
            vendor: true,
            items: true
        }
    });

    if (!grn) {
        throw new AppError("Goods Receipt Note not found.", 404);
    }
    return grn;
}

/**
 * Three-Way Matching Verification (PO vs GRN vs Vendor Invoice)
 */
async function verifyThreeWayMatch(grnId, { invoiceAmount, notes }) {
    if (invoiceAmount === undefined || invoiceAmount === null) {
        throw new AppError("Supplier invoiceAmount is required for three-way match verification.", 400);
    }

    const grn = await prisma.goodsReceiptNote.findUnique({
        where: { id: grnId },
        include: {
            items: true,
            purchaseOrder: { include: { items: true } }
        }
    });

    if (!grn) {
        throw new AppError("Goods Receipt Note not found.", 404);
    }

    const matchEvaluation = evaluateThreeWayMatch({
        purchaseOrder: grn.purchaseOrder,
        grnItems: grn.items,
        invoiceAmount: Number(invoiceAmount)
    });

    const updatedGrn = await prisma.goodsReceiptNote.update({
        where: { id: grnId },
        data: {
            threeWayMatchVerified: matchEvaluation.isMatch,
            matchedInvoiceAmount: Number(invoiceAmount),
            varianceAmount: matchEvaluation.variance,
            notes: notes || matchEvaluation.notes
        },
        include: {
            purchaseOrder: true,
            vendor: true,
            items: true
        }
    });

    logger.info(`3-Way Match evaluation on GRN ${grn.grnNumber}: Match=${matchEvaluation.isMatch}, Variance=${matchEvaluation.variance} GHS`);

    return {
        grn: updatedGrn,
        matchEvaluation
    };
}

/**
 * Completes QA inspection on GRN
 */
async function completeGrnInspection(grnId, data) {
    const grn = await prisma.goodsReceiptNote.findUnique({ where: { id: grnId } });
    if (!grn) {
        throw new AppError("Goods Receipt Note not found.", 404);
    }

    const inspectionStatus = data.inspectionStatus || "INSPECTION_PASSED";
    const status = inspectionStatus === "INSPECTION_PASSED" ? "INSPECTED_ACCEPTED" : "REJECTED";

    return prisma.goodsReceiptNote.update({
        where: { id: grnId },
        data: {
            inspectedBy: data.inspectedBy ? data.inspectedBy.trim() : grn.inspectedBy,
            inspectionStatus,
            temperatureCompliant: typeof data.temperatureCompliant === "boolean" ? data.temperatureCompliant : grn.temperatureCompliant,
            rejectionReason: data.rejectionReason || null,
            status,
            notes: data.notes || grn.notes
        },
        include: {
            purchaseOrder: true,
            vendor: true,
            items: true
        }
    });
}

module.exports = {
    getProcurementCatalogs,
    getProcurementStats,
    registerVendor,
    getVendors,
    getVendorById,
    updateVendor,
    registerVendorContract,
    getVendorContracts,
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrderStatus,
    createGoodsReceiptNote,
    getGoodsReceiptNotes,
    getGoodsReceiptNoteById,
    verifyThreeWayMatch,
    completeGrnInspection
};
