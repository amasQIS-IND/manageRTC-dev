/**
 * Shift REST Controller
 * Handles all Shift CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildConflictError,
  buildNotFoundError,
  buildValidationError
} from '../../middleware/errorHandler.js';
import {
  buildPagination,
  extractUser,
  sendCreated,
  sendSuccess
} from '../../utils/apiResponse.js';
import { broadcastShiftEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

/**
 * @desc    Get all shifts with pagination and filtering
 * @route   GET /api/shifts
 * @access  Private (Admin, HR, Superadmin)
 */
export const getShifts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const { page, limit, search, isActive, sortBy, order } = query;
  const user = extractUser(req);

  console.log('[Shift Controller] getShifts - companyId:', user.companyId, 'filters:', { page, limit, search, isActive });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter - always exclude soft-deleted records
  let filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Apply active filter
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }

  // Apply search filter
  if (search && search.trim()) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { shiftId: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await collections.shifts.countDocuments(filter);

  // Build sort option
  const sortObj = {};
  if (sortBy) {
    sortObj[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sortObj.isDefault = -1;
    sortObj.name = 1;
  }

  // Get paginated results
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const skip = (pageNum - 1) * limitNum;

  const shifts = await collections.shifts
    .find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  // Build pagination metadata
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, shifts, 'Shifts retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single shift by ID
 * @route   GET /api/shifts/:id
 * @access  Private (All authenticated users)
 */
export const getShiftById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Shift Controller] getShiftById - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: { $oid: id },
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  return sendSuccess(res, shift);
});

/**
 * @desc    Get default shift for company
 * @route   GET /api/shifts/default
 * @access  Private (All authenticated users)
 */
export const getDefaultShift = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  console.log('[Shift Controller] getDefaultShift - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find default shift
  const shift = await collections.shifts.findOne({
    companyId: user.companyId,
    isDefault: true,
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    // If no default shift, return the first active shift
    const firstShift = await collections.shifts.findOne({
      companyId: user.companyId,
      isActive: true,
      isDeleted: { $ne: true }
    }).sort({ name: 1 });

    return sendSuccess(res, firstShift, 'No default shift found, returning first active shift');
  }

  return sendSuccess(res, shift);
});

/**
 * @desc    Get all active shifts for company
 * @route   GET /api/shifts/active
 * @access  Private (All authenticated users)
 */
export const getActiveShifts = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  console.log('[Shift Controller] getActiveShifts - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find all active shifts
  const shifts = await collections.shifts.find({
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  })
    .sort({ isDefault: -1, name: 1 })
    .toArray();

  return sendSuccess(res, shifts, 'Active shifts retrieved successfully');
});

/**
 * @desc    Create new shift
 * @route   POST /api/shifts
 * @access  Private (Admin, HR, Superadmin)
 */
export const createShift = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const shiftData = req.body;

  console.log('[Shift Controller] createShift - companyId:', user.companyId);
  console.log('[Shift Controller] shiftData:', JSON.stringify(shiftData, null, 2));

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check if shift code already exists (if provided)
  if (shiftData.code) {
    const existingCode = await collections.shifts.findOne({
      code: shiftData.code.toUpperCase(),
      companyId: user.companyId,
      isDeleted: { $ne: true }
    });

    if (existingCode) {
      throw buildConflictError('Shift', `code: ${shiftData.code}`);
    }
  }

  // Check if this is being set as default - remove default from others
  if (shiftData.isDefault) {
    await collections.shifts.updateMany(
      {
        companyId: user.companyId,
        isDefault: true,
        isDeleted: { $ne: true }
      },
      { $set: { isDefault: false } }
    );
  }

  // Add audit fields
  const shiftToInsert = {
    ...shiftData,
    companyId: user.companyId,
    code: shiftData.code ? shiftData.code.toUpperCase() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.userId,
    updatedBy: user.userId
  };

  // Create shift
  const result = await collections.shifts.insertOne(shiftToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create shift');
  }

  // Get the created shift
  const shift = await collections.shifts.findOne({ _id: result.insertedId });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.created(io, user.companyId, shift);
  }

  return sendCreated(res, shift, 'Shift created successfully');
});

