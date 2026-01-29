/**
 * Payroll Routes
 *
 * Payroll processing, payslip generation, and salary management endpoints
 *
 * @module routes/payroll
 */

import express from 'express';
import Payroll from '../models/payroll/payroll.schema.js';
import Employee from '../models/employee/employee.schema.js';
import { calculateEmployeeSalary, generateCompanyPayroll } from '../services/payroll/salaryCalculator.js';
import payslipGenerator from '../services/payroll/payslipGenerator.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ==================== PAYROLL PROCESSING ====================

/**
 * @route   POST /api/payroll/process
 * @desc    Process payroll for an employee for a specific month/year
 * @access  Private
 */
router.post('/process', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { employeeId, month, year } = req.body;

    // Validate input
    if (!employeeId || !month || !year) {
      return res.status(400).json({
        status: 'error',
        message: 'employeeId, month, and year are required'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        status: 'error',
        message: 'Month must be between 1 and 12'
      });
    }

    if (year < 2020 || year > 2099) {
      return res.status(400).json({
        status: 'error',
        message: 'Year must be between 2020 and 2099'
      });
    }

    // Calculate salary using salaryCalculator service
    const salaryData = await calculateEmployeeSalary(employeeId, month, year);

    // Check if payroll already exists for this employee/month/year
    const existingPayroll = await Payroll.findOne({
      companyId,
      employeeId,
      month,
      year,
      isDeleted: false
    });

    if (existingPayroll) {
      // Update existing payroll
      Object.assign(existingPayroll, salaryData);
      await existingPayroll.save();

      return res.json({
        status: 'success',
        message: 'Payroll updated successfully',
        data: existingPayroll
      });
    }

    // Create new payroll record
    const payroll = new Payroll({
      ...salaryData,
      companyId,
      employeeId,
      month,
      year,
      status: 'Processed'
    });

    await payroll.save();

    res.status(201).json({
      status: 'success',
      message: 'Payroll processed successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process payroll',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payroll
 * @desc    Get all payroll records with filtering
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      employeeId,
      month,
      year,
      status,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = { companyId, isDeleted: false };

    if (employeeId) filter.employeeId = employeeId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter)
        .populate('employeeId', 'firstName lastName employeeId email')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payroll.countDocuments(filter)
    ]);

    res.json({
      status: 'success',
      data: {
        payrolls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payroll records',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payroll/:payrollId
 * @desc    Get a single payroll record by ID
 * @access  Private
 */
router.get('/:payrollId', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { payrollId } = req.params;

    const payroll = await Payroll.findOne({
      _id: payrollId,
      companyId,
      isDeleted: false
    }).populate('employeeId', 'firstName lastName employeeId email departmentId designationId');

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll record not found'
      });
    }

    res.json({
      status: 'success',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payroll record',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/payroll/:payrollId
 * @desc    Update a payroll record
 * @access  Private
 */
router.put('/:payrollId', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { payrollId } = req.params;
    const updates = req.body;

    const payroll = await Payroll.findOne({
      _id: payrollId,
      companyId,
      isDeleted: false
    });

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll record not found'
      });
    }

    // Don't allow updating certain fields
    const protectedFields = ['payrollId', 'companyId', 'employeeId', 'month', 'year'];
    protectedFields.forEach(field => delete updates[field]);

    Object.assign(payroll, updates);
    await payroll.save();

    res.json({
      status: 'success',
      message: 'Payroll updated successfully',
      data: payroll
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update payroll record',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/payroll/:payrollId
 * @desc    Delete (soft delete) a payroll record
 * @access  Private
 */
router.delete('/:payrollId', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { payrollId } = req.params;

    const payroll = await Payroll.findOne({
      _id: payrollId,
      companyId,
      isDeleted: false
    });

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll record not found'
      });
    }

    payroll.isDeleted = true;
    payroll.deletedAt = new Date();
    await payroll.save();

    res.json({
      status: 'success',
      message: 'Payroll deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete payroll record',
      error: error.message
    });
  }
});

// ==================== PAYSLIP GENERATION ====================

/**
 * @route   GET /api/payroll/:payrollId/payslip
 * @desc    Generate payslip PDF for a payroll record
 * @access  Private
 */
router.get('/:payrollId/payslip', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { payrollId } = req.params;

    const payroll = await Payroll.findOne({
      _id: payrollId,
      companyId,
      isDeleted: false
    }).populate('employeeId', 'firstName lastName employeeId email');

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll record not found'
      });
    }

    // Generate PDF payslip using the payslipGenerator
    const employee = await Employee.findById(payroll.employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    const pdfBuffer = await payslipGenerator.generatePayslipPDF(payroll, employee);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${employee.employeeId}-${payroll.month}-${payroll.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate payslip',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payroll/bulk-process
 * @desc    Process payroll for multiple employees
 * @access  Private
 */
router.post('/bulk-process', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { employeeIds, month, year } = req.body;

    // Validate input
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'employeeIds array is required'
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        status: 'error',
        message: 'month and year are required'
      });
    }

    const results = {
      successful: [],
      failed: [],
      total: employeeIds.length
    };

    // Process payroll for each employee
    for (const employeeId of employeeIds) {
      try {
        const salaryData = await calculateSalary(companyId, employeeId, month, year);

        // Check if payroll already exists
        let payroll = await Payroll.findOne({
          companyId,
          employeeId,
          month,
          year,
          isDeleted: false
        });

        if (payroll) {
          Object.assign(payroll, salaryData);
          await payroll.save();
        } else {
          payroll = new Payroll({
            ...salaryData,
            companyId,
            employeeId,
            month,
            year,
            status: 'Processed'
          });
          await payroll.save();
        }

        results.successful.push({
          employeeId,
          payrollId: payroll._id
        });
      } catch (error) {
        results.failed.push({
          employeeId,
          error: error.message
        });
      }
    }

    res.json({
      status: 'success',
      message: `Processed ${results.successful.length} of ${results.total} payrolls`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process bulk payroll',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payroll/summary/:month/:year
 * @desc    Get payroll summary for a specific month/year
 * @access  Private
 */
router.get('/summary/:month/:year', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { month, year } = req.params;

    const payrolls = await Payroll.find({
      companyId,
      month: parseInt(month),
      year: parseInt(year),
      isDeleted: false
    }).lean();

    // Calculate summary statistics
    const summary = {
      totalEmployees: payrolls.length,
      totalGrossSalary: payrolls.reduce((sum, p) => sum + (p.earnings?.grossSalary || 0), 0),
      totalNetSalary: payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + (p.deductions?.total || 0), 0),
      totalEarnings: payrolls.reduce((sum, p) => sum + (p.earnings?.total || 0), 0),
      statusBreakdown: {
        Processed: payrolls.filter(p => p.status === 'Processed').length,
        Pending: payrolls.filter(p => p.status === 'Pending').length,
        Paid: payrolls.filter(p => p.status === 'Paid').length
      }
    };

    res.json({
      status: 'success',
      data: {
        month: parseInt(month),
        year: parseInt(year),
        summary,
        payrolls
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payroll summary',
      error: error.message
    });
  }
});

export default router;
