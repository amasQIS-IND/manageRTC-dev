/**
 * Attendance Controller Tests
 * Tests for all Attendance REST API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Attendance from '../../models/attendance/attendance.schema.js';

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
  broadcastAttendanceEvents: {
    created: jest.fn(),
    updated: jest.fn(),
    deleted: jest.fn(),
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    bulkUpdated: jest.fn()
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
    email: 'john.doe@test.com'
  });

  authToken = `Bearer fake-jwt-token-${employee._id}`;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Attendance.deleteMany({});
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('Attendance Controller Tests', () => {

  describe('GET /api/attendance', () => {
    it('should fetch all attendance records with pagination', async () => {
      // Create test attendance records
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-28'),
          clockIn: { time: new Date('2026-01-28T09:00:00') },
          clockOut: { time: new Date('2026-01-28T18:00:00') },
          status: 'Present'
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-27'),
          clockIn: { time: new Date('2026-01-27T09:00:00') },
          clockOut: { time: new Date('2026-01-27T18:00:00') },
          status: 'Present'
        }
      ]);

      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter attendance by status', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-28'),
          status: 'Present'
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-27'),
          status: 'Absent'
        }
      ]);

      const response = await request(app)
        .get('/api/attendance?status=Present')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('Present');
    });

    it('should filter attendance by date range', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-28'),
          status: 'Present'
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-20'),
          status: 'Present'
        }
      ]);

      const response = await request(app)
        .get('/api/attendance?startDate=2026-01-25&endDate=2026-01-30')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/attendance')
        .expect(401);
    });
  });

  describe('GET /api/attendance/:id', () => {
    it('should fetch single attendance record by ID', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date('2026-01-28'),
        status: 'Present'
      });

      const response = await request(app)
        .get(`/api/attendance/${attendance._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(attendance._id.toString());
    });

    it('should return 404 for non-existent attendance record', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/attendance/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', async () => {
      await request(app)
        .get('/api/attendance/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('POST /api/attendance (Clock In)', () => {
    it('should clock in successfully', async () => {
      const clockInData = {
        date: new Date('2026-01-28'),
        location: { type: 'office', coordinates: [40.7128, -74.0060] }
      };

      const response = await request(app)
        .post('/api/attendance')
        .set('Authorization', authToken)
        .send(clockInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Clocked in');
      expect(response.body.data.clockIn).toBeDefined();
      expect(response.body.data.clockIn.time).toBeDefined();
    });

    it('should prevent duplicate clock in on same day', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        clockIn: { time: new Date() },
        status: 'Present'
      });

      await request(app)
        .post('/api/attendance')
        .set('Authorization', authToken)
        .expect(409);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/attendance')
        .expect(401);
    });
  });

  describe('PUT /api/attendance/:id (Clock Out)', () => {
    it('should clock out successfully', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        clockIn: { time: new Date(Date.now() - 8 * 60 * 60 * 1000) },
        status: 'Present'
      });

      const clockOutData = {
        clockOut: {
          time: new Date(),
          location: { type: 'office' },
          notes: 'Leaving on time'
        }
      };

      const response = await request(app)
        .put(`/api/attendance/${attendance._id}`)
        .set('Authorization', authToken)
        .send(clockOutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Clocked out');
      expect(response.body.data.clockOut).toBeDefined();
    });

    it('should prevent clock out if not clocked in', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        status: 'Absent'
      });

      await request(app)
        .put(`/api/attendance/${attendance._id}`)
        .set('Authorization', authToken)
        .expect(409);
    });

    it('should prevent duplicate clock out', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        clockIn: { time: new Date(Date.now() - 8 * 60 * 60 * 1000) },
        clockOut: { time: new Date() },
        status: 'Present'
      });

      await request(app)
        .put(`/api/attendance/${attendance._id}`)
        .set('Authorization', authToken)
        .expect(409);
    });
  });

  describe('DELETE /api/attendance/:id', () => {
    it('should soft delete attendance record', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        status: 'Present'
      });

      const response = await request(app)
        .delete(`/api/attendance/${attendance._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDeleted).toBe(true);

      // Verify soft delete
      const deletedAttendance = await Attendance.findById(attendance._id);
      expect(deletedAttendance.isDeleted).toBe(true);
    });

    it('should return 404 for non-existent attendance record', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/attendance/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('GET /api/attendance/my', () => {
    it('should fetch my attendance records', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-28'),
          status: 'Present'
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-27'),
          status: 'Present'
        }
      ]);

      const response = await request(app)
        .get('/api/attendance/my')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter my attendance by date range', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date('2026-01-28'),
        status: 'Present'
      });

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date('2026-01-20'),
        status: 'Present'
      });

      const response = await request(app)
        .get('/api/attendance/my?startDate=2026-01-25&endDate=2026-01-30')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/attendance/daterange', () => {
    it('should fetch attendance by date range', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date('2026-01-28'),
        status: 'Present'
      });

      const response = await request(app)
        .get('/api/attendance/daterange?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should require both startDate and endDate', async () => {
      await request(app)
        .get('/api/attendance/daterange?startDate=2026-01-01')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('GET /api/attendance/employee/:employeeId', () => {
    it('should fetch attendance by employee', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date('2026-01-28'),
        status: 'Present'
      });

      const response = await request(app)
        .get(`/api/attendance/employee/${employee._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 for invalid employee ID', async () => {
      await request(app)
        .get('/api/attendance/employee/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('GET /api/attendance/stats', () => {
    it('should fetch attendance statistics', async () => {
      const response = await request(app)
        .get('/api/attendance/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('statistics');
    });
  });

  describe('POST /api/attendance/bulk', () => {
    it('should perform bulk approve-regularization action', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const attendance1 = await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        regularizationRequest: {
          requested: true,
          reason: 'Traffic delay'
        },
        status: 'Present'
      });

      const bulkData = {
        action: 'approve-regularization',
        attendanceIds: [attendance1._id.toString()]
      };

      const response = await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', authToken)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('approve-regularization');
    });

    it('should require action and attendanceIds', async () => {
      await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', authToken)
        .send({ action: 'approve-regularization' })
        .expect(400);
    });

    it('should validate bulk action type', async () => {
      await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', authToken)
        .send({
          action: 'invalid-action',
          attendanceIds: ['123']
        })
        .expect(400);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle pagination correctly', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      // Create 25 records
      const records = [];
      for (let i = 0; i < 25; i++) {
        records.push({
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          status: 'Present'
        });
      }
      await Attendance.create(records);

      const response = await request(app)
        .get('/api/attendance?page=1&limit=10')
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

      await Attendance.create({
        employee: employee._id,
        companyId: 'test-company-id',
        date: new Date(),
        notes: 'Working from home due to illness',
        status: 'Present'
      });

      const response = await request(app)
        .get('/api/attendance?search=illness')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].notes).toContain('illness');
    });

    it('should handle sorting', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Attendance.create([
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-27'),
          status: 'Present'
        },
        {
          employee: employee._id,
          companyId: 'test-company-id',
          date: new Date('2026-01-28'),
          status: 'Present'
        }
      ]);

      const response = await request(app)
        .get('/api/attendance?sortBy=date&order=asc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data[0].date).toBe('2026-01-27T00:00:00.000Z');
    });
  });
});
