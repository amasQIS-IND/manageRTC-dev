/**
 * Designation Schema
 *
 * Job title/role management for HRMS
 * Manages employee designations, their levels, and career progression
 *
 * @module models/organization
 */

import mongoose from 'mongoose';

/**
 * Designation Schema Definition
 */
const designationSchema = new mongoose.Schema({
  // ====================
  // Primary Keys
  // ====================
  designationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique designation identifier (e.g., DESG-0001)'
  },
  companyId: {
    type: String,
    required: true,
    index: true,
    description: 'Company/tenant identifier for multi-tenancy'
  },

  // ====================
  // Designation Information
  // ====================
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    description: 'Job title (e.g., Senior Software Engineer, Manager, Director)'
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 20,
    description: 'Designation code/abbreviation (e.g., SSE, MGR, DIR)'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    description: 'Detailed description of the role and responsibilities'
  },

  // ====================
  // Hierarchy & Level
  // ====================
  level: {
    type: String,
    required: true,
    enum: [
      'Entry',
      'Junior',
      'Mid',
      'Senior',
      'Lead',
      'Manager',
      'Senior Manager',
      'Director',
      'VP',
      'C-Level',
      'Executive'
    ],
    index: true,
    description: 'Career level/category'
  },
  levelNumber: {
    type: Number,
    default: 1,
    min: 1,
    max: 12,
    description: 'Numeric level for sorting and comparison (1 = Entry, 12 = CEO)'
  },
  rank: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Rank within the same level for ordering'
  },

  // ====================
  // Department Association
  // ====================
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true,
    description: 'Associated department (null for company-wide roles)'
  },
  isDepartmentSpecific: {
    type: Boolean,
    default: true,
    description: 'Whether this designation is specific to a department'
  },

  // ====================
  // Reporting Structure
  // ====================
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    description: 'Designation that this role reports to (for organizational hierarchy)'
  },
  manages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    description: 'Designations that this role manages'
  }],

  // ====================
  // Compensation Range
  // ====================
  compensationRange: {
    currency: {
      type: String,
      default: 'USD',
      description: 'Currency code'
    },
    min: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Minimum annual compensation'
    },
    max: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Maximum annual compensation'
    },
    median: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Median annual compensation'
    }
  },

  // ====================
  // Requirements & Qualifications
  // ====================
  requirements: {
    minExperience: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Minimum years of experience required'
    },
    maxExperience: {
      type: Number,
      description: 'Maximum years of experience (for level caps)'
    },
    education: [{
      level: {
        type: String,
        enum: ['High School', 'Diploma', 'Bachelor', 'Master', 'PhD', 'None'],
        description: 'Education level'
      },
      field: {
        type: String,
        trim: true,
        description: 'Field of study (e.g., Computer Science, MBA)'
      }
    }],
    skills: [{
      type: String,
      trim: true,
      description: 'Required skills for this role'
    }],
    certifications: [{
      type: String,
      trim: true,
      description: 'Required certifications'
    }]
  },

  // ====================
  // Employee Count
  // ====================
  employeeCount: {
    active: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of active employees with this designation'
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total employees including inactive'
    }
  },

  // ====================
  // Status & Settings
  // ====================
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Deprecated'],
    default: 'Active',
    index: true,
    description: 'Designation status'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Soft delete flag'
  },
  isActive: {
    type: Boolean,
    default: true,
    description: 'Quick active flag for queries'
  },
  isManagement: {
    type: Boolean,
    default: false,
    description: 'Is this a management role with direct reports?'
  },
  isTechnical: {
    type: Boolean,
    default: false,
    description: 'Is this a technical role?'
  },

  // ====================
  // Permissions & Access
  // ====================
  defaultRole: {
    type: String,
    enum: ['Employee', 'Manager', 'Admin', 'HR', 'Finance', 'Lead'],
    default: 'Employee',
    description: 'Default system role for employees with this designation'
  },

  // ====================
  // Metadata
  // ====================
  establishedDate: {
    type: Date,
    description: 'Date designation was created in the organization'
  },
  deprecatedDate: {
    type: Date,
    description: 'Date designation was deprecated (if status is Deprecated)'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    description: 'Additional notes about the designation'
  },

  // ====================
  // System Fields
  // ====================
  createdAt: {
    type: Date,
    default: Date.now,
    description: 'Record creation timestamp'
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'Last update timestamp'
  },
  createdBy: {
    type: String,
    description: 'User who created this record'
  },
  updatedBy: {
    type: String,
    description: 'User who last updated this record'
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Hide sensitive information
      delete ret.compensationRange;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ====================
// COMPOUND INDEXES
// ====================

// Unique designation title per company (or per department if department-specific)
designationSchema.index(
  { companyId: 1, title: 1, departmentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Unique designation code per company
designationSchema.index(
  { companyId: 1, code: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } }
);

// Query optimization indexes
designationSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
designationSchema.index({ companyId: 1, level: 1, levelNumber: 1 });
designationSchema.index({ companyId: 1, departmentId: 1, isDeleted: 1 });
designationSchema.index({ companyId: 1, reportsTo: 1 });
designationSchema.index({ companyId: 1, isManagement: 1 });
designationSchema.index({ companyId: 1, levelNumber: 1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

/**
 * Full designation name with level
 * @returns {string} Formatted name with level
 */
designationSchema.virtual('fullName').get(function() {
  return `${this.level} ${this.title}`;
});

/**
 * Experience range display
 * @returns {string} Formatted experience range
 */
designationSchema.virtual('experienceRange').get(function() {
  const min = this.requirements.minExperience || 0;
  const max = this.requirements.maxExperience;
  if (max) {
    return `${min}-${max} years`;
  }
  return `${min}+ years`;
});

/**
 * Is executive level
 * @returns {boolean}
 */
designationSchema.virtual('isExecutive').get(function() {
  return ['Director', 'VP', 'C-Level', 'Executive'].includes(this.level);
});

/**
 * Is senior level
 * @returns {boolean}
 */
designationSchema.virtual('isSenior').get(function() {
  return ['Senior', 'Lead', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Level', 'Executive'].includes(this.level);
});

// ====================
// PRE-SAVE HOOKS
// ====================

/**
 * Update timestamps and derived fields
 */
designationSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Auto-determine if management role based on level
  if (['Manager', 'Senior Manager', 'Director', 'VP', 'C-Level', 'Executive'].includes(this.level)) {
    this.isManagement = true;
  }

  // Auto-determine default role based on level
  if (['C-Level', 'Executive', 'VP'].includes(this.level)) {
    this.defaultRole = 'Admin';
  } else if (['Manager', 'Senior Manager', 'Director'].includes(this.level)) {
    this.defaultRole = 'Manager';
  } else if (['Lead', 'Senior'].includes(this.level)) {
    this.defaultRole = 'Lead';
  } else {
    this.defaultRole = 'Employee';
  }

  next();
});

// ====================
// INSTANCE METHODS
// ====================

/**
 * Get all employees with this designation
 * @returns {Promise<Array>} Array of employees
 */
designationSchema.methods.getEmployees = async function() {
  const Employee = mongoose.model('Employee');

  return Employee.find({
    companyId: this.companyId,
    designationId: this._id,
    isDeleted: false
  }).populate('departmentId', 'name');
};

/**
 * Update employee count
 * @returns {Promise<Object>} Updated counts
 */
designationSchema.methods.updateEmployeeCount = async function() {
  const Employee = mongoose.model('Employee');

  const activeCount = await Employee.countDocuments({
    companyId: this.companyId,
    designationId: this._id,
    employmentStatus: { $in: ['Active', 'Probation'] },
    isDeleted: false
  });

  const totalCount = await Employee.countDocuments({
    companyId: this.companyId,
    designationId: this._id,
    isDeleted: false
  });

  this.employeeCount.active = activeCount;
  this.employeeCount.total = totalCount;
  await this.save();

  return { active: activeCount, total: totalCount };
};

/**
 * Check if this designation reports to another
 * @param {string} designationId - Designation to check
 * @returns {Promise<boolean>} True if reports to the given designation
 */
designationSchema.methods.reportsToDesignation = async function(designationId) {
  if (!this.reportsTo) return false;
  return this.reportsTo.toString() === designationId;
};

/**
 * Get career path (next level up)
 * @returns {Promise<Object>} Next designation in career path
 */
designationSchema.methods.getCareerPath = async function() {
  if (this.reportsTo) {
    return this.constructor.findById(this.reportsTo);
  }

  // Find next level up by levelNumber
  const nextLevel = await this.constructor.findOne({
    companyId: this.companyId,
    levelNumber: { $gt: this.levelNumber },
    status: 'Active',
    isDeleted: false
  }).sort({ levelNumber: 1 });

  return nextLevel;
};

// ====================
// STATIC METHODS
// ====================

/**
 * Get designations by level
 */
designationSchema.statics.getByLevel = async function(companyId, level) {
  return this.find({
    companyId,
    level,
    isDeleted: false
  }).sort({ levelNumber: 1, title: 1 });
};

/**
 * Get management designations
 */
designationSchema.statics.getManagementRoles = async function(companyId) {
  return this.find({
    companyId,
    isManagement: true,
    status: 'Active',
    isDeleted: false
  }).sort({ levelNumber: 1 });
};

/**
 * Get technical designations
 */
designationSchema.statics.getTechnicalRoles = async function(companyId) {
  return this.find({
    companyId,
    isTechnical: true,
    status: 'Active',
    isDeleted: false
  }).sort({ levelNumber: 1 });
};

/**
 * Get designation by code
 */
designationSchema.statics.getByCode = async function(companyId, code) {
  return this.findOne({
    companyId,
    code: code.toUpperCase(),
    isDeleted: false
  });
};

/**
 * Get designations for a department
 */
designationSchema.statics.getByDepartment = async function(companyId, departmentId) {
  return this.find({
    companyId,
    $or: [
      { departmentId: departmentId },
      { isDepartmentSpecific: false }
    ],
    status: 'Active',
    isDeleted: false
  }).sort({ levelNumber: 1, title: 1 });
};

/**
 * Search designations by title or description
 */
designationSchema.statics.search = async function(companyId, searchTerm) {
  return this.find({
    companyId,
    isDeleted: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ levelNumber: 1, title: 1 });
};

/**
 * Get career progression path
 */
designationSchema.statics.getCareerProgression = async function(companyId, currentDesignationId) {
  const current = await this.findById(currentDesignationId);
  if (!current) return null;

  const path = [current];
  let next = current.reportsTo;

  while (next) {
    const nextDesg = await this.findById(next);
    if (nextDesg) {
      path.push(nextDesg);
      next = nextDesg.reportsTo;
    } else {
      break;
    }
  }

  return path;
};

/**
 * Get designations within experience range
 */
designationSchema.statics.getByExperienceRange = async function(companyId, yearsOfExperience) {
  return this.find({
    companyId,
    'requirements.minExperience': { $lte: yearsOfExperience },
    $or: [
      { 'requirements.maxExperience': { $gte: yearsOfExperience } },
      { 'requirements.maxExperience': { $exists: false } }
    ],
    status: 'Active',
    isDeleted: false
  }).sort({ levelNumber: 1 });
};

/**
 * Get all designations with employee counts
 */
designationSchema.statics.getWithEmployeeCounts = async function(companyId) {
  const designations = await this.find({
    companyId,
    isDeleted: false
  }).sort({ levelNumber: 1, title: 1 });

  const results = await Promise.all(
    designations.map(async (desg) => {
      const Employee = mongoose.model('Employee');
      const activeCount = await Employee.countDocuments({
        companyId: desg.companyId,
        designationId: desg._id,
        employmentStatus: { $in: ['Active', 'Probation'] },
        isDeleted: false
      });

      return {
        ...desg.toObject(),
        activeEmployeeCount: activeCount
      };
    })
  );

  return results;
};

/**
 * Get designation hierarchy tree
 */
designationSchema.statics.getHierarchyTree = async function(companyId) {
  const designations = await this.find({
    companyId,
    isDeleted: false
  }).sort({ levelNumber: 1 });

  const buildTree = (reportsToId = null) => {
    return designations
      .filter(desg => {
        const rid = desg.reportsTo ? desg.reportsTo.toString() : null;
        return rid === reportsToId;
      })
      .map(desg => ({
        ...desg.toObject(),
        reports: buildTree(desg._id.toString())
      }));
  };

  return buildTree();
};

// ====================
// EXPORT
// ====================

const Designation = mongoose.model('Designation', designationSchema);

export default Designation;
