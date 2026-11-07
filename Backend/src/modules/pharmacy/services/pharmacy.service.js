"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
ENTERPRISE PHARMACY & INVENTORY MANAGEMENT SERVICE
Real PostgreSQL Persistence, Batch Tracking, FEFO Dispensing & Telemetry
LOCATION: src/modules/pharmacy/services/pharmacy.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { generateItemCode, generateBatchNumber, generateDispenseNumber } = require("../helpers/pharmacy-id.generator");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Resolve hospital ID from explicit input, tenant, or default active hospital
 * 
 * @param {string} [explicitHospitalId] 
 * @returns {Promise<string>}
 */
async function resolveHospitalId(explicitHospitalId) {
    if (explicitHospitalId) {
        return explicitHospitalId;
    }
    const defaultHospital = await prisma.hospital.findFirst({
        orderBy: { createdAt: "asc" }
    });
    if (!defaultHospital) {
        throw new AppError("No active hospital record found in system", 500, "HOSPITAL_NOT_FOUND");
    }
    return defaultHospital.id;
}

/**
 * Register a new medication item in the Pharmacy catalog
 * 
 * @param {Object} itemData - Item details
 * @param {Object} user - Authenticated user
 */
async function createPharmacyItem(itemData, user) {
    const {
        name,
        genericName,
        brandName,
        dosageForm,
        strength,
        category = "GENERAL",
        unitPrice = 0.0,
        reorderLevel = 10,
        hospitalId: requestedHospitalId
    } = itemData;

    if (!name || typeof name !== "string" || !name.trim()) {
        throw new AppError("Medication name is required", 400, "MISSING_MEDICATION_NAME");
    }

    const hospitalId = await resolveHospitalId(requestedHospitalId);
    const trimmedName = name.trim();

    // Check duplicate item by name in hospital
    const existing = await prisma.pharmacyItem.findFirst({
        where: {
            hospitalId,
            name: { equals: trimmedName, mode: "insensitive" }
        }
    });

    if (existing) {
        throw new AppError(`Medication '${trimmedName}' is already cataloged in this hospital`, 409, "DUPLICATE_PHARMACY_ITEM");
    }

    const itemCode = await generateItemCode();

    const result = await prisma.$transaction(async (tx) => {
        const item = await tx.pharmacyItem.create({
            data: {
                hospitalId,
                itemCode,
                name: trimmedName,
                genericName: genericName ? genericName.trim() : null,
                brandName: brandName ? brandName.trim() : null,
                dosageForm: dosageForm ? dosageForm.trim().toUpperCase() : "TABLET",
                strength: strength ? strength.trim() : null,
                category: category ? category.trim().toUpperCase() : "GENERAL",
                unitPrice: Number(unitPrice) || 0.0,
                reorderLevel: Number(reorderLevel) || 10,
                active: true
            }
        });

        // Initialize inventory balance record
        await tx.pharmacyInventory.create({
            data: {
                hospitalId,
                itemId: item.id,
                quantity: 0,
                availableQuantity: 0,
                reservedQuantity: 0
            }
        });

        return item;
    });

    logger.info({
        message: "Pharmacy item created successfully",
        itemId: result.id,
        itemCode: result.itemCode,
        name: result.name
    });

    return result;
}

/**
 * List pharmacy items with search, category filtering, and inventory stock status
 * 
 * @param {Object} [filterOptions]
 */
