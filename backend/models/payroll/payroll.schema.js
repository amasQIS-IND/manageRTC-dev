/**
 * Payroll Schema
 *
 * Tracks employee payroll processing, earnings, deductions, and payslip generation
 *
 * @module models/payroll
 */

import mongoose from 'mongoose';

/**
 * Payroll Schema Definition
 */
const payrollSchema = new mongoose.Schema({
  // ====================
  // Primary Keys
  // ====================
  payrollId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique payroll record identifier'
  },
  companyId: {
    type: String,
    required: true,
    index: true,
    description: 'Company/tenant identifier'
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
    description: 'Employee whose payroll is being processed'
  },

  // ====================
  // Pay Period
  // ====================
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true,
    description: 'Month (1-12)'
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2099,
    index: true,
    description: 'Year'
  },
  payPeriod: {
    type: String,
    enum: ['monthly', 'bi-monthly', 'weekly', 'daily'],
    default: 'monthly',
    description: 'Pay period frequency'
  },

  // ====================
  // Earnings (Credit)
  // ====================
  earnings: {
    // Basic salary
    basicSalary: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Basic monthly salary'
    },

    // House Rent Allowance
    hra: {
      type: Number,
      default: 0,
      min: 0,
      description: 'House Rent Allowance'
    },

    // Dearness Allowance
    dearnessAllowance: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Dearness Allowance (inflation adjustment)'
    },

    // Conveyance Allowance
    conveyanceAllowance: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Conveyance/Transport allowance'
    },

    // Medical Allowance
    medicalAllowance: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Medical allowance'
    },

    // Special Allowance
    specialAllowance: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Special/Ad-hoc allowance'
    },

    // Other Allowances
    otherAllowances: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Other miscellaneous allowances'
    },

    // Overtime
    overtime: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Overtime pay'
    },

    // Bonus
    bonus: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Performance/production bonus'
    },

    // Incentives
    incentive: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Sales/performance incentives'
    },

    // Arrears (previous unpaid salary)
    arrears: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Arrears from previous periods'
    },

    // Commission
    commission: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Sales commission'
    }
  },

  // ====================
  // Deductions (Debit)
  // ====================
  deductions: {
    // Professional Tax
    professionalTax: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Professional tax deducted'
    },

    // Income Tax (TDS - Tax Deducted at Source)
    tds: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Income tax (TDS)'
    },

    // Provident Fund (PF)
    providentFund: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Employee Provident Fund contribution'
    },

    // Employee State Insurance (ESI)
    esi: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Employee State Insurance contribution'
    },

    // Loan Deductions
    loanDeduction: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Salary advance/loan repayment'
    },

    // Advance Deductions
    advanceDeduction: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Salary advance repayment'
    },

    // Late Coming Deductions
    lateDeduction: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Penalty for late attendance'
    },

    // Other Deductions
    otherDeductions: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Other miscellaneous deductions'
    }
  },

  // ====================
  // Calculated Totals
  // ====================
  grossSalary: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total earnings before deductions'
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total deductions'
  },
  netSalary: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Take-home pay (gross - deductions)'
  },
  payFrequency: {
    type: String,
    enum: ['monthly', 'bi-weekly', 'weekly', 'daily'],
    default: 'monthly',
    description: 'Payment frequency'
  },
  payRate: {
    type: Number,
    default: 1,
    min: 0,
    max: 12,
    description: 'Payment rate multiplier (1 for monthly, 12 for annual)'
  },

  // ====================
  // Attendance-Based Calculations
  // ====================
  attendanceData: {
    // Days worked in the period
    presentDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
      description: 'Number of days present'
    },
    absentDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
      description: 'Number of days absent'
    },
    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
      description: 'Number of paid leave days taken'
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
      description: 'Number of unpaid leave days taken'
    },
    holidays: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of holidays in the period'
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total overtime hours worked'
    },
    lateDays: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of days late'
    }
  },

  // ====================
  // Status & Workflow
  // ====================
  status: {
    type: String,
    enum: ['Draft', 'Generated', 'Approved', 'Paid', 'Rejected', 'Cancelled'],
    default: 'Draft',
    index: true,
    description: 'Payroll processing status'
  },

  // ====================
  // Payment Information
  // ====================
  paymentDate: {
    type: Date,
    description: 'Date when salary was paid'
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Wire Transfer'],
    default: 'Bank Transfer',
    description: 'Payment method used'
  },
  transactionId: {
    type: String,
    trim: true,
    description: 'Bank transaction reference'
  },
  utr: {
    type: String,
    trim: true,
    description: 'Unique Transaction Reference (UTR) for Indian banks'
  },
  bankName: {
    type: String,
    trim: true,
    description: 'Name of bank where salary was deposited'
  },

  // ====================
  // Approval Workflow
  // ====================
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'HR/Payroll administrator who generated this payroll'
  },
  generatedAt: {
    type: Date,
    description: 'When payroll was generated'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Manager who approved this payroll'
  },
  approvedAt: {
    type: Date,
    description: 'When payroll was approved'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Manager who rejected this payroll'
  },
  rejectedAt: {
    type: Date,
    description: 'When payroll was rejected'
  },
  rejectedReason: {
    type: String,
    trim: true,
    maxlength: 1000,
    description: 'Reason for rejection'
  },

  // ====================
  // Payslip Information
  // ====================
  payslipUrl: {
    type: String,
    description: 'URL to generated payslip PDF'
  },
  payslipGenerated: {
    type: Boolean,
    default: false,
    description: 'Whether payslip PDF has been generated'
  },
  payslipEmailSent: {
    type: Boolean,
    default: false,
    description: 'Whether payslip was emailed to employee'
  },

  // ====================
  // Notes & Comments
  // ====================
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    description: 'Additional notes or comments'
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 2000,
    description: 'Internal admin notes (not visible to employee)'
  },

  // ====================
  // System Fields
  // ====================
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ====================
// COMPOUND INDEXES
// ====================

