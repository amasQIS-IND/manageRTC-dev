/**
 * Attendance Schema Unit Tests
 *
 * Tests for Attendance model validation, methods, and indexes
 */

import mongoose from 'mongoose';
import Attendance from '../../models/attendance/attendance.schema.js';
import Employee from '../../models/employee/employee.schema.js';

describe('Attendance Schema', () => {
  let attendance;
  let employee;

  beforeEach(async () => {
    // Create a test employee first
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

    // Create attendance record
    attendance = new Attendance({
      attendanceId: global.testUtils.generateAttendanceId(),
      companyId: employee.companyId,
      employeeId: employee._id,
      date: new Date(),
      clockIn: new Date(),
      clockOut: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
      status: 'Present'
    });
  });

  describe('Required Fields', () => {
    test('should create attendance with valid data', async () => {
      const savedAttendance = await attendance.save();
      expect(savedAttendance._id).toBeDefined();
      expect(savedAttendance.attendanceId).toBeDefined();
      expect(savedAttendance.employeeId).toBeDefined();
    });

    test('should require attendanceId', async () => {
      delete attendance.attendanceId;
      await expect(attendance.save()).rejects.toThrow();
    });

    test('should require companyId', async () => {
      delete attendance.companyId;
      await expect(attendance.save()).rejects.toThrow();
    });

    test('should require employeeId', async () => {
      delete attendance.employeeId;
      await expect(attendance.save()).rejects.toThrow();
    });

    test('should require date', async () => {
      delete attendance.date;
      await expect(attendance.save()).rejects.toThrow();
    });
  });

  describe('Work Hours Calculation', () => {
    test('should calculate workHours from clockIn and clockOut', async () => {
      const clockIn = new Date();
      clockIn.setHours(9, 0, 0, 0);
      const clockOut = new Date();
      clockOut.setHours(17, 0, 0, 0);

      attendance.clockIn = clockIn;
      attendance.clockOut = clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(8);
    });

    test('should calculate workHours with decimal precision', async () => {
      const clockIn = new Date();
      clockIn.setHours(9, 0, 0, 0);
      const clockOut = new Date();
      clockOut.setHours(14, 30, 0, 0);

      attendance.clockIn = clockIn;
      attendance.clockOut = clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(5.5);
    });

    test('should not calculate workHours if clockIn only', async () => {
      attendance.clockIn = new Date();
      delete attendance.clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(0);
    });

    test('should not calculate workHours if clockOut only', async () => {
      attendance.clockOut = new Date();
      delete attendance.clockIn;
      await attendance.save();

      expect(attendance.workHours).toBe(0);
    });
  });

  describe('Overtime Hours Calculation', () => {
    test('should calculate overtimeHours for work > 8 hours', async () => {
      const clockIn = new Date();
      clockIn.setHours(9, 0, 0, 0);
      const clockOut = new Date();
      clockOut.setHours(19, 0, 0, 0); // 10 hours

      attendance.clockIn = clockIn;
      attendance.clockOut = clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(10);
      expect(attendance.overtimeHours).toBe(2);
    });

    test('should not calculate overtimeHours for work <= 8 hours', async () => {
      const clockIn = new Date();
      clockIn.setHours(9, 0, 0, 0);
      const clockOut = new Date();
      clockOut.setHours(17, 0, 0, 0); // 8 hours

      attendance.clockIn = clockIn;
      attendance.clockOut = clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(8);
      expect(attendance.overtimeHours).toBe(0);
    });
  });

  describe('Status Validation', () => {
    test('should accept valid statuses', async () => {
      const validStatuses = ['Present', 'Absent', 'Half Day', 'On Leave'];
      for (const status of validStatuses) {
        attendance.status = status;
        const savedAttendance = await attendance.save();
        expect(savedAttendance.status).toBe(status);
      }
    });

    test('should reject invalid status', async () => {
      attendance.status = 'InvalidStatus';
      await expect(attendance.save()).rejects.toThrow();
    });

    test('should default to Absent', () => {
      const newAttendance = new Attendance({
        attendanceId: global.testUtils.generateAttendanceId(),
        companyId: global.testUtils.generateCompanyId(),
        employeeId: employee._id,
        date: new Date()
      });
      expect(newAttendance.status).toBe('Absent');
    });
  });

  describe('Check-in/Check-out Validation', () => {
    test('should allow clockIn without clockOut', async () => {
      delete attendance.clockOut;
      const savedAttendance = await attendance.save();
      expect(savedAttendance.clockIn).toBeDefined();
      expect(savedAttendance.clockOut).toBeUndefined();
    });

    test('should update status to Present when clocking in', async () => {
      attendance.status = 'Absent';
      attendance.clockIn = new Date();
      delete attendance.clockOut;
      await attendance.save();

      expect(attendance.status).toBe('Present');
    });

    test('should calculate duration when clocking out', async () => {
      const clockIn = new Date();
      clockIn.setHours(9, 0, 0, 0);
      attendance.clockIn = clockIn;
      await attendance.save();

      await new Promise(resolve => setTimeout(resolve, 10));

      const clockOut = new Date();
      clockOut.setHours(17, 30, 0, 0);
      attendance.clockOut = clockOut;
      await attendance.save();

      expect(attendance.workHours).toBe(8.5);
    });
  });

  describe('Unique Constraint', () => {
    test('should enforce unique attendance per employee per date', async () => {
      await attendance.save();

      const duplicateAttendance = new Attendance({
        attendanceId: global.testUtils.generateAttendanceId(),
        companyId: attendance.companyId,
        employeeId: attendance.employeeId,
        date: attendance.date, // Same date
        status: 'Present'
      });

      await expect(duplicateAttendance.save()).rejects.toThrow();
    });

    test('should allow multiple attendance records for different dates', async () => {
      await attendance.save();

      const nextDay = new Date(attendance.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const nextAttendance = new Attendance({
        attendanceId: global.testUtils.generateAttendanceId(),
        companyId: attendance.companyId,
        employeeId: attendance.employeeId,
        date: nextDay,
        status: 'Present'
      });

      await expect(nextAttendance.save()).resolves.toBeDefined();
    });
  });

  describe('Soft Delete', () => {
    test('should have isDeleted flag default to false', () => {
      expect(attendance.isDeleted).toBe(false);
    });

    test('should allow setting isDeleted to true', async () => {
      attendance.isDeleted = true;
      const savedAttendance = await attendance.save();
      expect(savedAttendance.isDeleted).toBe(true);
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const savedAttendance = await attendance.save();
      expect(savedAttendance.createdAt).toBeDefined();
      expect(savedAttendance.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const savedAttendance = await attendance.save();
      expect(savedAttendance.updatedAt).toBeDefined();
      expect(savedAttendance.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Virtual Properties', () => {
    test('should have isPresent virtual', () => {
      attendance.status = 'Present';
      expect(attendance.isPresent).toBe(true);

      attendance.status = 'Absent';
      expect(attendance.isPresent).toBe(false);
    });

    test('should have isAbsent virtual', () => {
      attendance.status = 'Absent';
      expect(attendance.isAbsent).toBe(true);

      attendance.status = 'Present';
      expect(attendance.isAbsent).toBe(false);
    });

    test('should have isLate virtual', () => {
      // Create attendance with late clock-in
      const date = new Date();
      date.setHours(10, 0, 0, 0); // 10 AM

      attendance.date = date;
      attendance.clockIn = date;
      expect(attendance.isLate).toBe(true); // Assuming work starts at 9 AM
    });
  });

  describe('Indexes', () => {
    test('should have compound index on companyId, employeeId, and date', async () => {
      const indexes = await Attendance.collection.getIndexes();
      expect(indexes).toHaveProperty('companyId_1_employeeId_1_date_1');
    });
  });
});