async function getPharmacyItems(filterOptions = {}) {
    const {
        search,
        category,
        dosageForm,
        lowStockOnly = false,
        hospitalId: requestedHospitalId,
        limit = 50,
        page = 1
    } = filterOptions;

    const hospitalId = await resolveHospitalId(requestedHospitalId);
    const where = {
        hospitalId,
        active: true
    };

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
            { brandName: { contains: search, mode: "insensitive" } },
            { itemCode: { contains: search, mode: "insensitive" } }
        ];
    }

    if (category) {
        where.category = { equals: category.trim().toUpperCase(), mode: "insensitive" };
    }

    if (dosageForm) {
        where.dosageForm = { equals: dosageForm.trim().toUpperCase(), mode: "insensitive" };
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [items, total] = await Promise.all([
        prisma.pharmacyItem.findMany({
            where,
            include: {
                inventory: true,
                batches: {
                    where: { active: true },
                    orderBy: { expiryDate: "asc" }
                }
            },
            orderBy: { name: "asc" },
            take,
            skip
        }),
        prisma.pharmacyItem.count({ where })
    ]);

    const formatted = items.map(item => {
        const inv = item.inventory[0] || { quantity: 0, availableQuantity: 0, reservedQuantity: 0 };
        const isLowStock = inv.availableQuantity <= item.reorderLevel;
        const isOutOfStock = inv.availableQuantity === 0;

        return {
            id: item.id,
            itemCode: item.itemCode,
            name: item.name,
            genericName: item.genericName,
            brandName: item.brandName,
            dosageForm: item.dosageForm,
            strength: item.strength,
            category: item.category,
            unitPrice: item.unitPrice,
            reorderLevel: item.reorderLevel,
            stock: {
                totalQuantity: inv.quantity,
                availableQuantity: inv.availableQuantity,
                reservedQuantity: inv.reservedQuantity,
                isLowStock,
                isOutOfStock
            },
            activeBatchesCount: item.batches.length,
            createdAt: item.createdAt
        };
    });

    const finalItems = lowStockOnly === true || lowStockOnly === "true"
        ? formatted.filter(i => i.stock.isLowStock)
        : formatted;

    return {
        total,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
        items: finalItems
    };
}

/**
 * Get detailed pharmacy item profile with batch breakdown and recent stock movements
 * 
 * @param {string} itemId
 */
async function getPharmacyItemById(itemId) {
    if (!itemId) {
        throw new AppError("Item ID is required", 400, "MISSING_ITEM_ID");
    }

    const item = await prisma.pharmacyItem.findUnique({
        where: { id: itemId },
        include: {
            inventory: true,
            batches: {
                orderBy: { expiryDate: "asc" }
            },
            stockMovements: {
                orderBy: { createdAt: "desc" },
                take: 20
            }
        }
    });

    if (!item) {
        throw new AppError("Pharmacy item not found", 404, "ITEM_NOT_FOUND");
    }

    const inv = item.inventory[0] || { quantity: 0, availableQuantity: 0, reservedQuantity: 0 };

    return {
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        genericName: item.genericName,
        brandName: item.brandName,
        dosageForm: item.dosageForm,
        strength: item.strength,
        category: item.category,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        active: item.active,
        inventory: {
            totalQuantity: inv.quantity,
            availableQuantity: inv.availableQuantity,
            reservedQuantity: inv.reservedQuantity,
            isLowStock: inv.availableQuantity <= item.reorderLevel,
            isOutOfStock: inv.availableQuantity === 0
        },
        batches: item.batches.map(b => ({
            id: b.id,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            initialQuantity: b.quantity,
            remainingQuantity: b.remainingQuantity !== null ? b.remainingQuantity : b.quantity,
            unitCost: b.unitCost,
            supplier: b.supplier,
            active: b.active,
            isExpired: new Date(b.expiryDate) < new Date()
        })),
        recentMovements: item.stockMovements.map(m => ({
            id: m.id,
            movementType: m.movementType,
            quantity: m.quantity,
            batchNumber: m.batchNumber,
            balanceAfter: m.balanceAfter,
            referenceId: m.referenceId,
            performedByName: m.performedByName,
            notes: m.notes,
            timestamp: m.createdAt
        }))
    };
}

/**
 * Receive batch delivery / purchase receipt into pharmacy stock
 * 
 * @param {Object} batchData
 * @param {Object} user
 */
