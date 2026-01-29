/**
 * Salary Calculator Service
 *
 * Calculates employee salary including earnings, deductions, and net pay
 * Handles tax calculations, PF, ESI, and other statutory deductions
 *
 * @module services/payroll/salaryCalculator
 */

import Payroll from '../../models/payroll/payroll.schema.js';
import Employee from '../../models/employee/employee.schema.js';
import Attendance from '../../models/attendance/attendance.schema.js';

/**
 * Salary Calculator Class
 */
export class SalaryCalculator {
  /**
   * Calculate gross salary for an employee
   * @param {Object} employee - Employee document
   * @param {Object} options - Calculation options
   * @returns {Object} Calculated earnings breakdown
   */
  calculateGrossSalary(employee, options = {}) {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      includeOvertime = true,
      includeBonus = false
    } = options;

    const earnings = {
      basicSalary: employee.salary?.basic || 0,
      hra: employee.salary?.hra || 0,
      dearnessAllowance: 0,
      conveyanceAllowance: employee.salary?.allowances * 0.1 || 0, // 10% of allowances
      medicalAllowance: employee.salary?.allowances * 0.05 || 0, // 5% of allowances
      specialAllowance: 0,
      otherAllowances: employee.salary?.allowances * 0.85 || 0, // Remaining allowances
      overtime: 0,
      bonus: includeBonus ? this.calculateBonus(employee) : 0,
      incentive: 0,
      arrears: 0,
      commission: 0
    };

    // Add overtime if enabled
    if (includeOvertime) {
      earnings.overtime = this.calculateOvertime(employee, month, year);
    }