// CRITICAL: One payroll record per employee per month
payrollSchema.index(
  { companyId: 1, employeeId: 1, month: 1, year: 1 },
  { unique: true }
);

// Query optimization indexes
payrollSchema.index({ companyId: 1, status: 1 });
payrollSchema.index({ companyId: 1, month: 1, year: 1, status: 1 });
payrollSchema.index({ companyId: 1, employeeId: 1, status: 1 });
payrollSchema.index({ companyId: 1, paymentDate: 1 });
payrollSchema.index({ companyId: 1, generatedAt: -1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

/**
 * Full period display
 * @returns {string} Formatted period (e.g., "January 2026")
 */
payrollSchema.virtual('periodDisplay').get(function() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[this.month - 1]} ${this.year}`;
});

/**
 * Can be edited
 * @returns {boolean} True if payroll is in draft or generated state
 */
payrollSchema.virtual('canEdit').get(function() {
  return ['Draft', 'Generated', 'Rejected'].includes(this.status);
});

/**
 * Can be approved
 * @returns {boolean} True if payroll is in generated state
 */
payrollSchema.virtual('canApprove').get(function() {
  return this.status === 'Generated';
});

/**
 * Is paid
 * @returns {boolean}
 */
payrollSchema.virtual('isPaid').get(function() {
  return this.status === 'Paid';
});

/**
 * Net salary per day
 * @returns {number} Net salary divided by working days
 */
payrollSchema.virtual('dailyRate').get(function() {
  if (!this.attendanceData.presentDays || this.attendanceData.presentDays === 0) {
    return 0;
  }
  return this.netSalary / this.attendanceData.presentDays;
});

// ====================
// PRE-SAVE HOOKS
// ====================

/**
 * Auto-calculate totals before saving
 */
payrollSchema.pre('save', function(next) {
  // Calculate total earnings
  this.grossSalary = (
    this.earnings.basicSalary +
    this.earnings.hra +
    this.earnings.dearnessAllowance +
    this.earnings.conveyanceAllowance +
    this.earnings.medicalAllowance +
    this.earnings.specialAllowance +
    this.earnings.otherAllowances +
    this.earnings.overtime +
    this.earnings.bonus +
    this.earnings.incentive +
    this.earnings.arrears +
    this.earnings.commission
  );

  // Calculate total deductions
  this.totalDeductions = (
    this.deductions.professionalTax +
    this.deductions.tds +
    this.deductions.providentFund +
    this.deductions.esi +
    this.deductions.loanDeduction +
    this.deductions.advanceDeduction +
    this.deductions.lateDeduction +
    this.deductions.otherDeductions
  );

  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;

  // Ensure net salary is not negative
  if (this.netSalary < 0) {
    this.netSalary = 0;
  }

  next();
});

// ====================
// STATIC METHODS
// ====================

/**
 * Get payroll for an employee for a specific period
 */
payrollSchema.statics.getEmployeePayroll = async function(employeeId, month, year) {
  return this.findOne({
    employeeId,
    month,
    year
  });
};

/**
 * Get all payroll for a company for a period
 */
payrollSchema.statics.getCompanyPayroll = async function(companyId, month, year) {
  return this.find({
    companyId,
    month,
    year
  })
    .populate('employeeId', 'firstName lastName email employeeId')
    .sort({ createdAt: -1 });
};

/**
 * Get payroll by status
 */
payrollSchema.statics.getByStatus = async function(companyId, status) {
  return this.find({
    companyId,
    status
  })
    .populate('employeeId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

/**
 * Get payroll summary for a period
 */
payrollSchema.statics.getPeriodSummary = async function(companyId, month, year) {
  const pipeline = [
    {
      $match: { companyId, month, year }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalGrossSalary: { $sum: '$grossSalary' },
        totalNetSalary: { $sum: '$netSalary' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalOvertime: { $sum: '$earnings.overtime' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

/**
 * Get pending approvals
 */
payrollSchema.statics.getPendingApprovals = async function(companyId) {
  return this.find({
    companyId,
    status: 'Generated'
  })
    .populate('employeeId', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
};

// ====================
// EXPORT
// ====================

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