async function receiveBatchStock(batchData, user) {
    const {
        itemId,
        quantity,
        expiryDate,
        batchNumber: customBatchNumber,
        unitCost = 0.0,
        supplier,
        notes,
        purchaseDate
    } = batchData;

    if (!itemId) {
        throw new AppError("Medication item ID is required", 400, "MISSING_ITEM_ID");
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new AppError("Batch quantity must be a positive integer", 400, "INVALID_BATCH_QUANTITY");
    }

    if (!expiryDate) {
        throw new AppError("Batch expiry date is required", 400, "MISSING_EXPIRY_DATE");
    }

    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
        throw new AppError("Invalid expiry date format", 400, "INVALID_EXPIRY_DATE");
    }

    const item = await prisma.pharmacyItem.findUnique({
        where: { id: itemId },
        include: { inventory: true }
    });

    if (!item) {
        throw new AppError("Pharmacy item not found", 404, "ITEM_NOT_FOUND");
    }

    const hospitalId = item.hospitalId;
    const batchNumber = customBatchNumber && customBatchNumber.trim()
        ? customBatchNumber.trim().toUpperCase()
        : await generateBatchNumber();

    const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Pharmacy Staff";

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create or update batch
        const batch = await tx.pharmacyBatch.create({
            data: {
                hospitalId,
                itemId: item.id,
                batchNumber,
                expiryDate: parsedExpiry,
                quantity: qty,
                remainingQuantity: qty,
                unitCost: Number(unitCost) || 0.0,
                supplier: supplier ? supplier.trim() : null,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
                active: true
            }
        });

        // 2. Update Inventory balance
        const currentInv = item.inventory[0];
        let updatedInv;
        if (currentInv) {
            updatedInv = await tx.pharmacyInventory.update({
                where: { id: currentInv.id },
                data: {
                    quantity: { increment: qty },
                    availableQuantity: { increment: qty }
                }
            });
        } else {
            updatedInv = await tx.pharmacyInventory.create({
                data: {
                    hospitalId,
                    itemId: item.id,
                    quantity: qty,
                    availableQuantity: qty,
                    reservedQuantity: 0
                }
            });
        }

        // 3. Create Stock Movement Audit Log
        const movement = await tx.pharmacyStockMovement.create({
            data: {
                hospitalId,
                itemId: item.id,
                movementType: "PURCHASE_RECEIPT",
                quantity: qty,
                batchNumber,
                balanceAfter: updatedInv.quantity,
                referenceId: batchNumber,
                performedByName: userName,
                notes: notes || `Goods receipt: ${qty} units of ${item.name} (Batch: ${batchNumber})`
            }
        });

        return {
            batch,
            updatedInventory: updatedInv,
            movement
        };
    });

    logger.info({
        message: "Batch stock received successfully",
        itemId: item.id,
        batchNumber: result.batch.batchNumber,
        quantity: qty
    });

    return {
        batch: {
            id: result.batch.id,
            batchNumber: result.batch.batchNumber,
            itemId: item.id,
            itemName: item.name,
            quantity: result.batch.quantity,
            remainingQuantity: result.batch.remainingQuantity,
            expiryDate: result.batch.expiryDate,
            supplier: result.batch.supplier
        },
        inventory: {
            totalQuantity: result.updatedInventory.quantity,
            availableQuantity: result.updatedInventory.availableQuantity
        }
    };
}

/**
 * Adjust pharmacy inventory quantity (e.g. manual count discrepancy, damaged or expired stock disposal)
 * 
 * @param {Object} adjustmentData
 * @param {Object} user
 */
