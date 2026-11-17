"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
HUMAN RESOURCES & STAFF CREDENTIALING - CONTROLLER
Phase 17 Production Hardened - CommonJS Only
LOCATION: src/modules/hr/hr.controller.js
====================================================
*/

const hrService = require("./hr.service");

class HrController {
    async getCatalogs(req, res, next) {
        try {
            const catalogs = await hrService.getHrCatalogs();
            return res.status(200).json({
                success: true,
                data: catalogs
            });
        } catch (error) {
            next(error);
        }
    }

    async getHrStats(req, res, next) {
        try {
            const stats = await hrService.getHrStats();
            return res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    async registerCredential(req, res, next) {
        try {
            const credential = await hrService.registerStaffCredential(req.body);
            return res.status(201).json({
                success: true,
                message: `Staff credential ${credential.credentialNumber} registered successfully for ${credential.staffName}.`,
                data: credential
            });
        } catch (error) {
            next(error);
        }
    }

    async getCredentials(req, res, next) {
        try {
            const credentials = await hrService.getStaffCredentials(req.query);
            return res.status(200).json({
                success: true,
                count: credentials.length,
                data: credentials
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyCredential(req, res, next) {
        try {
            const credential = await hrService.verifyCredential(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Staff credential ${credential.credentialNumber} verified.`,
                data: credential
            });
        } catch (error) {
            next(error);
        }
    }

    async scheduleShift(req, res, next) {
        try {
            const shift = await hrService.scheduleShift(req.body);
            return res.status(201).json({
                success: true,
                message: `Duty shift ${shift.rosterNumber} scheduled for ${shift.staffName} (${shift.shiftType}).`,
                data: shift
            });
        } catch (error) {
            next(error);
        }
    }

    async getDutyRosters(req, res, next) {
        try {
            const rosters = await hrService.getDutyRosters(req.query);
            return res.status(200).json({
                success: true,
                count: rosters.length,
                data: rosters
            });
        } catch (error) {
            next(error);
        }
    }

    async updateRosterStatus(req, res, next) {
        try {
            const roster = await hrService.updateRosterStatus(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Duty shift ${roster.rosterNumber} status updated to ${roster.status}.`,
                data: roster
            });
        } catch (error) {
            next(error);
        }
    }

    async recordShiftHandover(req, res, next) {
        try {
            const handover = await hrService.recordShiftHandover(req.body);
            return res.status(201).json({
                success: true,
                message: `Clinical SBAR handover ${handover.handoverNumber} recorded.`,
                data: handover
            });
        } catch (error) {
            next(error);
        }
    }

    async coSignShiftHandover(req, res, next) {
        try {
            const handover = await hrService.coSignShiftHandover(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Clinical SBAR handover ${handover.handoverNumber} co-signed by ${handover.incomingStaffName}.`,
                data: handover
            });
        } catch (error) {
            next(error);
        }
    }

    async getShiftHandovers(req, res, next) {
        try {
            const handovers = await hrService.getShiftHandovers(req.query);
            return res.status(200).json({
                success: true,
                count: handovers.length,
                data: handovers
            });
        } catch (error) {
            next(error);
        }
    }

    async clockInStaff(req, res, next) {
        try {
            const attendance = await hrService.clockInStaff(req.body);
            return res.status(201).json({
                success: true,
                message: `Staff ${attendance.staffName} clocked in at ${attendance.clockInTime}.`,
                data: attendance
            });
        } catch (error) {
            next(error);
        }
    }

    async clockOutStaff(req, res, next) {
        try {
            const attendance = await hrService.clockOutStaff(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: `Staff ${attendance.staffName} clocked out at ${attendance.clockOutTime} (Hours worked: ${attendance.hoursWorked}).`,
                data: attendance
            });
        } catch (error) {
            next(error);
        }
    }

    async getStaffAttendance(req, res, next) {
        try {
            const attendance = await hrService.getStaffAttendance(req.query);
            return res.status(200).json({
                success: true,
                count: attendance.length,
                data: attendance
            });
        } catch (error) {
            next(error);
        }
    }

    async requestStaffLeave(req, res, next) {
        try {
            const { rcce } = require("../../core/gbs-rcce.bootstrap");
            const leave = await hrService.requestStaffLeave(req.body);
            try {
                await rcce.events.publish({
                    eventCode: "REQUEST_SUBMITTED",
                    domain: "HR",
                    actorUserId: req.user?.id,
                    actorRole: req.user?.role,
                    affectedRecord: leave.leaveNumber || leave.id,
                    severity: "INFO",
                    requestId: req.requestId,
                    notifications: [
                        {
                            recipientRole: "HR_MANAGER",
                            title: "Staff Leave Application Submitted",
                            message: `Leave request ${leave.leaveNumber} from ${leave.staffName} (${leave.daysRequested} days) awaiting approval.`,
                            severity: "INFO"
                        }
                    ]
                });
            } catch (_pubErr) {}
            return res.rcceSuccess("REQUEST_SUBMITTED", leave, {
                httpStatus: 201,
                message: `Leave request ${leave.leaveNumber} submitted for ${leave.staffName} (${leave.daysRequested} days).`
            });
        } catch (error) {
            next(error);
        }
    }

    async adjudicateLeaveRequest(req, res, next) {
        try {
            const { rcce } = require("../../core/gbs-rcce.bootstrap");
            const leave = await hrService.adjudicateLeaveRequest(req.params.id, req.body);
            const approved = String(leave.status || "").toUpperCase().includes("APPROV");
            try {
                await rcce.events.publish({
                    eventCode: approved ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
                    domain: "HR",
                    actorUserId: req.user?.id,
                    actorRole: req.user?.role,
                    affectedRecord: leave.leaveNumber || leave.id,
                    severity: approved ? "INFO" : "WARNING",
                    requestId: req.requestId,
                    notifications: [
                        {
                            recipientRole: "HR_MANAGER",
                            title: `Leave Request ${leave.status}`,
                            message: `Leave ${leave.leaveNumber} updated to ${leave.status} by ${leave.approvedBy}.`,
                            severity: approved ? "SUCCESS" : "WARNING"
                        }
                    ]
                });
            } catch (_pubErr) {}
            return res.rcceSuccess(approved ? "REQUEST_APPROVED" : "REQUEST_REJECTED", leave, {
                httpStatus: 200,
                message: `Leave request ${leave.leaveNumber} has been ${leave.status} by ${leave.approvedBy}.`
            });
        } catch (error) {
            next(error);
        }
    }

    async getLeaveRequests(req, res, next) {
        try {
            const leaves = await hrService.getLeaveRequests(req.query);
            return res.status(200).json({
                success: true,
                count: leaves.length,
                data: leaves
            });
        } catch (error) {
            next(error);
        }
    }

    async getHrStaff(req, res, next) {
        try {
            const staff = await hrService.getHrStaff(req.query);
            return res.status(200).json({
                success: true,
                count: staff.length,
                data: staff
            });
        } catch (error) {
            next(error);
        }
    }

    async createHrStaff(req, res, next) {
        try {
            const staff = await hrService.createHrStaff(req.body);
            return res.status(201).json({
                success: true,
                message: `Staff member ${staff.firstName} ${staff.lastName} (${staff.employeeCode}) registered.`,
                data: staff
            });
        } catch (error) {
            next(error);
        }
    }

    async getHrTransfers(req, res, next) {
        try {
            const transfers = await hrService.getHrTransfers();
            return res.status(200).json({
                success: true,
                count: transfers.length,
                data: transfers
            });
        } catch (error) {
            next(error);
        }
    }

    async createHrTransfer(req, res, next) {
        try {
            const transfer = await hrService.createHrTransfer(req.body, req.user);
            return res.status(201).json({
                success: true,
                message: `Staff transfer ${transfer.transferNumber} recorded for ${transfer.staffName}.`,
                data: transfer
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new HrController();
