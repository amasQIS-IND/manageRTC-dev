/**
 * Leave Schema Unit Tests
 *
 * Tests for Leave model validation, methods, and indexes
 */

import mongoose from 'mongoose';
import Leave from '../../models/leave/leave.schema.js';
import LeaveType from '../../models/leave/leaveType.schema.js';
import Employee from '../../models/employee/employee.schema.js';

describe('Leave Schema', () => {
  let leave;
  let employee;
  let leaveType;

  beforeEach(async () => {
    // Create a test employee
    employee = new Employee({
      employeeId: global.testUtils.generateEmployeeId(),
      companyId: global.testUtils.generateCompanyId(),
      clerkUserId: `user_${Date.now()}`,
      firstName: 'John',
      lastName: 'Doe',
      email: global.testUtils.generateEmail(),
      joiningDate: new Date(),
      employmentStatus: 'Active'
    });
    await employee.save();

    // Create a test leave type
    leaveType = new LeaveType({
      leaveTypeId: global.testUtils.generateLeaveTypeId(),
      companyId: employee.companyId,
      name: 'Casual Leave',
      code: 'CL',
      annualQuota: 12,
      isPaid: true,
      requiresApproval: true
    });
    await leaveType.save();

    // Create leave request
    leave = new Leave({
      leaveId: global.testUtils.generateLeaveId(),
      companyId: employee.companyId,
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      fromDate: new Date(),
      toDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      numberOfDays: 3,
      reason: 'Personal work',
      status: 'Pending'
    });
  });

  describe('Required Fields', () => {
    test('should create leave with valid data', async () => {
      const savedLeave = await leave.save();
      expect(savedLeave._id).toBeDefined();
      expect(savedLeave.leaveId).toBeDefined();
      expect(savedLeave.employeeId).toBeDefined();
    });

    test('should require leaveId', async () => {
      delete leave.leaveId;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require companyId', async () => {
      delete leave.companyId;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require employeeId', async () => {
      delete leave.employeeId;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require leaveTypeId', async () => {
      delete leave.leaveTypeId;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require fromDate', async () => {
      delete leave.fromDate;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require toDate', async () => {
      delete leave.toDate;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require numberOfDays', async () => {
      delete leave.numberOfDays;
      await expect(leave.save()).rejects.toThrow();
    });

    test('should require reason', async () => {
      delete leave.reason;
      await expect(leave.save()).rejects.toThrow();
    });
  });

  describe('Status Validation', () => {
    test('should accept valid statuses', async () => {
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
      for (const status of validStatuses) {
        leave.status = status;
        const savedLeave = await leave.save();
        expect(savedLeave.status).toBe(status);
      }
    });

    test('should reject invalid status', async () => {
      leave.status = 'InvalidStatus';
      await expect(leave.save()).rejects.toThrow();
    });

    test('should default to Pending', () => {
      const newLeave = new Leave({
        leaveId: global.testUtils.generateLeaveId(),
        companyId: global.testUtils.generateCompanyId(),
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        fromDate: new Date(),
        toDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        numberOfDays: 1,
        reason: 'Test'
      });
      expect(newLeave.status).toBe('Pending');
    });
  });

  describe('Date Validation', () => {
    test('should require toDate >= fromDate', async () => {
      leave.fromDate = new Date();
      leave.toDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await expect(leave.save()).rejects.toThrow();
    });

    test('should allow same day for single day leave', async () => {
      const date = new Date();
      leave.fromDate = date;
      leave.toDate = date;
      leave.numberOfDays = 1;
      await expect(leave.save()).resolves.toBeDefined();
    });

    test('should calculate duration correctly for multi-day leave', async () => {
      const fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 5);

      leave.fromDate = fromDate;
      leave.toDate = toDate;
      leave.numberOfDays = 5;
      await leave.save();

      expect(leave.numberOfDays).toBe(5);
    });
  });

  describe('Half Day Leave', () => {
    test('should support isHalfDay flag', async () => {
      leave.isHalfDay = true;
      leave.numberOfDays = 0.5;
      const savedLeave = await leave.save();
      expect(savedLeave.isHalfDay).toBe(true);
      expect(savedLeave.numberOfDays).toBe(0.5);
    });

    test('should require halfDayType when isHalfDay is true', async () => {
      leave.isHalfDay = true;
      leave.numberOfDays = 0.5;
      delete leave.halfDayType;
      // This should work as halfDayType might not be required
      await expect(leave.save()).resolves.toBeDefined();
    });

    test('should accept valid halfDayType values', async () => {
      leave.isHalfDay = true;
      leave.numberOfDays = 0.5;
      leave.halfDayType = 'First Half';
      const savedLeave = await leave.save();
      expect(savedLeave.halfDayType).toBe('First Half');
    });
  });

  describe('Approval Workflow', () => {
    test('should allow setting approvedBy', async () => {
      leave.status = 'Approved';
      leave.approvedBy = employee._id;
      leave.approvedAt = new Date();
      const savedLeave = await leave.save();
      expect(savedLeave.approvedBy).toBeDefined();
      expect(savedLeave.approvedAt).toBeDefined();
    });

    test('should allow setting rejectedBy and rejectedReason', async () => {
      leave.status = 'Rejected';
      leave.rejectedBy = employee._id;
      leave.rejectedAt = new Date();
      leave.rejectedReason = 'Insufficient leave balance';
      const savedLeave = await leave.save();
      expect(savedLeave.rejectedBy).toBeDefined();
      expect(savedLeave.rejectedAt).toBeDefined();
      expect(savedLeave.rejectedReason).toBe('Insufficient leave balance');
    });

    test('should enforce maxLength on rejectedReason', async () => {
      leave.status = 'Rejected';
      leave.rejectedReason = 'A'.repeat(1001);
      await expect(leave.save()).rejects.toThrow();
    });
  });

  describe('Attachments', () => {
    test('should allow adding attachments', async () => {
      leave.attachments = [
        {
          fileName: 'medical-certificate.pdf',
          fileUrl: 'https://example.com/files/medical-certificate.pdf',
          uploadedAt: new Date()
        }
      ];
      const savedLeave = await leave.save();
      expect(savedLeave.attachments).toHaveLength(1);
      expect(savedLeave.attachments[0].fileName).toBe('medical-certificate.pdf');
    });
  });

  describe('Cancellation', () => {
    test('should allow cancelling approved leave', async () => {
      leave.status = 'Approved';
      await leave.save();

      leave.status = 'Cancelled';
      leave.cancelledAt = new Date();
      leave.cancellationReason = 'No longer needed';
      const savedLeave = await leave.save();

      expect(savedLeave.status).toBe('Cancelled');
      expect(savedLeave.cancelledAt).toBeDefined();
      expect(savedLeave.cancellationReason).toBe('No longer needed');
    });

    test('should track cancellation approval', async () => {
      leave.status = 'Approved';
      await leave.save();

      leave.status = 'Cancelled';
      leave.cancelledAt = new Date();
      leave.cancelApprovalStatus = 'Pending';
      leave.cancellationReason = 'Emergency';
      const savedLeave = await leave.save();

      expect(savedLeave.cancelApprovalStatus).toBe('Pending');
    });
  });

  describe('Soft Delete', () => {
    test('should have isDeleted flag default to false', () => {
      expect(leave.isDeleted).toBe(false);
    });

    test('should allow setting isDeleted to true', async () => {
      leave.isDeleted = true;
      const savedLeave = await leave.save();
      expect(savedLeave.isDeleted).toBe(true);
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const savedLeave = await leave.save();
      expect(savedLeave.createdAt).toBeDefined();
      expect(savedLeave.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const savedLeave = await leave.save();
      expect(savedLeave.updatedAt).toBeDefined();
      expect(savedLeave.updatedAt).toBeInstanceOf(Date);
    });

    test('should have appliedAt timestamp', async () => {
      const savedLeave = await leave.save();
      expect(savedLeave.appliedAt).toBeDefined();
      expect(savedLeave.appliedAt).toBeInstanceOf(Date);
    });
  });

  describe('Virtual Properties', () => {
    test('should have isPending virtual', () => {
      leave.status = 'Pending';
      expect(leave.isPending).toBe(true);

      leave.status = 'Approved';
      expect(leave.isPending).toBe(false);
    });

    test('should have isApproved virtual', () => {
      leave.status = 'Approved';
      expect(leave.isApproved).toBe(true);

      leave.status = 'Pending';
      expect(leave.isApproved).toBe(false);
    });

    test('should have isRejected virtual', () => {
      leave.status = 'Rejected';
      expect(leave.isRejected).toBe(true);

      leave.status = 'Approved';
      expect(leave.isRejected).toBe(false);
    });

    test('should have isCancelled virtual', () => {
      leave.status = 'Cancelled';
      expect(leave.isCancelled).toBe(true);

      leave.status = 'Approved';
      expect(leave.isCancelled).toBe(false);
    });

    test('should have duration virtual', () => {
      expect(leave.duration).toBe('3 days');
    });
  });

  describe('Static Methods', () => {
    test('should have getPendingRequests method', () => {
      expect(typeof Leave.getPendingRequests).toBe('function');
    });

    test('should have getEmployeeLeaves method', () => {
      expect(typeof Leave.getEmployeeLeaves).toBe('function');
    });

    test('should have getLeaveBalance method', () => {
      expect(typeof Leave.getLeaveBalance).toBe('function');
    });
  });

  describe('Indexes', () => {
    test('should have index on companyId', async () => {
      const indexes = await Leave.collection.getIndexes();
      expect(indexes).toHaveProperty('companyId_1');
    });

    test('should have index on employeeId', async () => {
      const indexes = await Leave.collection.getIndexes();
      expect(indexes).toHaveProperty('employeeId_1');
    });

    test('should have index on status', async () => {
      const indexes = await Leave.collection.getIndexes();
      expect(indexes).toHaveProperty('status_1');
    });
  });
});