async function adjustStock(adjustmentData, user) {
    const {
        itemId,
        adjustmentType, // "ADD", "SUBTRACT", "EXPIRED_DISCARD", "DAMAGED"
        quantity,
        batchNumber,
        reason
    } = adjustmentData;

    if (!itemId) {
        throw new AppError("Item ID is required", 400, "MISSING_ITEM_ID");
    }

    const qty = Math.abs(Number(quantity));
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new AppError("Adjustment quantity must be a positive integer", 400, "INVALID_QUANTITY");
    }

    if (!reason || !reason.trim()) {
        throw new AppError("Reason for adjustment is mandatory for audit compliance", 400, "MISSING_ADJUSTMENT_REASON");
    }

    const item = await prisma.pharmacyItem.findUnique({
        where: { id: itemId },
        include: { inventory: true, batches: true }
    });

    if (!item) {
        throw new AppError("Pharmacy item not found", 404, "ITEM_NOT_FOUND");
    }

    const inv = item.inventory[0];
    const currentQty = inv ? inv.availableQuantity : 0;
    const isDeduction = adjustmentType !== "ADD";

    if (isDeduction && currentQty < qty) {
        throw new AppError(`Cannot subtract ${qty} units. Current available stock is only ${currentQty}.`, 400, "INSUFFICIENT_STOCK_TO_ADJUST");
    }

    const movementType = adjustmentType === "ADD" ? "ADJUSTMENT_ADD"
        : adjustmentType === "EXPIRED_DISCARD" ? "EXPIRED_DISCARD"
            : adjustmentType === "DAMAGED" ? "DAMAGED_WRITE_OFF"
                : "ADJUSTMENT_SUBTRACT";

    const changeDelta = isDeduction ? -qty : qty;
    const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Authorized Auditor";

    const result = await prisma.$transaction(async (tx) => {
        // Adjust batch remaining quantity if batch specified
        if (batchNumber) {
            const batch = await tx.pharmacyBatch.findFirst({
                where: { itemId, batchNumber: batchNumber.trim().toUpperCase() }
            });
            if (batch) {
                const currentBatchRem = batch.remainingQuantity !== null ? batch.remainingQuantity : batch.quantity;
                const newBatchRem = Math.max(0, currentBatchRem + changeDelta);
                await tx.pharmacyBatch.update({
                    where: { id: batch.id },
                    data: { remainingQuantity: newBatchRem }
                });
            }
        }

        const updatedInv = await tx.pharmacyInventory.update({
            where: { id: inv.id },
            data: {
                quantity: { increment: changeDelta },
                availableQuantity: { increment: changeDelta }
            }
        });

        const movement = await tx.pharmacyStockMovement.create({
            data: {
                hospitalId: item.hospitalId,
                itemId: item.id,
                movementType,
                quantity: changeDelta,
                batchNumber: batchNumber ? batchNumber.trim().toUpperCase() : null,
                balanceAfter: updatedInv.quantity,
                referenceId: `ADJ-${Date.now()}`,
                performedByName: userName,
                notes: reason.trim()
            }
        });

        return { updatedInv, movement };
    });

    return {
        itemId: item.id,
        itemName: item.name,
        adjustmentType: movementType,
        quantityAdjusted: changeDelta,
        balanceAfter: result.updatedInv.quantity,
        reason: reason.trim()
    };
}

/**
 * Get all electronic prescriptions pending dispensing by the pharmacy
 * 
 * @param {Object} [filterOptions]
 */
