/**
 * Reports Routes
 *
 * All report generation endpoints
 *
 * @module routes/reports
 */

import express from 'express';
import employeeReports from '../controllers/reports/employeeReports.controller.js';
import attendanceReports from '../controllers/reports/attendanceReports.controller.js';
import leaveReports from '../controllers/reports/leaveReports.controller.js';
import projectReports from '../controllers/reports/projectReports.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ==================== EMPLOYEE REPORTS ====================

/**
 * @route   GET /api/reports/employees
 * @desc    Generate comprehensive employee report
 * @access  Private
 */
router.get('/employees', employeeReports.generateEmployeeReport);

/**
 * @route   GET /api/reports/employee-attendance-summary
 * @desc    Generate employee attendance summary
 * @access  Private
 */
router.get('/employee-attendance-summary', employeeReports.generateEmployeeAttendanceSummary);

/**
 * @route   GET /api/reports/employees/export
 * @desc    Export employee report to CSV
 * @access  Private
 */
router.get('/employees/export', employeeReports.exportEmployeeReport);

// ==================== ATTENDANCE REPORTS ====================

/**
 * @route   GET /api/reports/attendance
 * @desc    Generate attendance report
 * @access  Private
 */
router.get('/attendance', attendanceReports.generateAttendanceReport);

/**
 * @route   GET /api/reports/attendance/monthly-summary
 * @desc    Generate monthly attendance summary
 * @access  Private
 */
router.get('/attendance/monthly-summary', attendanceReports.generateMonthlyAttendanceSummary);

/**
 * @route   GET /api/reports/attendance/export
 * @desc    Export attendance report to CSV
 * @access  Private
 */
router.get('/attendance/export', attendanceReports.exportAttendanceReport);

// ==================== LEAVE REPORTS ====================

/**
 * @route   GET /api/reports/leaves
 * @desc    Generate leave report
 * @access  Private
 */
router.get('/leaves', leaveReports.generateLeaveReport);

/**
 * @route   GET /api/reports/leave-balance
 * @desc    Generate leave balance report
 * @access  Private
 */
router.get('/leave-balance', leaveReports.generateLeaveBalanceReport);

/**
 * @route   GET /api/reports/leaves/monthly-summary
 * @desc    Generate monthly leave summary
 * @access  Private
 */
router.get('/leaves/monthly-summary', leaveReports.generateMonthlyLeaveSummary);

/**
 * @route   GET /api/reports/leaves/export
 * @desc    Export leave report to CSV
 * @access  Private
 */
router.get('/leaves/export', leaveReports.exportLeaveReport);

// ==================== PROJECT REPORTS ====================

/**
 * @route   GET /api/reports/projects
 * @desc    Generate project report
 * @access  Private
 */
router.get('/projects', projectReports.generateProjectReport);

/**
 * @route   GET /api/reports/tasks
 * @desc    Generate task report
 * @access  Private
 */
router.get('/tasks', projectReports.generateTaskReport);

/**
 * @route   GET /api/reports/projects/timeline
 * @desc    Generate project timeline report
 * @access  Private
 */
router.get('/projects/timeline', projectReports.generateProjectTimelineReport);

/**
 * @route   GET /api/reports/projects/export
 * @desc    Export project report to CSV
 * @access  Private
 */
router.get('/projects/export', projectReports.exportProjectReport);

export default router;
