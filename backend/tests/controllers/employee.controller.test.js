/**
 * Employee Controller Unit Tests
 * Tests for all employee REST API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server.js';
import Employee from '../../models/employee/employee.schema.js';

// Mock Socket.IO broadcaster
jest.mock('../../utils/socketBroadcaster.js', () => ({
  broadcastToCompany: jest.fn(),
  getSocketIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));

describe('Employee Controller Tests', () => {
  let mongoServer;
  let testEmployee;
  let authToken;

  // Mock authentication middleware
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test employee
    testEmployee = await Employee.create({
      employeeId: 'EMP-2026-0001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      department: 'Engineering',
      designation: 'Software Engineer',
      companyId: 'test_company_id',
      status: 'Active',
      dateOfJoining: new Date('2024-01-01')
    });

    // Mock auth token (in real implementation, this would be a valid JWT)
    authToken = 'Bearer mock_jwt_token';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Employee.deleteMany({});
  });

  describe('GET /api/employees', () => {
    it('should fetch all employees', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by department', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ department: 'Engineering' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(emp => emp.department === 'Engineering')).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ status: 'Active' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(emp => emp.status === 'Active')).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/employees')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should fetch a single employee by ID', async () => {
      const response = await request(app)
        .get(`/api/employees/${testEmployee._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testEmployee._id.toString());
      expect(response.body.data.firstName).toBe('John');
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee', async () => {
      const newEmployee = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        department: 'Marketing',
        designation: 'Marketing Manager',
        dateOfJoining: '2024-01-15'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', authToken)
        .send(newEmployee)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.lastName).toBe('Smith');
      expect(response.body.data.email).toBe('jane.smith@test.com');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteEmployee = {
        firstName: 'Jane'
        // Missing lastName, email, etc.
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', authToken)
        .send(incompleteEmployee)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for duplicate email', async () => {
      const duplicateEmployee = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john.doe@test.com', // Duplicate email
        department: 'Sales',
        designation: 'Sales Rep',
        dateOfJoining: '2024-01-15'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', authToken)
        .send(duplicateEmployee)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update an employee', async () => {
      const updates = {
        firstName: 'John Updated',
        designation: 'Senior Software Engineer'
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployee._id}`)
        .set('Authorization', authToken)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('John Updated');
      expect(response.body.data.designation).toBe('Senior Software Engineer');
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/employees/${fakeId}`)
        .set('Authorization', authToken)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should soft delete an employee', async () => {
      const response = await request(app)
        .delete(`/api/employees/${testEmployee._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDeleted).toBe(true);

      // Verify employee is marked as deleted
      const deletedEmployee = await Employee.findById(testEmployee._id);
      expect(deletedEmployee.isDeleted).toBe(true);
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/employees/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/employees/search', () => {
    beforeEach(async () => {
      // Create test employees for search
      await Employee.create([
        {
          employeeId: 'EMP-2026-0002',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.j@test.com',
          department: 'Engineering',
          designation: 'Developer',
          companyId: 'test_company_id',
          status: 'Active',
          dateOfJoining: new Date('2024-01-01')
        },
        {
          employeeId: 'EMP-2026-0003',
          firstName: 'Bob',
          lastName: 'Anderson',
          email: 'bob.a@test.com',
          department: 'Engineering',
          designation: 'QA Engineer',
          companyId: 'test_company_id',
          status: 'Active',
          dateOfJoining: new Date('2024-01-01')
        }
      ]);
    });

    it('should search employees by name', async () => {
      const response = await request(app)
        .get('/api/employees/search')
        .query({ q: 'Alice' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.some(emp => emp.firstName.includes('Alice'))).toBe(true);
    });

    it('should search employees by email', async () => {
      const response = await request(app)
        .get('/api/employees/search')
        .query({ q: 'john@test.com' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/employees/dashboard', () => {
    it('should fetch employee dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/employees/dashboard')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalEmployees).toBeDefined();
      expect(response.body.data.activeEmployees).toBeDefined();
    });
  });
});