async function getPendingPrescriptions(filterOptions = {}) {
    const {
        patientId,
        mrn,
        status = "PENDING",
        limit = 50,
        page = 1
    } = filterOptions;

    const where = {};

    if (status) {
        where.status = { equals: status.trim().toUpperCase() };
    }

    if (patientId) {
        where.encounter = { patientId };
    }

    if (mrn) {
        where.encounter = {
            patient: { patientNumber: { contains: mrn.trim(), mode: "insensitive" } }
        };
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [prescriptions, total] = await Promise.all([
        prisma.patientPrescription.findMany({
            where,
            include: {
                encounter: {
                    include: {
                        patient: true
                    }
                },
                dispense: true
            },
            orderBy: { createdAt: "desc" },
            take,
            skip
        }),
        prisma.patientPrescription.count({ where })
    ]);

    const items = prescriptions.map(rx => {
        const patient = rx.encounter?.patient;
        return {
            prescriptionId: rx.id,
            encounterId: rx.encounterId,
            medicationName: rx.medicationName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
            status: rx.status,
            prescribedAt: rx.createdAt,
            patient: patient ? {
                id: patient.id,
                mrn: patient.patientNumber,
                patientNumber: patient.patientNumber,
                name: `${patient.firstName} ${patient.lastName}`,
                gender: patient.gender,
                dateOfBirth: patient.dateOfBirth,
                phone: patient.phone
            } : null,
            dispenseInfo: rx.dispense ? {
                dispenseNumber: rx.dispense.dispenseNumber,
                dispensedAt: rx.dispense.dispensedAt,
                pharmacistName: rx.dispense.pharmacistName,
                status: rx.dispense.status
            } : null
        };
    });

    return {
        total,
        page: Number(page) || 1,
        limit: take,
        items
    };
}

/**
 * Execute prescription dispensing with FEFO batch deduction, stock decrement, and audit trail
 * 
 * @param {string} prescriptionId
 * @param {Object} dispenseData
 * @param {Object} pharmacistUser
 */
async function dispensePrescription(prescriptionId, dispenseData = {}, pharmacistUser) {
    if (!prescriptionId) {
        throw new AppError("Prescription ID is required", 400, "MISSING_PRESCRIPTION_ID");
    }

    const prescription = await prisma.patientPrescription.findUnique({
        where: { id: prescriptionId },
        include: {
            encounter: {
                include: { patient: true }
            },
            dispense: true
        }
    });

    if (!prescription) {
        throw new AppError("Prescription not found", 404, "PRESCRIPTION_NOT_FOUND");
    }

    if (prescription.status === "DISPENSED" && prescription.dispense) {
        throw new AppError(`Prescription has already been dispensed under Dispense Number: ${prescription.dispense.dispenseNumber}`, 409, "PRESCRIPTION_ALREADY_DISPENSED");
    }

    const {
        itemId: explicitItemId,
        quantityToDispense,
        counselingNotes,
        paymentStatus = "PAID",
        instructions
    } = dispenseData;

    const patient = prescription.encounter?.patient;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
    const hospitalId = await resolveHospitalId();

    // 1. Resolve matching PharmacyItem
    let item;
    if (explicitItemId) {
        item = await prisma.pharmacyItem.findUnique({
            where: { id: explicitItemId },
            include: { inventory: true }
        });
    } else {
        // Find by name in catalog
        item = await prisma.pharmacyItem.findFirst({
            where: {
                hospitalId,
                name: { equals: prescription.medicationName.trim(), mode: "insensitive" }
            },
            include: { inventory: true }
        });
    }

    if (!item) {
        throw new AppError(
            `Medication '${prescription.medicationName}' is not in the hospital pharmacy inventory catalog. Please catalog it before dispensing.`,
            404,
            "MEDICATION_NOT_IN_FORMULARY"
        );
    }

    // Determine quantity to dispense (default: requested or 10 units)
    let qtyNeeded = Number(quantityToDispense);
    if (!qtyNeeded || qtyNeeded <= 0) {
        qtyNeeded = 10; // Standard clinical prescription cycle if unspecified
    }

    const inv = item.inventory[0];
    const availableTotal = inv ? inv.availableQuantity : 0;

    if (availableTotal < qtyNeeded) {
        throw new AppError(
            `Insufficient stock to dispense '${item.name}'. Available: ${availableTotal}, Requested: ${qtyNeeded}.`,
            409,
            "INSUFFICIENT_STOCK"
        );
    }

    // 2. Query active batches ordered by FEFO (First Expired, First Out)
    const activeBatches = await prisma.pharmacyBatch.findMany({
        where: {
            itemId: item.id,
            active: true
        },
        orderBy: { expiryDate: "asc" }
    });

    // Verify FEFO batch coverage
    let allocatedQty = 0;
    const batchAllocations = [];
    let remainingToAllocate = qtyNeeded;

    for (const batch of activeBatches) {
        const batchRem = batch.remainingQuantity !== null ? batch.remainingQuantity : batch.quantity;
        if (batchRem <= 0) continue;

        const deduct = Math.min(batchRem, remainingToAllocate);
        batchAllocations.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: deduct,
            newRemaining: batchRem - deduct
        });

        allocatedQty += deduct;
        remainingToAllocate -= deduct;

        if (remainingToAllocate === 0) break;
    }

    if (allocatedQty < qtyNeeded) {
        throw new AppError(
            `Insufficient active unexpired batch stock to dispense ${qtyNeeded} units. Only ${allocatedQty} units available across active batches.`,
            409,
            "INSUFFICIENT_BATCH_STOCK"
        );
    }

    const pharmacistName = pharmacistUser
        ? `${pharmacistUser.firstName || ""} ${pharmacistUser.lastName || ""}`.trim() || pharmacistUser.email
        : "Licensed Pharmacist";
    const pharmacistUserId = pharmacistUser ? pharmacistUser.id : null;
    const dispenseNumber = await generateDispenseNumber();
    const unitPrice = item.unitPrice || 0.0;
    const totalAmount = unitPrice * qtyNeeded;

    // 3. Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
        // A. Update batch quantities
        for (const alloc of batchAllocations) {
            await tx.pharmacyBatch.update({
                where: { id: alloc.batchId },
                data: {
                    remainingQuantity: alloc.newRemaining,
                    active: alloc.newRemaining > 0
                }
            });
        }

        // B. Update Inventory
        const updatedInv = await tx.pharmacyInventory.update({
            where: { id: inv.id },
            data: {
                quantity: { decrement: qtyNeeded },
                availableQuantity: { decrement: qtyNeeded }
            }
        });

        // C. Create PrescriptionDispense
        const dispense = await tx.prescriptionDispense.create({
            data: {
                hospitalId,
                prescriptionId: prescription.id,
                dispenseNumber,
                pharmacistName,
                pharmacistUserId,
                counselingNotes: counselingNotes || `Take ${prescription.dosage || "prescribed dose"} ${prescription.frequency || "daily"} as instructed. Complete entire course.`,
                paymentStatus: paymentStatus.toUpperCase(),
                totalAmount,
                status: "COMPLETED",
                dispensedAt: new Date()
            }
        });

        // D. Create PrescriptionDispenseItem
        const primaryBatchNumber = batchAllocations.map(b => b.batchNumber).join(", ");
        const dispenseItem = await tx.prescriptionDispenseItem.create({
            data: {
                dispenseId: dispense.id,
                itemId: item.id,
                quantityRequested: qtyNeeded,
                quantityDispensed: qtyNeeded,
                instructions: instructions || prescription.instructions || null,
                batchNumber: primaryBatchNumber,
                unitPrice,
                totalPrice: totalAmount
            }
        });

        // E. Create Stock Movement Audit Log
        const movement = await tx.pharmacyStockMovement.create({
            data: {
                hospitalId,
                itemId: item.id,
                movementType: "DISPENSE",
                quantity: -qtyNeeded,
                batchNumber: primaryBatchNumber,
                balanceAfter: updatedInv.quantity,
                referenceId: dispenseNumber,
                performedByName: pharmacistName,
                notes: `Prescription dispensed for ${patientName} (${dispenseNumber})`
            }
        });

        // F. Update Prescription Status
        const updatedPrescription = await tx.patientPrescription.update({
            where: { id: prescription.id },
            data: { status: "DISPENSED" }
        });

        return {
            dispense,
            dispenseItem,
            movement,
            updatedInv,
            updatedPrescription
        };
    });

    logger.info({
        message: "Prescription dispensed successfully",
        dispenseNumber,
        prescriptionId,
        medicationName: item.name,
        quantity: qtyNeeded
    });

    return {
        dispenseNumber: result.dispense.dispenseNumber,
        prescriptionId: prescription.id,
        medication: {
            id: item.id,
            name: item.name,
            itemCode: item.itemCode,
            dosageForm: item.dosageForm
        },
        quantityDispensed: qtyNeeded,
        batchesUsed: batchAllocations.map(b => ({ batchNumber: b.batchNumber, quantity: b.quantity })),
        unitPrice,
        totalAmount,
        paymentStatus: result.dispense.paymentStatus,
        counselingNotes: result.dispense.counselingNotes,
        pharmacistName,
        dispensedAt: result.dispense.dispensedAt,
        prescriptionStatus: result.updatedPrescription.status,
        remainingStock: result.updatedInv.availableQuantity
    };
}

