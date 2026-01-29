/**
 * Employee Schema Unit Tests
 *
 * Tests for Employee model validation, methods, and static functions
 */

import mongoose from 'mongoose';
import Employee from '../../models/employee/employee.schema.js';

describe('Employee Schema', () => {
  let employee;

  beforeEach(() => {
    employee = new Employee({
      employeeId: global.testUtils.generateEmployeeId(),
      companyId: global.testUtils.generateCompanyId(),
      clerkUserId: `user_${Date.now()}`,
      firstName: 'John',
      lastName: 'Doe',
      email: global.testUtils.generateEmail(),
      phone: global.testUtils.generatePhone(),
      joiningDate: new Date(),
      employmentStatus: 'Active'
    });
  });

  describe('Required Fields', () => {
    test('should create employee with valid data', async () => {
      const savedEmployee = await employee.save();
      expect(savedEmployee._id).toBeDefined();
      expect(savedEmployee.employeeId).toBeDefined();
      expect(savedEmployee.firstName).toBe('John');
      expect(savedEmployee.lastName).toBe('Doe');
    });

    test('should require employeeId', async () => {
      delete employee.employeeId;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require companyId', async () => {
      delete employee.companyId;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require clerkUserId', async () => {
      delete employee.clerkUserId;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require firstName', async () => {
      delete employee.firstName;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require lastName', async () => {
      delete employee.lastName;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require email', async () => {
      delete employee.email;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should require joiningDate', async () => {
      delete employee.joiningDate;
      await expect(employee.save()).rejects.toThrow();
    });

    test('should validate email format', async () => {
      employee.email = 'invalid-email';
      await expect(employee.save()).rejects.toThrow();
    });

    test('should accept valid email format', async () => {
      employee.email = 'valid.email@example.com';
      const savedEmployee = await employee.save();
      expect(savedEmployee.email).toBe('valid.email@example.com');
    });
  });

  describe('Virtual Properties', () => {
    test('should have fullName virtual', () => {
      expect(employee.fullName).toBe('John Doe');
    });

    test('should calculate age from dateOfBirth', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      employee.dateOfBirth = dob;
      expect(employee.age).toBe(30);
    });

    test('should return null for age if no dateOfBirth', () => {
      expect(employee.age).toBeNull();
    });

    test('should calculate yearsOfService', () => {
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 5);
      employee.joiningDate = joinDate;
      expect(employee.yearsOfService).toBe(5);
    });

    test('should return 0 yearsOfService if no joiningDate', () => {
      employee.joiningDate = null;
      expect(employee.yearsOfService).toBe(0);
    });

    test('should return employmentDuration', () => {
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 2);
      joinDate.setMonth(joinDate.getMonth() - 6);
      employee.joiningDate = joinDate;
      expect(employee.employmentDuration).toContain('years');
    });
  });

  describe('Leave Balance Methods', () => {
    beforeEach(() => {
      employee.leaveBalance = {
        casual: 12,
        sick: 12,
        earned: 15,
        compOff: 5
      };
    });

    test('should get leave balance for specific type', () => {
      expect(employee.getLeaveBalance('casual')).toBe(12);
      expect(employee.getLeaveBalance('sick')).toBe(12);
      expect(employee.getLeaveBalance('earned')).toBe(15);
    });

    test('should return 0 for unknown leave type', () => {
      expect(employee.getLeaveBalance('unknown')).toBe(0);
    });

    test('should update leave balance positively', () => {
      const result = employee.updateLeaveBalance('casual', 3);
      expect(result).toBe(true);
      expect(employee.leaveBalance.casual).toBe(15);
    });

    test('should update leave balance negatively', () => {
      const result = employee.updateLeaveBalance('sick', -2);
      expect(result).toBe(true);
      expect(employee.leaveBalance.sick).toBe(10);
    });

    test('should fail to update unknown leave type', () => {
      const result = employee.updateLeaveBalance('unknown', 5);
      expect(result).toBe(false);
    });
  });

  describe('Employment Status', () => {
    test('should accept valid employment statuses', async () => {
      const validStatuses = ['Active', 'Probation', 'Notice Period', 'Resigned', 'Terminated', 'On Leave'];
      for (const status of validStatuses) {
        employee.employmentStatus = status;
        const savedEmployee = await employee.save();
        expect(savedEmployee.employmentStatus).toBe(status);
      }
    });

    test('should reject invalid employment status', async () => {
      employee.employmentStatus = 'InvalidStatus';
      await expect(employee.save()).rejects.toThrow();
    });
  });

  describe('Employment Type', () => {
    test('should accept valid employment types', async () => {
      const validTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
      for (const type of validTypes) {
        employee.employmentType = type;
        const savedEmployee = await employee.save();
        expect(savedEmployee.employmentType).toBe(type);
      }
    });

    test('should default to Full-time', () => {
      expect(employee.employmentType).toBe('Full-time');
    });
  });

  describe('Soft Delete', () => {
    test('should have isDeleted flag default to false', () => {
      expect(employee.isDeleted).toBe(false);
    });

    test('should allow setting isDeleted to true', async () => {
      employee.isDeleted = true;
      const savedEmployee = await employee.save();
      expect(savedEmployee.isDeleted).toBe(true);
    });
  });

  describe('Indexes', () => {
    test('should have index on employeeId', async () => {
      const indexes = await Employee.collection.getIndexes();
      expect(indexes).toHaveProperty('employeeId_1');
    });

    test('should have index on clerkUserId', async () => {
      const indexes = await Employee.collection.getIndexes();
      expect(indexes).toHaveProperty('clerkUserId_1');
    });

    test('should have index on email', async () => {
      const indexes = await Employee.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    test('should have index on companyId', async () => {
      const indexes = await Employee.collection.getIndexes();
      expect(indexes).toHaveProperty('companyId_1');
    });
  });

  describe('Validation Constraints', () => {
    test('should enforce minLength on firstName', async () => {
      employee.firstName = '';
      await expect(employee.save()).rejects.toThrow();
    });

    test('should enforce maxLength on firstName', async () => {
      employee.firstName = 'A'.repeat(101);
      await expect(employee.save()).rejects.toThrow();
    });

    test('should enforce maxLength on bio', async () => {
      employee.bio = 'A'.repeat(501);
      await expect(employee.save()).rejects.toThrow();
    });

    test('should accept bio within maxLength', async () => {
      employee.bio = 'A'.repeat(500);
      const savedEmployee = await employee.save();
      expect(savedEmployee.bio).toBe('A'.repeat(500));
    });
  });

  describe('Static Methods', () => {
    test('should count employees by department', async () => {
      // This test requires departments to be set up
      // For now, just test that the method exists
      expect(typeof Employee.countByDepartment).toBe('function');
    });

    test('should count employees by status', async () => {
      // This test requires multiple employees to be created
      // For now, just test that the method exists
      expect(typeof Employee.countByStatus).toBe('function');
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const savedEmployee = await employee.save();
      expect(savedEmployee.createdAt).toBeDefined();
      expect(savedEmployee.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const savedEmployee = await employee.save();
      expect(savedEmployee.updatedAt).toBeDefined();
      expect(savedEmployee.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on save', async () => {
      const savedEmployee = await employee.save();
      const originalUpdatedAt = savedEmployee.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10));
      savedEmployee.firstName = 'Jane';
      await savedEmployee.save();
      expect(savedEmployee.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
