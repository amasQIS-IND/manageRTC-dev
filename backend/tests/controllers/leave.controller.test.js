/**
 * Leave Controller Tests
 * Tests for all Leave REST API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Leave from '../../models/leave/leave.schema.js';

// Mock Clerk authentication
jest.mock('@clerk/express', () => ({
  requireAuth: (req, res, next) => {
    req.auth = {
      userId: 'test-user-id',
      claims: {
        org_id: 'test-company-id'
      }
    };
    next();
  }
}));

// Mock Socket.IO broadcaster
jest.mock('../../utils/socketBroadcaster.js', () => ({
  getSocketIO: () => null,
  broadcastLeaveEvents: {
    created: jest.fn(),
    updated: jest.fn(),
    deleted: jest.fn(),
    approved: jest.fn(),
    rejected: jest.fn(),
    balanceUpdated: jest.fn()
  }
}));

let mongoServer;
let authToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create a test employee
  const Employee = mongoose.model('Employee');
  const employee = await Employee.create({
    clerkUserId: 'test-user-id',
    companyId: 'test-company-id',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    employeeId: 'EMP001',
    email: 'john.doe@test.com',
    leaveBalances: [
      { type: 'casual', total: 12, used: 2, balance: 10 },
      { type: 'sick', total: 10, used: 1, balance: 9 },
      { type: 'earned', total: 15, used: 0, balance: 15 }
    ]
  });

  // Create a manager for approval tests
  await Employee.create({
    clerkUserId: 'manager-user-id',
    companyId: 'test-company-id',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    employeeId: 'EMP002',
    email: 'jane.smith@test.com'
  });

  authToken = `Bearer fake-jwt-token-${employee._id}`;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Leave.deleteMany({});
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('Leave Controller Tests', () => {

  describe('GET /api/leaves', () => {
    it('should fetch all leave requests with pagination', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'approved',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter leaves by status', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'approved',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves?status=pending')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should filter leaves by leave type', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'pending',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves?leaveType=casual')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].leaveType).toBe('casual');
    });

    it('should filter leaves by date range', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-03-10'),
          endDate: new Date('2026-03-11'),
          status: 'pending',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves?startDate=2026-02-01&endDate=2026-02-28')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/leaves')
        .expect(401);
    });
  });

  describe('GET /api/leaves/:id', () => {
    it('should fetch single leave request by ID', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const response = await request(app)
        .get(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(leave._id.toString());
    });

    it('should return 404 for non-existent leave request', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/leaves/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', async () => {
      await request(app)
        .get('/api/leaves/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('POST /api/leaves', () => {
    it('should create leave request successfully', async () => {
      const leaveData = {
        leaveType: 'casual',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        reason: 'Family function',
        duration: 3
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', authToken)
        .send(leaveData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.data.leaveType).toBe('casual');
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate end date is after start date', async () => {
      const leaveData = {
        leaveType: 'casual',
        startDate: '2026-02-05',
        endDate: '2026-02-01',
        reason: 'Invalid dates',
        duration: 3
      };

      await request(app)
        .post('/api/leaves')
        .set('Authorization', authToken)
        .send(leaveData)
        .expect(400);
    });

    it('should prevent overlapping leave requests', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const leaveData = {
        leaveType: 'sick',
        startDate: '2026-02-02',
        endDate: '2026-02-04',
        reason: 'Overlapping leave',
        duration: 3
      };

      await request(app)
        .post('/api/leaves')
        .set('Authorization', authToken)
        .send(leaveData)
        .expect(409);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/leaves')
        .send({ leaveType: 'casual', startDate: '2026-02-01', endDate: '2026-02-03' })
        .expect(401);
    });
  });

  describe('PUT /api/leaves/:id', () => {
    it('should update leave request successfully', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const updateData = {
        reason: 'Updated reason for leave',
        duration: 2
      };

      const response = await request(app)
        .put(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe('Updated reason for leave');
    });

    it('should prevent updating approved leave', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'approved',
        duration: 3
      });

      await request(app)
        .put(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .send({ reason: 'Should not update' })
        .expect(409);
    });

    it('should prevent updating rejected leave', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'rejected',
        duration: 3
      });

      await request(app)
        .put(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .send({ reason: 'Should not update' })
        .expect(409);
    });

    it('should check for overlapping leaves when updating dates', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave1 = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'sick',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-12'),
        status: 'pending',
        duration: 3
      });

      const updateData = {
        startDate: '2026-02-11',
        endDate: '2026-02-13'
      };

      await request(app)
        .put(`/api/leaves/${leave1._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(409);
    });
  });

  describe('DELETE /api/leaves/:id', () => {
    it('should soft delete leave request', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const response = await request(app)
        .delete(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDeleted).toBe(true);

      // Verify soft delete
      const deletedLeave = await Leave.findById(leave._id);
      expect(deletedLeave.isDeleted).toBe(true);
    });

    it('should prevent deleting approved leave', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'approved',
        duration: 3
      });

      await request(app)
        .delete(`/api/leaves/${leave._id}`)
        .set('Authorization', authToken)
        .expect(409);
    });

    it('should return 404 for non-existent leave request', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/leaves/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('GET /api/leaves/my', () => {
    it('should fetch my leave requests', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'approved',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves/my')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter my leaves by status', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'approved',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves/my?status=pending')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });
  });

  describe('GET /api/leaves/status/:status', () => {
    it('should fetch leaves by status', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-11'),
          status: 'approved',
          duration: 2
        }
      ]);

      const response = await request(app)
        .get('/api/leaves/status/pending')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should validate status parameter', async () => {
      await request(app)
        .get('/api/leaves/status/invalid-status')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('POST /api/leaves/:id/approve', () => {
    it('should approve leave request successfully', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const response = await request(app)
        .post(`/api/leaves/${leave._id}/approve`)
        .set('Authorization', authToken)
        .send({ comments: 'Approved - Have a good break' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');
      expect(response.body.data.status).toBe('approved');
    });

    it('should only approve pending leaves', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'approved',
        duration: 3
      });

      await request(app)
        .post(`/api/leaves/${leave._id}/approve`)
        .set('Authorization', authToken)
        .expect(409);
    });
  });

  describe('POST /api/leaves/:id/reject', () => {
    it('should reject leave request successfully', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      const response = await request(app)
        .post(`/api/leaves/${leave._id}/reject`)
        .set('Authorization', authToken)
        .send({ reason: 'Insufficient team coverage' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected successfully');
      expect(response.body.data.status).toBe('rejected');
    });

    it('should require rejection reason', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'pending',
        duration: 3
      });

      await request(app)
        .post(`/api/leaves/${leave._id}/reject`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);
    });

    it('should only reject pending leaves', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const leave = await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        status: 'approved',
        duration: 3
      });

      await request(app)
        .post(`/api/leaves/${leave._id}/reject`)
        .set('Authorization', authToken)
        .send({ reason: 'Cannot reject approved' })
        .expect(409);
    });
  });

  describe('GET /api/leaves/balance', () => {
    it('should fetch all leave balances', async () => {
      const response = await request(app)
        .get('/api/leaves/balance')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('balances');
      expect(response.body.data).toBeDefined();
    });

    it('should fetch specific leave type balance', async () => {
      const response = await request(app)
        .get('/api/leaves/balance?leaveType=casual')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('casual');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle pagination correctly', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      // Create 25 leave requests
      const records = [];
      for (let i = 0; i < 25; i++) {
        records.push({
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + (i + 3) * 24 * 60 * 60 * 1000),
          status: 'pending',
          duration: 3
        });
      }
      await Leave.create(records);

      const response = await request(app)
        .get('/api/leaves?page=1&limit=10')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('should handle search functionality', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create({
        employee: employee._id,
        companyId: 'test-company-id',
        leaveType: 'casual',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        reason: 'Medical emergency - need to visit doctor',
        status: 'pending',
        duration: 3
      });

      const response = await request(app)
        .get('/api/leaves?search=medical')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].reason).toContain('medical');
    });

    it('should handle sorting', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-12'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        }
      ]);

      const response = await request(app)
        .get('/api/leaves?sortBy=startDate&order=asc')
        .set('Authorization', authToken)
        .expect(200);

      const startDate1 = new Date(response.body.data[0].startDate);
      const startDate2 = new Date(response.body.data[1].startDate);
      expect(startDate1 < startDate2).toBe(true);
    });

    it('should handle multiple filters simultaneously', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Leave.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          status: 'pending',
          duration: 3
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'sick',
          startDate: new Date('2026-02-05'),
          endDate: new Date('2026-02-06'),
          status: 'pending',
          duration: 2
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          leaveType: 'casual',
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-12'),
          status: 'approved',
          duration: 3
        }
      ]);

      const response = await request(app)
        .get('/api/leaves?status=pending&leaveType=casual')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
      expect(response.body.data[0].leaveType).toBe('casual');
    });
  });
});