    // Calculate total
    earnings.total = Object.values(earnings).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);

    return earnings;
  }

  /**
   * Calculate deductions for an employee
   * @param {Object} employee - Employee document
   * @param {number} grossSalary - Gross salary amount
   * @param {Object} options - Calculation options
   * @returns {Object} Calculated deductions breakdown
   */
  calculateDeductions(employee, grossSalary, options = {}) {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      includeProvidentFund = true,
      includeESI = true,
      includeProfessionalTax = true
    } = options;

    const deductions = {
      professionalTax: includeProfessionalTax ? this.calculateProfessionalTax(employee) : 0,
      tds: this.calculateIncomeTax(employee, grossSalary),
      providentFund: includeProvidentFund ? this.calculateProvidentFund(employee, grossSalary) : 0,
      esi: includeESI ? this.calculateESI(employee, grossSalary) : 0,
      loanDeduction: 0,
      advanceDeduction: 0,
      lateDeduction: 0,
      otherDeductions: 0
    };

    // Calculate total
    deductions.total = Object.values(deductions).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);

    return deductions;
  }

  /**
   * Calculate net salary
   * @param {Object} employee - Employee document
   * @param {Object} options - Calculation options
   * @returns {Object} Complete salary breakdown
   */
  async calculateNetSalary(employee, options = {}) {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      attendanceData = null
    } = options;

    // Get or calculate attendance data
    let attendance = attendanceData;
    if (!attendance) {
      attendance = await this.getAttendanceData(employee._id, month, year);
    }

    // Calculate pro-rated salary based on attendance
    const presentDays = attendance?.presentDays || 0;
    const paidLeaveDays = attendance?.paidLeaveDays || 0;
    const totalWorkingDays = presentDays + paidLeaveDays || 22; // Default to 22 working days

    // Get base salary (monthly)
    const earnings = this.calculateGrossSalary(employee, { month, year });

    // Pro-rate based on attendance (if less than full month)
    const prorationFactor = totalWorkingDays / 22;
    if (prorationFactor < 1) {
      Object.keys(earnings).forEach(key => {
        if (typeof earnings[key] === 'number' && key !== 'arrears' && key !== 'bonus' && key !== 'incentive') {
          earnings[key] = Math.round(earnings[key] * prorationFactor);
        }
      });
    }

    const grossSalary = Object.values(earnings).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

    // Calculate deductions
    const deductions = this.calculateDeductions(employee, grossSalary, { month, year });

    // Add late coming deductions
    if (attendance?.lateDays > 3) {
      deductions.lateDeduction = (attendance.lateDays - 3) * 50; // $50 per late day after 3
    }

    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

    // Calculate net salary
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      earnings,
      deductions,
      grossSalary,
      totalDeductions,
      netSalary,
      attendanceData: attendance,
      payPeriod: {
        month,
        year,
        workingDays: totalWorkingDays
      }
    };
  }

  /**
   * Get attendance data for an employee
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Object} Attendance data
   */
  async getAttendanceData(employeeId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      presentDays: 0,
      absentDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      holidays: 0,
      overtimeHours: 0,
      lateDays: 0,
      totalWorkHours: 0
    };

    attendanceRecords.forEach(record => {
      if (record.status === 'Present') {
        summary.presentDays++;
        summary.totalWorkHours += record.workHours || 0;
        summary.overtimeHours += record.overtimeHours || 0;
        if (record.isLate) summary.lateDays++;
      } else if (record.status === 'Absent') {
        summary.absentDays++;
      } else if (record.status === 'Half Day') {
        summary.presentDays += 0.5;
        summary.absentDays += 0.5;
      } else if (record.status === 'On Leave') {
        summary.paidLeaveDays++;
      }
    });

    return summary;
  }

  /**
   * Calculate overtime pay
   * @param {Object} employee - Employee document
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {number} Overtime amount
   */
  async calculateOvertime(employee, month, year) {
    const attendance = await this.getAttendanceData(employee._id, month, year);
    const overtimeHours = attendance.overtimeHours || 0;

    // Calculate hourly rate from basic salary
    const monthlyBasic = employee.salary?.basic || 0;
    const hourlyRate = monthlyBasic / (22 * 8); // 22 working days, 8 hours per day

    // Overtime is typically paid at 1.5x or 2x the hourly rate
    const overtimeMultiplier = 1.5;

    return Math.round(overtimeHours * hourlyRate * overtimeMultiplier);
  }

  /**
   * calculate bonus
   * @param {Object} employee - Employee document
   * @returns {number} Bonus amount
   */
  calculateBonus(employee) {
    // Default bonus calculation (can be customized based on company policy)
    const monthsOfService = this.getMonthsOfService(employee);
    const basicSalary = employee.salary?.basic || 0;

    // Example: 1 month of basic salary for each year of service
    const yearsOfService = monthsOfService / 12;
    return Math.round(basicSalary * Math.min(yearsOfService, 1)); // Max 1 month bonus
  }

  /**
   * Calculate Provident Fund (PF)
   * PF is 12% of basic salary, capped at certain amount
   * @param {Object} employee - Employee document
   * @param {number} grossSalary - Gross salary
   * @returns {number} PF deduction
   */
  calculateProvidentFund(employee, grossSalary) {
    const basicSalary = employee.salary?.basic || 0;
    const pfRate = 0.12; // 12%

    // PF is calculated on basic salary, not gross
    // Max PF base is typically capped (e.g., at 15,000 INR in India)
    const pfBase = Math.min(basicSalary, 15000);

    return Math.round(pfBase * pfRate);
  }

  /**
   * Calculate Employee State Insurance (ESI)
   * ESI is applicable if gross salary <= 21,000 INR
   * Rate is 0.75% for employees
   * @param {Object} employee - Employee document
   * @param {number} grossSalary - Gross salary
   * @returns {number} ESI deduction
   */
  calculateESI(employee, grossSalary) {
    const esiThreshold = 21000; // INR
    const esiRate = 0.0075; // 0.75% for employees

    // ESI only applicable if gross salary is below threshold
    if (grossSalary <= esiThreshold) {
      return Math.round(grossSalary * esiRate);
    }

    return 0;
  }

  /**
   * Calculate Professional Tax
   * Varies by state in India, typically fixed slabs
   * @param {Object} employee - Employee document
   * @returns {number} Professional tax amount
   */
  calculateProfessionalTax(employee) {
    // Simplified professional tax calculation
    // In reality, this varies by state and salary slab
    const grossSalary = employee.salary?.basic + (employee.salary?.hra || 0) + (employee.salary?.allowances || 0);

    if (grossSalary <= 15000) {
      return 0;
    } else if (grossSalary <= 20000) {
      return 150;
    } else {
      return 200;
    }
  }

  /**
   * Calculate Income Tax (TDS - Tax Deducted at Source)
   * Simplified tax calculation based on Indian tax slabs
   * @param {Object} employee - Employee document
   * @param {number} grossSalary - Annual gross salary
   * @returns {number} Tax amount
   */
  calculateIncomeTax(employee, grossSalary) {
    // This is a simplified calculation
    // In production, use proper tax calculation with all exemptions

    // Convert monthly to annual
    const annualGross = grossSalary * 12;

    // Standard deduction (new tax regime)
    const standardDeduction = 50000;
    const taxableIncome = Math.max(0, annualGross - standardDeduction);

    // New tax regime slabs (FY 2024-25)
    let tax = 0;

    if (taxableIncome <= 300000) {
      tax = 0;
    } else if (taxableIncome <= 700000) {
      tax = (taxableIncome - 300000) * 0.05;
    } else if (taxableIncome <= 1000000) {
      tax = 20000 + (taxableIncome - 700000) * 0.10;
    } else if (taxableIncome <= 1200000) {
      tax = 50000 + (taxableIncome - 1000000) * 0.15;
    } else if (taxableIncome <= 1500000) {
      tax = 80000 + (taxableIncome - 1200000) * 0.20;
    } else {
      tax = 140000 + (taxableIncome - 1500000) * 0.30;
    }

    // Rebate u/s 87A (if taxable income <= 7 lakhs)
    if (taxableIncome <= 700000) {
      tax = Math.max(0, tax - 25000);
    }

    // Health & Education Cess (4%)
    tax = tax * 1.04;

    // Convert to monthly
    return Math.round(tax / 12);
  }

  /**
   * Calculate TDS with HRA exemption
   * @param {Object} employee - Employee document
   * @param {number} grossSalary - Gross salary
   * @param {number} hraReceived - HRA received
   * @param {number} actualRentPaid - Actual rent paid
   * @returns {number} TDS amount
   */
  calculateTDSWithHRA(employee, grossSalary, hraReceived = 0, actualRentPaid = 0) {
    // Calculate HRA exemption
    const basicSalary = employee.salary?.basic || 0;
    const hraExemption = Math.min(
      hraReceived,
      actualRentPaid - (basicSalary * 0.1), // 10% of basic salary
      basicSalary * 0.5 // 50% of basic salary (for metro cities)
    );

    // Taxable income after HRA exemption
    const monthlyTaxableIncome = Math.max(0, grossSalary - Math.max(0, hraExemption));
    const annualTaxable = monthlyTaxableIncome * 12;

    // Standard deduction
    const taxableIncome = Math.max(0, annualTaxable - 50000);

    // Calculate tax (simplified)
    return this.calculateIncomeTax(employee, monthlyTaxableIncome);
  }

  /**
   * Get months of service for an employee
   * @param {Object} employee - Employee document
   * @returns {number} Months of service
   */
  getMonthsOfService(employee) {
    if (!employee.joiningDate) return 0;

    const now = new Date();
    const joinDate = new Date(employee.joiningDate);

    const months = (now.getFullYear() - joinDate.getFullYear()) * 12 +
                   (now.getMonth() - joinDate.getMonth());

    return Math.max(0, months);
  }

  /**
   * Calculate salary for multiple employees
   * @param {Array} employeeIds - Array of employee IDs
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Array} Array of salary calculations
   */
  async calculateBatchSalary(employeeIds, month, year) {
    const results = [];

    for (const employeeId of employeeIds) {
      try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          results.push({
            employeeId,
            error: 'Employee not found',
            success: false
          });
          continue;
        }

        const calculation = await this.calculateNetSalary(employee, { month, year });
        results.push({
          employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          success: true,
          ...calculation
        });
      } catch (error) {
        results.push({
          employeeId,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Generate payroll preview
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payroll preview
   */
  async generatePayrollPreview(employeeId, month, year) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const calculation = await this.calculateNetSalary(employee, { month, year });

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeId,
      department: employee.departmentId,
      designation: employee.designationId,
      month,
      year,
      ...calculation,
      periodDisplay: this.getPeriodDisplay(month, year)
    };
  }

  /**
   * Get formatted period display
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {string} Formatted period
   */
  getPeriodDisplay(month, year) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[month - 1]} ${year}`;
  }
}

// Export singleton instance
export default new SalaryCalculator();

/**
 * Static helper to calculate salary for payroll generation
 * @param {string} employeeId - Employee ID
 * @param {number} month - Month
 * @param {number} year - Year
 * @returns {Object} Salary breakdown
 */
export const calculateEmployeeSalary = async (employeeId, month, year) => {
  const calculator = new SalaryCalculator();
  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new Error('Employee not found');
  }

  return await calculator.calculateNetSalary(employee, { month, year });
};

/**
 * Generate payroll for a company for a specific period
 * @param {string} companyId - Company ID
 * @param {number} month - Month
 * @param {number} year - Year
 * @returns {Array} Generated payroll records
 */
export const generateCompanyPayroll = async (companyId, month, year) => {
  const calculator = new SalaryCalculator();
  const employees = await Employee.find({
    companyId,
    isDeleted: false,
    employmentStatus: { $in: ['Active', 'Probation'] }
  });

  const payrollRecords = [];

  for (const employee of employees) {
    try {
      const calculation = await calculator.calculateNetSalary(employee, { month, year });

      // Create or update payroll record
      const payroll = await Payroll.findOneAndUpdate(
        {
          companyId,
          employeeId: employee._id,
          month,
          year
        },
        {
          companyId,
          employeeId: employee._id,
          payrollId: `PAY-${employee.employeeId}-${month}-${year}`,
          month,
          year,
          earnings: calculation.earnings,
          deductions: calculation.deductions,
          grossSalary: calculation.grossSalary,
          totalDeductions: calculation.totalDeductions,
          netSalary: calculation.netSalary,
          attendanceData: calculation.attendanceData,
          status: 'Generated'
        },
        { upsert: true, new: true }
      );

      payrollRecords.push(payroll);
    } catch (error) {
      console.error(`Error generating payroll for ${employee.employeeId}:`, error);
    }
  }

  return payrollRecords;
};
