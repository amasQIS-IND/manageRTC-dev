/**
 * Leave Type Schema
 *
 * Defines types of leave available in the system
 * (Casual, Sick, Earned, Compensatory Off, etc.)
 *
 * @module models/leave
 */

import mongoose from 'mongoose';

/**
 * Leave Type Schema Definition
 */
const leaveTypeSchema = new mongoose.Schema({
  // ====================
  // Primary Keys
  // ====================
  leaveTypeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique leave type identifier (e.g., LT-CASUAL)'
  },
  companyId: {
    type: String,
    required: true,
    index: true,
    description: 'Company/tenant identifier'
  },

  // ====================
  // Leave Type Details
  // ====================
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
    description: 'Display name (e.g., "Casual Leave", "Sick Leave")'
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
    description: 'Short code for calculations (e.g., CASUAL, SICK, EARNED)'
  },

  // ====================
  // Leave Quota Configuration
  // ====================
  annualQuota: {
    type: Number,
    default: 0,
    min: 0,
    max: 365,
    description: 'Annual quota in days per year'
  },
  isPaid: {
    type: Boolean,
    default: true,
    description: 'Whether this leave type is paid'
  },
  requiresApproval: {
    type: Boolean,
    default: true,
    description: 'Whether this leave type requires manager approval'
  },

  // ====================
  // Carry Forward Configuration
  // ====================
  carryForwardAllowed: {
    type: Boolean,
    default: false,
    description: 'Whether unused quota can be carried forward to next year'
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Maximum days that can be carried forward'
  },
  carryForwardExpiry: {
    type: Number,
    default: 90,
    min: 1,
    description: 'Days after which carried forward leaves expire'
  },

  // ====================
  // Encashment Configuration
  // ====================
  encashmentAllowed: {
    type: Boolean,
    default: false,
    description: 'Whether this leave type can be encashed (converted to cash)'
  },
  maxEncashmentDays: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Maximum days that can be encashed'
  },
  encashmentRatio: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
    description: 'Ratio of encashment (e.g., 0.5 = 50% of salary)'
  },

  // ====================
  // Restriction Configuration
  // ====================
  minNoticeDays: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Minimum notice days required before applying'
  },
  maxConsecutiveDays: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Maximum consecutive days allowed'
  },
  requiresDocument: {
    type: Boolean,
    default: false,
    description: 'Whether documentary proof is required (e.g., medical certificate for sick leave)'
  },
  acceptableDocuments: [{
    type: String,
    trim: true,
    description: 'List of acceptable document types (e.g., "Medical Certificate", "Doctor\'s Note")'
  }],

  // ====================
  // Accrual Rules
  // ====================
  accrualRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 31,
    description: 'Days accrued per month of service'
  },
  accrualMonth: {
    type: Number,
    default: 1,
    min: 1,
    max: 12,
    description: 'Month in which accrual happens (1-12)'
  },
  accrualWaitingPeriod: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Days of service before accrual starts'
  },

  // ====================
  // Display Configuration
  // ====================
  color: {
    type: String,
    default: '#808080',
    description: 'Color code for UI display'
  },
  icon: {
    type: String,
    description: 'Icon name for UI display'
  },
  description: {
    type: String,
    trim: true,
    description: 'Detailed description of this leave type'
  },

  // ====================
  // System Fields
  // ====================
  isActive: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether this leave type is currently active'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Soft delete flag'
  },
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

leaveTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });
leaveTypeSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });

// ====================
// PRE-SAVE HOOKS
// ====================

leaveTypeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ====================
// STATIC METHODS
// ====================

/**
 * Get all active leave types
 */
leaveTypeSchema.statics.getActiveTypes = async function(companyId) {
  return this.find({
    companyId,
    isActive: true,
    isDeleted: false
  }).sort({ name: 1 });
};

/**
 * Get leave type by code
 */
leaveTypeSchema.statics.getByCode = async function(companyId, code) {
  return this.findOne({
    companyId,
    code: code.toUpperCase(),
    isDeleted: false
  });
};

/**
 * Get leave types that don't require approval
 */
leaveTypeSchema.statics.getAutoApprovalTypes = async function(companyId) {
  return this.find({
    companyId,
    requiresApproval: false,
    isActive: true,
    isDeleted: false
  });
};

// ====================
// EXPORT
// ====================

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
