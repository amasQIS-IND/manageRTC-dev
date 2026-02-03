/**
 * Termination REST API Routes
 * All termination management endpoints
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import terminationController from '../../controllers/rest/termination.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/terminations/stats
 * @desc    Get termination statistics
 * @access  Private (Admin, HR)
 */
router.get('/stats', terminationController.getStats);

/**
 * @route   GET /api/terminations
 * @desc    Get all terminations
 * @access  Private (Admin, HR)
 */
router.get('/', terminationController.getAllTerminations);

/**
 * @route   GET /api/terminations/:id
 * @desc    Get single termination by ID
 * @access  Private (Admin, HR)
 */
router.get('/:id', terminationController.getTerminationById);

/**
 * @route   POST /api/terminations
 * @desc    Create new termination
 * @access  Private (Admin)
 */
router.post('/', terminationController.createTermination);

/**
 * @route   PUT /api/terminations/:id
 * @desc    Update termination
 * @access  Private (Admin)
 */
router.put('/:id', terminationController.updateTerminationById);

/**
 * @route   PUT /api/terminations/:id/process
 * @desc    Process termination (mark as complete)
 * @access  Private (Admin, HR)
 */
router.put('/:id/process', terminationController.processTerminationById);

/**
 * @route   PUT /api/terminations/:id/cancel
 * @desc    Cancel termination
 * @access  Private (Admin, HR)
 */
router.put('/:id/cancel', terminationController.cancelTerminationById);

/**
 * @route   DELETE /api/terminations
 * @desc    Delete terminations (bulk delete)
 * @access  Private (Admin)
 */
router.delete('/', terminationController.deleteTerminations);

export default router;