/**
 * Get historical prescription dispenses
 * 
 * @param {Object} [filterOptions]
 */
async function getDispenseHistory(filterOptions = {}) {
    const {
        patientId,
        pharmacistUserId,
        limit = 50,
        page = 1
    } = filterOptions;

    const where = {};

    if (pharmacistUserId) {
        where.pharmacistUserId = pharmacistUserId;
    }

    if (patientId) {
        where.prescription = {
            encounter: { patientId }
        };
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [dispenses, total] = await Promise.all([
        prisma.prescriptionDispense.findMany({
            where,
            include: {
                prescription: {
                    include: {
                        encounter: {
                            include: { patient: true }
                        }
                    }
                },
                items: {
                    include: { item: true }
                }
            },
            orderBy: { dispensedAt: "desc" },
            take,
            skip
        }),
        prisma.prescriptionDispense.count({ where })
    ]);

    const formatted = dispenses.map(d => {
        const patient = d.prescription?.encounter?.patient;
        return {
            dispenseId: d.id,
            dispenseNumber: d.dispenseNumber,
            status: d.status,
            dispensedAt: d.dispensedAt,
            pharmacistName: d.pharmacistName,
            counselingNotes: d.counselingNotes,
            paymentStatus: d.paymentStatus,
            totalAmount: d.totalAmount,
            patient: patient ? {
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
                mrn: patient.patientNumber
            } : null,
            items: d.items.map(it => ({
                itemId: it.itemId,
                medicationName: it.item.name,
                itemCode: it.item.itemCode,
                quantityDispensed: it.quantityDispensed,
                batchNumber: it.batchNumber,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice
            }))
        };
    });

    return {
        total,
        page: Number(page) || 1,
        limit: take,
        dispenses: formatted
    };
}

/**
 * Get expiry alerts: batches expired or near expiry (within 30/60/90 days)
 * 
 * @param {string} [requestedHospitalId]
 * @param {number} [daysThreshold=90]
 */
async function getExpiryAlerts(requestedHospitalId, daysThreshold = 90) {
    const hospitalId = await resolveHospitalId(requestedHospitalId);
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + Number(daysThreshold));

    const batches = await prisma.pharmacyBatch.findMany({
        where: {
            hospitalId,
            active: true,
            expiryDate: { lte: thresholdDate }
        },
        include: { item: true },
        orderBy: { expiryDate: "asc" }
    });

    return batches.map(b => {
        const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let riskLevel;
        if (diffDays <= 0) {
            riskLevel = "EXPIRED";
        } else if (diffDays <= 30) {
            riskLevel = "CRITICAL_30_DAYS";
        } else if (diffDays <= 60) {
            riskLevel = "WARNING_60_DAYS";
        } else {
            riskLevel = "MONITOR_90_DAYS";
        }

        return {
            batchId: b.id,
            batchNumber: b.batchNumber,
            itemId: b.itemId,
            itemName: b.item.name,
            itemCode: b.item.itemCode,
            category: b.item.category,
            remainingQuantity: b.remainingQuantity !== null ? b.remainingQuantity : b.quantity,
            expiryDate: b.expiryDate,
            daysRemaining: diffDays,
            riskLevel
        };
    });
}

