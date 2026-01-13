import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  employeeId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Employee details (for display)
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  
  employeeImage: {
    type: String,
    trim: true
  },
  
  // Current department
  departmentId: {
    type: String,
    required: true,
    trim: true
  },
  
  departmentName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Designation transition
  designationFrom: {
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  designationTo: {
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Promotion details
  promotionDate: {
    type: Date,
    required: true
  },
  
  promotionType: {
    type: String,
    enum: ['Performance Based', 'Experience Based', 'Qualification Based', 'Special Achievement', 'Regular', 'Other'],
    default: 'Regular'
  },
  
  // Salary change (optional)
  salaryChange: {
    previousSalary: {
      type: Number,
      min: 0
    },
    newSalary: {
      type: Number,
      min: 0
    },
    increment: {
      type: Number,
      min: 0
    },
    incrementPercentage: {
      type: Number,
      min: 0
    }
  },
  
  // Promotion reason/notes
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Audit fields
  createdBy: {
    userId: {
      type: String,
      trim: true
    },
    userName: {
      type: String,
      trim: true
    }
  },
  
  updatedBy: {
    userId: {
      type: String,
      trim: true
    },
    userName: {
      type: String,
      trim: true
    }
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
promotionSchema.index({ companyId: 1, employeeId: 1 });
promotionSchema.index({ companyId: 1, promotionDate: -1 });
promotionSchema.index({ companyId: 1, departmentId: 1 });
promotionSchema.index({ companyId: 1, isDeleted: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
