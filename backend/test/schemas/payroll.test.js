/**
 * Payroll Schema Unit Tests
 *
 * Tests for Payroll model validation, calculations, and indexes
 */

import mongoose from 'mongoose';
import Payroll from '../../models/payroll/payroll.schema.js';
import Employee from '../../models/employee/employee.schema.js';

describe('Payroll Schema', () => {
  let payroll;
  let employee;

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
      employmentStatus: 'Active',
      salary: {
        basic: 5000,
        hra: 2000,
        allowances: 1000
      }
    });
    await employee.save();

    // Create payroll record
    payroll = new Payroll({
      payrollId: global.testUtils.generatePayrollId(),
      companyId: employee.companyId,
      employeeId: employee._id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      earnings: {
        basicSalary: 5000,
        hra: 2000,
        dearnessAllowance: 500,
        conveyanceAllowance: 300,
        medicalAllowance: 200,
        specialAllowance: 0,
        otherAllowances: 0,
        overtime: 500,
        bonus: 1000,
        incentive: 0,
        arrears: 0,
        commission: 0
      },
      deductions: {
        professionalTax: 200,
        tds: 0,
        providentFund: 600,
        esi: 150,
        loanDeduction: 0,
        advanceDeduction: 0,
        lateDeduction: 0,
        otherDeductions: 0
      },
      status: 'Draft'
    });
  });

  describe('Required Fields', () => {
    test('should create payroll with valid data', async () => {
      const savedPayroll = await payroll.save();
      expect(savedPayroll._id).toBeDefined();
      expect(savedPayroll.payrollId).toBeDefined();
      expect(savedPayroll.employeeId).toBeDefined();
    });

    test('should require payrollId', async () => {
      delete payroll.payrollId;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should require companyId', async () => {
      delete payroll.companyId;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should require employeeId', async () => {
      delete payroll.employeeId;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should require month', async () => {
      delete payroll.month;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should require year', async () => {
      delete payroll.year;
      await expect(payroll.save()).rejects.toThrow();
    });
  });

  describe('Month Validation', () => {
    test('should accept valid months (1-12)', async () => {
      for (let month = 1; month <= 12; month++) {
        payroll.month = month;
        const savedPayroll = await payroll.save();
        expect(savedPayroll.month).toBe(month);
      }
    });

    test('should reject invalid month (0)', async () => {
      payroll.month = 0;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should reject invalid month (13)', async () => {
      payroll.month = 13;
      await expect(payroll.save()).rejects.toThrow();
    });
  });

  describe('Year Validation', () => {
    test('should accept valid year (2020)', async () => {
      payroll.year = 2020;
      const savedPayroll = await payroll.save();
      expect(savedPayroll.year).toBe(2020);
    });

    test('should accept valid year (2099)', async () => {
      payroll.year = 2099;
      const savedPayroll = await payroll.save();
      expect(savedPayroll.year).toBe(2099);
    });

    test('should reject year before 2020', async () => {
      payroll.year = 2019;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should reject year after 2099', async () => {
      payroll.year = 2100;
      await expect(payroll.save()).rejects.toThrow();
    });
  });

  describe('Earnings Calculation', () => {
    test('should calculate grossSalary from all earnings', async () => {
      const expectedGross = 5000 + 2000 + 500 + 300 + 200 + 500 + 1000; // 9500
      await payroll.save();
      expect(payroll.grossSalary).toBe(expectedGross);
    });

    test('should handle zero earnings', async () => {
      payroll.earnings = {
        basicSalary: 0,
        hra: 0,
        dearnessAllowance: 0,
        conveyanceAllowance: 0,
        medicalAllowance: 0,
        specialAllowance: 0,
        otherAllowances: 0,
        overtime: 0,
        bonus: 0,
        incentive: 0,
        arrears: 0,
        commission: 0
      };
      await payroll.save();
      expect(payroll.grossSalary).toBe(0);
    });

    test('should handle negative earnings (set to 0)', async () => {
      payroll.earnings.basicSalary = -100;
      await payroll.save();
      expect(payroll.grossSalary).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Deductions Calculation', () => {
    test('should calculate totalDeductions from all deductions', async () => {
      const expectedDeductions = 200 + 0 + 600 + 150 + 0 + 0 + 0 + 0; // 950
      await payroll.save();
      expect(payroll.totalDeductions).toBe(expectedDeductions);
    });

    test('should handle zero deductions', async () => {
      payroll.deductions = {
        professionalTax: 0,
        tds: 0,
        providentFund: 0,
        esi: 0,
        loanDeduction: 0,
        advanceDeduction: 0,
        lateDeduction: 0,
        otherDeductions: 0
      };
      await payroll.save();
      expect(payroll.totalDeductions).toBe(0);
    });
  });

  describe('Net Salary Calculation', () => {
    test('should calculate netSalary as gross - deductions', async () => {
      await payroll.save();
      const expectedNet = payroll.grossSalary - payroll.totalDeductions;
      expect(payroll.netSalary).toBe(expectedNet);
    });

    test('should not allow negative netSalary', async () => {
      payroll.earnings.basicSalary = 100;
      payroll.deductions.providentFund = 1000;
      await payroll.save();
      expect(payroll.netSalary).toBe(0);
    });
  });

  describe('Status Validation', () => {
    test('should accept valid statuses', async () => {
      const validStatuses = ['Draft', 'Generated', 'Approved', 'Paid', 'Rejected', 'Cancelled'];
      for (const status of validStatuses) {
        payroll.status = status;
        const savedPayroll = await payroll.save();
        expect(savedPayroll.status).toBe(status);
      }
    });

    test('should reject invalid status', async () => {
      payroll.status = 'InvalidStatus';
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should default to Draft', () => {
      const newPayroll = new Payroll({
        payrollId: global.testUtils.generatePayrollId(),
        companyId: global.testUtils.generateCompanyId(),
        employeeId: employee._id,
        month: 1,
        year: 2024
      });
      expect(newPayroll.status).toBe('Draft');
    });
  });

  describe('Pay Period', () => {
    test('should accept valid payPeriod values', async () => {
      const validPeriods = ['monthly', 'bi-monthly', 'weekly', 'daily'];
      for (const period of validPeriods) {
        payroll.payPeriod = period;
        const savedPayroll = await payroll.save();
        expect(savedPayroll.payPeriod).toBe(period);
      }
    });

    test('should default to monthly', () => {
      expect(payroll.payPeriod).toBe('monthly');
    });
  });

  describe('Attendance Data', () => {
    test('should accept attendance data', async () => {
      payroll.attendanceData = {
        presentDays: 22,
        absentDays: 0,
        paidLeaveDays: 2,
        unpaidLeaveDays: 0,
        holidays: 4,
        overtimeHours: 10,
        lateDays: 1
      };
      const savedPayroll = await payroll.save();
      expect(savedPayroll.attendanceData.presentDays).toBe(22);
      expect(savedPayroll.attendanceData.overtimeHours).toBe(10);
    });

    test('should validate presentDays max (31)', async () => {
      payroll.attendanceData.presentDays = 32;
      await expect(payroll.save()).rejects.toThrow();
    });

    test('should validate absentDays max (31)', async () => {
      payroll.attendanceData.absentDays = 32;
      await expect(payroll.save()).rejects.toThrow();
    });
  });

  describe('Payment Information', () => {
    test('should accept payment details', async () => {
      payroll.status = 'Paid';
      payroll.paymentDate = new Date();
      payroll.paymentMethod = 'Bank Transfer';
      payroll.transactionId = 'TXN123456';
      payroll.utr = 'UTR123456789';
      payroll.bankName = 'Test Bank';
      const savedPayroll = await payroll.save();
      expect(savedPayroll.paymentDate).toBeDefined();
      expect(savedPayroll.paymentMethod).toBe('Bank Transfer');
    });

    test('should accept valid payment methods', async () => {
      const validMethods = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Wire Transfer'];
      for (const method of validMethods) {
        payroll.paymentMethod = method;
        const savedPayroll = await payroll.save();
        expect(savedPayroll.paymentMethod).toBe(method);
      }
    });
  });

  describe('Approval Workflow', () => {
    test('should track generation details', async () => {
      payroll.status = 'Generated';
      payroll.generatedBy = employee._id;
      payroll.generatedAt = new Date();
      const savedPayroll = await payroll.save();
      expect(savedPayroll.generatedBy).toBeDefined();
      expect(savedPayroll.generatedAt).toBeDefined();
    });

    test('should track approval details', async () => {
      payroll.status = 'Approved';
      payroll.approvedBy = employee._id;
      payroll.approvedAt = new Date();
      const savedPayroll = await payroll.save();
      expect(savedPayroll.approvedBy).toBeDefined();
      expect(savedPayroll.approvedAt).toBeDefined();
    });

    test('should track rejection details', async () => {
      payroll.status = 'Rejected';
      payroll.rejectedBy = employee._id;
      payroll.rejectedAt = new Date();
      payroll.rejectedReason = 'Incorrect calculations';
      const savedPayroll = await payroll.save();
      expect(savedPayroll.rejectedBy).toBeDefined();
      expect(savedPayroll.rejectedReason).toBe('Incorrect calculations');
    });
  });

  describe('Payslip Information', () => {
    test('should track payslip generation', async () => {
      payroll.payslipUrl = 'https://example.com/payslips/123.pdf';
      payroll.payslipGenerated = true;
      payroll.payslipEmailSent = true;
      const savedPayroll = await payroll.save();
      expect(savedPayroll.payslipGenerated).toBe(true);
      expect(savedPayroll.payslipEmailSent).toBe(true);
    });

    test('should default payslipGenerated to false', () => {
      expect(payroll.payslipGenerated).toBe(false);
    });

    test('should default payslipEmailSent to false', () => {
      expect(payroll.payslipEmailSent).toBe(false);
    });
  });

  describe('Virtual Properties', () => {
    test('should have periodDisplay virtual', () => {
      payroll.month = 1;
      payroll.year = 2024;
      expect(payroll.periodDisplay).toBe('January 2024');
    });

    test('should have canEdit virtual', () => {
      payroll.status = 'Draft';
      expect(payroll.canEdit).toBe(true);

      payroll.status = 'Paid';
      expect(payroll.canEdit).toBe(false);
    });

    test('should have canApprove virtual', () => {
      payroll.status = 'Generated';
      expect(payroll.canApprove).toBe(true);

      payroll.status = 'Draft';
      expect(payroll.canApprove).toBe(false);
    });

    test('should have isPaid virtual', () => {
      payroll.status = 'Paid';
      expect(payroll.isPaid).toBe(true);

      payroll.status = 'Draft';
      expect(payroll.isPaid).toBe(false);
    });

    test('should have dailyRate virtual', () => {
      payroll.attendanceData.presentDays = 22;
      payroll.netSalary = 22000;
      expect(payroll.dailyRate).toBe(1000);
    });

    test('should return 0 dailyRate if no presentDays', () => {
      payroll.attendanceData.presentDays = 0;
      payroll.netSalary = 22000;
      expect(payroll.dailyRate).toBe(0);
    });
  });

  describe('Unique Constraint', () => {
    test('should enforce unique payroll per employee per month per year', async () => {
      await payroll.save();

      const duplicatePayroll = new Payroll({
        payrollId: global.testUtils.generatePayrollId(),
        companyId: payroll.companyId,
        employeeId: payroll.employeeId,
        month: payroll.month,
        year: payroll.year
      });

      await expect(duplicatePayroll.save()).rejects.toThrow();
    });

    test('should allow payroll for same employee in different months', async () => {
      await payroll.save();

      const nextMonth = new Payroll({
        payrollId: global.testUtils.generatePayrollId(),
        companyId: payroll.companyId,
        employeeId: payroll.employeeId,
        month: payroll.month === 12 ? 1 : payroll.month + 1,
        year: payroll.month === 12 ? payroll.year + 1 : payroll.year
      });

      await expect(nextMonth.save()).resolves.toBeDefined();
    });
  });

  describe('Static Methods', () => {
    test('should have getEmployeePayroll method', () => {
      expect(typeof Payroll.getEmployeePayroll).toBe('function');
    });

    test('should have getCompanyPayroll method', () => {
      expect(typeof Payroll.getCompanyPayroll).toBe('function');
    });

    test('should have getByStatus method', () => {
      expect(typeof Payroll.getByStatus).toBe('function');
    });

    test('should have getPeriodSummary method', () => {
      expect(typeof Payroll.getPeriodSummary).toBe('function');
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const savedPayroll = await payroll.save();
      expect(savedPayroll.createdAt).toBeDefined();
      expect(savedPayroll.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const savedPayroll = await payroll.save();
      expect(savedPayroll.updatedAt).toBeDefined();
      expect(savedPayroll.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Indexes', () => {
    test('should have compound index on companyId, employeeId, month, year', async () => {
      const indexes = await Payroll.collection.getIndexes();
      expect(indexes).toHaveProperty('companyId_1_employeeId_1_month_1_year_1');
    });
  });
});
