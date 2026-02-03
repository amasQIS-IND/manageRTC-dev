/**
 * Holiday REST API Routes
 * All holiday management endpoints
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import holidayController from '../../controllers/rest/holiday.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/holidays
 * @desc    Get all holidays
 * @access  Private
 */
router.get('/', holidayController.getAllHolidays);

/**
 * @route   GET /api/holidays/upcoming
 * @desc    Get upcoming holidays
 * @access  Private
 */
router.get('/upcoming', holidayController.getUpcomingHolidays);

/**
 * @route   GET /api/holidays/year/:year
 * @desc    Get holidays by year
 * @access  Private
 */
router.get('/year/:year', holidayController.getHolidaysByYear);

/**
 * @route   GET /api/holidays/:id
 * @desc    Get single holiday by ID
 * @access  Private
 */
router.get('/:id', holidayController.getHolidayById);

/**
 * @route   POST /api/holidays
 * @desc    Create new holiday
 * @access  Private (Admin, HR)
 */
router.post('/', holidayController.createHoliday);

/**
 * @route   PUT /api/holidays/:id
 * @desc    Update holiday
 * @access  Private (Admin, HR)
 */
router.put('/:id', holidayController.updateHolidayById);

/**
 * @route   DELETE /api/holidays/:id
 * @desc    Delete holiday
 * @access  Private (Admin)
 */
router.delete('/:id', holidayController.deleteHolidayById);

export default router;