/**
 * Get low stock alerts: items where availableQuantity <= reorderLevel
 * 
 * @param {string} [requestedHospitalId]
 */
async function getLowStockAlerts(requestedHospitalId) {
    const hospitalId = await resolveHospitalId(requestedHospitalId);

    const items = await prisma.pharmacyItem.findMany({
        where: { hospitalId, active: true },
        include: { inventory: true },
        orderBy: { name: "asc" }
    });

    const lowStockItems = [];
    for (const it of items) {
        const inv = it.inventory[0] || { quantity: 0, availableQuantity: 0 };
        if (inv.availableQuantity <= it.reorderLevel) {
            lowStockItems.push({
                itemId: it.id,
                itemCode: it.itemCode,
                name: it.name,
                genericName: it.genericName,
                category: it.category,
                availableQuantity: inv.availableQuantity,
                reorderLevel: it.reorderLevel,
                isOutOfStock: inv.availableQuantity === 0,
                deficit: it.reorderLevel - inv.availableQuantity
            });
        }
    }

    return lowStockItems;
}

/**
 * Real-Time Pharmacist Role Dashboard Telemetry from PostgreSQL
 * 
 * @param {string} [requestedHospitalId]
 */
async function getPharmacistDashboardTelemetry(requestedHospitalId) {
    const hospitalId = await resolveHospitalId(requestedHospitalId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalFormularyItems,
        inventories,
        allBatches,
        pendingPrescriptionsCount,
        todayDispenses
    ] = await Promise.all([
        prisma.pharmacyItem.count({ where: { hospitalId, active: true } }),
        prisma.pharmacyInventory.findMany({
            where: { hospitalId },
            include: { item: true }
        }),
        prisma.pharmacyBatch.findMany({
            where: { hospitalId, active: true }
        }),
        prisma.patientPrescription.count({ where: { status: "PENDING" } }),
        prisma.prescriptionDispense.findMany({
            where: {
                hospitalId,
                dispensedAt: { gte: todayStart }
            }
        })
    ]);

    let totalStockUnits = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const inv of inventories) {
        totalStockUnits += inv.quantity;
        const reorder = inv.item?.reorderLevel || 10;
        if (inv.availableQuantity === 0) {
            outOfStockCount++;
        }
        if (inv.availableQuantity <= reorder) {
            lowStockCount++;
        }
    }

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let expiredBatchesCount = 0;
    let nearExpiryBatchesCount = 0;

    for (const b of allBatches) {
        const exp = new Date(b.expiryDate);
        if (exp <= now) {
            expiredBatchesCount++;
        } else if (exp <= thirtyDaysLater) {
            nearExpiryBatchesCount++;
        }
    }

    const dispensedTodayCount = todayDispenses.length;
    const totalDispenseRevenueToday = todayDispenses.reduce((acc, d) => acc + (d.totalAmount || 0), 0);

    return {
        operationalStats: {
            totalFormularyItems,
            totalStockUnits,
            outOfStockCount,
            lowStockCount,
            expiredBatchesCount,
            nearExpiryBatchesCount,
            pendingPrescriptionsCount,
            dispensedTodayCount,
            totalDispenseRevenueToday: Math.round(totalDispenseRevenueToday * 100) / 100
        },
        themeMetadata: {
            role: "PHARMACIST",
            heroImage: "/assets/images/roles/pharmacist_dispensary_hero.jpg",
            icon: "/assets/images/icons/medication_pill_icon.png",
            colorPalette: {
                primary: "#059669",      // Emerald green
                secondary: "#10b981",    // Mint
                accent: "#f59e0b",       // Warning amber
                background: "#f0fdf4"    // Light mint background
            },
            badge: "LICENSED_PHARMACY_PRACTITIONER",
            title: "Hospital Central Dispensary & Pharmaceutical Care"
        },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    resolveHospitalId,
    createPharmacyItem,
    getPharmacyItems,
    getPharmacyItemById,
    receiveBatchStock,
    adjustStock,
    getPendingPrescriptions,
    dispensePrescription,
    getDispenseHistory,
    getExpiryAlerts,
    getLowStockAlerts,
    getPharmacistDashboardTelemetry
};
