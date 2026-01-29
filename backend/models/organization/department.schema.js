/**
 * Department Schema
 *
 * Organizational department structure for HRMS
 * Manages company departments, their hierarchy, and associated employees
 *
 * @module models/organization
 */

import mongoose from 'mongoose';

/**
 * Department Schema Definition
 */
const departmentSchema = new mongoose.Schema({
  // ====================
  // Primary Keys
  // ====================
  departmentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique department identifier (e.g., DEPT-0001)'
  },
  companyId: {
    type: String,
    required: true,
    index: true,
    description: 'Company/tenant identifier for multi-tenancy'
  },

  // ====================
  // Department Information
  // ====================
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    description: 'Department name (e.g., Engineering, HR, Finance)'
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 20,
    description: 'Department code/abbreviation (e.g., ENG, HR, FIN)'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    description: 'Department description and purpose'
  },

  // ====================
  // Hierarchy & Structure
  // ====================
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    description: 'Parent department for nested departments (e.g., Backend Engineering under Engineering)'
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
    description: 'Hierarchy level (1 = top-level department)'
  },
  path: {
    type: String,
    description: 'Full path string for hierarchy (e.g., /Engineering/Backend/Frontend)'
  },

  // ====================
  // Leadership
  // ====================
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Department head/manager'
  },
  deputyHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Deputy department head'
  },

  // ====================
  // Contact & Location
  // ====================
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: 'Department email address (e.g., engineering@company.com)'
  },
  phone: {
    type: String,
    trim: true,
    description: 'Department contact phone'
  },
  location: {
    building: {
      type: String,
      trim: true
    },
    floor: {
      type: String,
      trim: true
    },
    wing: {
      type: String,
      trim: true
    }
  },

  // ====================
  // Budget & Cost Center
  // ====================
  costCenter: {
    type: String,
    trim: true,
    description: 'Cost center code for finance tracking'
  },
  budget: {
    annual: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Annual budget allocation'
    },
    currency: {
      type: String,
      default: 'USD',
      description: 'Budget currency code'
    }
  },

  // ====================
  // Employee Count Tracking
  // ====================
  employeeCount: {
    active: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of active employees'
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
    enum: ['Active', 'Inactive', 'Dissolved'],
    default: 'Active',
    index: true,
    description: 'Department operational status'
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

  // ====================
  // Metadata
  // ====================
  establishedDate: {
    type: Date,
    description: 'Date department was established'
  },
  dissolvedDate: {
    type: Date,
    description: 'Date department was dissolved (if status is Dissolved)'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    description: 'Additional notes about the department'
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

// Unique department name per company
departmentSchema.index(
  { companyId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Unique department code per company
departmentSchema.index(
  { companyId: 1, code: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } }
);

// Query optimization indexes
departmentSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
departmentSchema.index({ companyId: 1, parentId: 1, isDeleted: 1 });
departmentSchema.index({ companyId: 1, headOfDepartment: 1 });
departmentSchema.index({ companyId: 1, costCenter: 1 });

// Hierarchy queries
departmentSchema.index({ companyId: 1, path: 1 });
departmentSchema.index({ companyId: 1, level: 1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

/**
 * Full department name with hierarchy
 * @returns {string} Formatted name with parent info
 */
departmentSchema.virtual('fullName').get(function() {
  if (this.parentId) {
    return `${this.name} (Sub-department)`;
  }
  return this.name;
});

/**
 * Is top-level department
 * @returns {boolean} True if no parent
 */
departmentSchema.virtual('isTopLevel').get(function() {
  return !this.parentId;
});

/**
 * Has sub-departments
 * @returns {Promise<boolean>} True if has children
 */
departmentSchema.virtual('hasChildren').get(function() {
  // This needs to be populated separately
  return false;
});

// ====================
// PRE-SAVE HOOKS
// ====================

/**
 * Update path before saving
 */
departmentSchema.pre('save', async function(next) {
  // Build hierarchy path
  if (this.parentId) {
    const parent = await this.constructor.findById(this.parentId);
    if (parent) {
      this.path = parent.path ? `${parent.path}/${this._id}` : `/${this._id}`;
      this.level = parent.level + 1;
    }
  } else {
    this.path = `/${this._id}`;
    this.level = 1;
  }

  this.updatedAt = new Date();
  next();
});

/**
 * Update parent reference on deletion
 */
departmentSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  // Update all child departments to remove parent reference
  await this.constructor.updateMany(
    { parentId: this._id },
    { $unset: { parentId: 1 } }
  );
  next();
});

// ====================
// INSTANCE METHODS
// ====================

/**
 * Get all sub-departments
 * @returns {Promise<Array>} Array of child departments
 */
departmentSchema.methods.getSubDepartments = async function() {
  return this.constructor.find({
    companyId: this.companyId,
    parentId: this._id,
    isDeleted: false
  }).sort({ name: 1 });
};

/**
 * Get all employees in this department and sub-departments
 * @returns {Promise<Array>} Array of employees
 */
departmentSchema.methods.getAllEmployees = async function() {
  const Employee = mongoose.model('Employee');

  // Get all department IDs in hierarchy
  const departmentIds = [this._id];
  const children = await this.getSubDepartments();
  for (const child of children) {
    departmentIds.push(child._id);
  }

  return Employee.find({
    companyId: this.companyId,
    departmentId: { $in: departmentIds },
    isDeleted: false
  });
};

/**
 * Update employee count
 * @returns {Promise<Object>} Updated counts
 */
departmentSchema.methods.updateEmployeeCount = async function() {
  const Employee = mongoose.model('Employee');

  const activeCount = await Employee.countDocuments({
    companyId: this.companyId,
    departmentId: this._id,
    employmentStatus: { $in: ['Active', 'Probation'] },
    isDeleted: false
  });

  const totalCount = await Employee.countDocuments({
    companyId: this.companyId,
    departmentId: this._id,
    isDeleted: false
  });

  this.employeeCount.active = activeCount;
  this.employeeCount.total = totalCount;
  await this.save();

  return { active: activeCount, total: totalCount };
};

// ====================
// STATIC METHODS
// ====================

/**
 * Get root departments (no parent)
 */
departmentSchema.statics.getRootDepartments = async function(companyId) {
  return this.find({
    companyId,
    parentId: { $exists: false },
    isDeleted: false
  }).sort({ name: 1 });
};

/**
 * Get department hierarchy tree
 */
departmentSchema.statics.getHierarchyTree = async function(companyId) {
  const departments = await this.find({
    companyId,
    isDeleted: false
  }).sort({ level: 1, name: 1 });

  const buildTree = (parentId = null) => {
    return departments
      .filter(dept => {
        const pid = dept.parentId ? dept.parentId.toString() : null;
        return pid === parentId;
      })
      .map(dept => ({
        ...dept.toObject(),
        children: buildTree(dept._id.toString())
      }));
  };

  return buildTree();
};

/**
 * Get department by code
 */
departmentSchema.statics.getByCode = async function(companyId, code) {
  return this.findOne({
    companyId,
    code: code.toUpperCase(),
    isDeleted: false
  });
};

/**
 * Get departments with employee counts
 */
departmentSchema.statics.getWithEmployeeCounts = async function(companyId) {
  const departments = await this.find({
    companyId,
    isDeleted: false
  }).sort({ name: 1 });

  // Populate employee counts
  const results = await Promise.all(
    departments.map(async (dept) => {
      const Employee = mongoose.model('Employee');
      const activeCount = await Employee.countDocuments({
        companyId: dept.companyId,
        departmentId: dept._id,
        employmentStatus: { $in: ['Active', 'Probation'] },
        isDeleted: false
      });

      return {
        ...dept.toObject(),
        activeEmployeeCount: activeCount
      };
    })
  );

  return results;
};

/**
 * Search departments by name
 */
departmentSchema.statics.search = async function(companyId, searchTerm) {
  return this.find({
    companyId,
    isDeleted: false,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ name: 1 });
};

// ====================
// EXPORT
// ====================

const Department = mongoose.model('Department', departmentSchema);

export default Department;
