/**
 * Resignation REST API Routes
 * All resignation management endpoints
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import resignationController from '../../controllers/rest/resignation.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/resignations/stats
 * @desc    Get resignation statistics
 * @access  Private (Admin, HR)
 */
router.get('/stats', resignationController.getStats);

/**
 * @route   GET /api/resignations/departments
 * @desc    Get departments for resignation filter
 * @access  Private
 */
router.get('/departments', resignationController.getResignationDepartments);

/**
 * @route   GET /api/resignations/employees/:departmentId
 * @desc    Get employees by department
 * @access  Private
 */
router.get('/employees/:departmentId', resignationController.getEmployeesByDepartmentId);

/**
 * @route   GET /api/resignations
 * @desc    Get all resignations
 * @access  Private (Admin, HR)
 */
router.get('/', resignationController.getAllResignations);

/**
 * @route   GET /api/resignations/:id
 * @desc    Get single resignation by ID
 * @access  Private (Admin, HR)
 */
router.get('/:id', resignationController.getResignationById);

/**
 * @route   POST /api/resignations
 * @desc    Create new resignation
 * @access  Private (Admin, HR)
 */
router.post('/', resignationController.createResignation);

/**
 * @route   PUT /api/resignations/:id
 * @desc    Update resignation
 * @access  Private (Admin, HR)
 */
router.put('/:id', resignationController.updateResignationById);

/**
 * @route   PUT /api/resignations/:id/approve
 * @desc    Approve resignation
 * @access  Private (Admin, HR)
 */
router.put('/:id/approve', resignationController.approveResignationById);

/**
 * @route   PUT /api/resignations/:id/reject
 * @desc    Reject resignation
 * @access  Private (Admin, HR)
 */
router.put('/:id/reject', resignationController.rejectResignationById);

/**
 * @route   PUT /api/resignations/:id/process
 * @desc    Process resignation (mark as effective)
 * @access  Private (Admin, HR)
 */
router.put('/:id/process', resignationController.processResignationById);

/**
 * @route   DELETE /api/resignations
 * @desc    Delete resignations (bulk delete)
 * @access  Private (Admin)
 */
router.delete('/', resignationController.deleteResignations);

export default router;