/**
 * @desc    Update shift
 * @route   PUT /api/shifts/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const updateShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  console.log('[Shift Controller] updateShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: { $oid: id },
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  // Check code uniqueness if being updated
  if (updateData.code && updateData.code !== shift.code) {
    const existingCode = await collections.shifts.findOne({
      code: updateData.code.toUpperCase(),
      companyId: user.companyId,
      _id: { $ne: { $oid: id } },
      isDeleted: { $ne: true }
    });

    if (existingCode) {
      throw buildConflictError('Shift', `code: ${updateData.code}`);
    }
  }

  // Handle default shift changes
  if (updateData.isDefault && !shift.isDefault) {
    // Remove default from other shifts
    await collections.shifts.updateMany(
      {
        companyId: user.companyId,
        isDefault: true,
        _id: { $ne: { $oid: id } },
        isDeleted: { $ne: true }
      },
      { $set: { isDefault: false } }
    );
  }

  // Update audit fields
  updateData.updatedAt = new Date();
  updateData.updatedBy = user.userId;
  if (updateData.code) {
    updateData.code = updateData.code.toUpperCase();
  }

  // Update shift
  const result = await collections.shifts.updateOne(
    { _id: { $oid: id } },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Shift', id);
  }

  // Get updated shift
  const updatedShift = await collections.shifts.findOne({ _id: { $oid: id } });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.updated(io, user.companyId, updatedShift);
  }

  return sendSuccess(res, updatedShift, 'Shift updated successfully');
});

/**
 * @desc    Delete shift (soft delete)
 * @route   DELETE /api/shifts/:id
 * @access  Private (Admin, Superadmin only)
 */
export const deleteShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Shift Controller] deleteShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: { $oid: id },
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  // Check if shift is being used by employees
  const employeesUsingShift = await collections.employees.countDocuments({
    companyId: user.companyId,
    shiftId: id,
    isDeleted: { $ne: true }
  });

  if (employeesUsingShift > 0) {
    throw buildValidationError('shift', `Cannot delete shift. ${employeesUsingShift} employee(s) are assigned to this shift.`);
  }

  // Soft delete - set isDeleted flag
  const result = await collections.shifts.updateOne(
    { _id: { $oid: id } },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.userId,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Shift', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.deleted(io, user.companyId, shift.shiftId || id, user.userId);
  }

  return sendSuccess(res, {
    _id: shift._id,
    shiftId: shift.shiftId,
    isDeleted: true,
    deletedAt: new Date()
  }, 'Shift deleted successfully');
});

/**
 * @desc    Set shift as default
 * @route   PUT /api/shifts/:id/set-default
 * @access  Private (Admin, HR, Superadmin)
 */
export const setDefaultShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Shift Controller] setDefaultShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: { $oid: id },
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  // Remove default from all shifts
  await collections.shifts.updateMany(
    {
      companyId: user.companyId,
      isDefault: true,
      isDeleted: { $ne: true }
    },
    { $set: { isDefault: false } }
  );

  // Set this shift as default
  await collections.shifts.updateOne(
    { _id: { $oid: id } },
    {
      $set: {
        isDefault: true,
        updatedAt: new Date(),
        updatedBy: user.userId
      }
    }
  );

  // Get updated shift
  const updatedShift = await collections.shifts.findOne({ _id: { $oid: id } });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.updated(io, user.companyId, updatedShift);
  }

  return sendSuccess(res, updatedShift, 'Default shift updated successfully');
});

export default {
  getShifts,
  getShiftById,
  getDefaultShift,
  getActiveShifts,
  createShift,
  updateShift,
  deleteShift,
  setDefaultShift
};
