/**
 * Jest Test Setup
 *
 * Global setup and teardown for all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms-test';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret_key';
process.env.CLERK_JWT_KEY = 'test_clerk_jwt_key';
process.env.CLERK_PUBLISHABLE_KEY = 'test_clerk_publishable_key';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.SESSION_SECRET = 'test_session_secret_for_testing_only';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Generate a test employee ID
   */
  generateEmployeeId: () => `EMP-${Date.now()}`,

  /**
   * Generate a test company ID
   */
  generateCompanyId: () => `COMP-${Date.now()}`,

  /**
   * Generate a test project ID
   */
  generateProjectId: () => `PROJ-${Date.now()}`,

  /**
   * Generate a test client ID
   */
  generateClientId: () => `CLIENT-${Date.now()}`,

  /**
   * Generate a test ticket ID
   */
  generateTicketId: () => `TKT-${Date.now()}`,

  /**
   * Generate a test designation ID
   */
  generateDesignationId: () => `DESG-${Date.now()}`,

  /**
   * Generate a test department ID
   */
  generateDepartmentId: () => `DEPT-${Date.now()}`,

  /**
   * Generate a test attendance ID
   */
  generateAttendanceId: () => `ATT-${Date.now()}`,

  /**
   * Generate a test leave ID
   */
  generateLeaveId: () => `LV-${Date.now()}`,

  /**
   * Generate a test payroll ID
   */
  generatePayrollId: () => `PAY-${Date.now()}`,

  /**
   * Generate a random email
   */
  generateEmail: () => `test${Date.now()}@example.com`,

  /**
   * Generate a random phone number
   */
  generatePhone: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,

  /**
   * Generate test employee data
   */
  generateEmployeeData: (overrides = {}) => ({
    employeeId: global.testUtils.generateEmployeeId(),
    companyId: global.testUtils.generateCompanyId(),
    clerkUserId: `user_${Date.now()}`,
    firstName: 'Test',
    lastName: 'User',
    email: global.testUtils.generateEmail(),
    phone: global.testUtils.generatePhone(),
    joiningDate: new Date(),
    employmentStatus: 'Active',
    ...overrides
  }),

  /**
   * Generate test project data
   */
  generateProjectData: (overrides = {}) => ({
    projectId: global.testUtils.generateProjectId(),
    companyId: global.testUtils.generateCompanyId(),
    name: 'Test Project',
    description: 'A test project',
    client: 'Test Client',
    startDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    priority: 'Medium',
    status: 'Active',
    ...overrides
  }),

  /**
   * Generate test attendance data
   */
  generateAttendanceData: (overrides = {}) => ({
    attendanceId: global.testUtils.generateAttendanceId(),
    companyId: global.testUtils.generateCompanyId(),
    employeeId: null, // Should be populated by test
    date: new Date(),
    clockIn: new Date(),
    clockOut: new Date(Date.now() + 8 * 60 * 60 * 1000),
    status: 'Present',
    ...overrides
  }),

  /**
   * Generate test leave data
   */
  generateLeaveData: (overrides = {}) => ({
    leaveId: global.testUtils.generateLeaveId(),
    companyId: global.testUtils.generateCompanyId(),
    employeeId: null, // Should be populated by test
    leaveTypeId: null, // Should be populated by test
    fromDate: new Date(),
    toDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    numberOfDays: 3,
    reason: 'Test leave request',
    status: 'Pending',
    ...overrides
  }),

  /**
   * Generate test payroll data
   */
  generatePayrollData: (overrides = {}) => ({
    payrollId: global.testUtils.generatePayrollId(),
    companyId: global.testUtils.generateCompanyId(),
    employeeId: null, // Should be populated by test
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    earnings: {
      basicSalary: 5000,
      hra: 2000,
      allowances: 1000
    },
    deductions: {
      professionalTax: 200,
      providentFund: 600
    },
    status: 'Draft',
    ...overrides
  }),

  /**
   * Generate test department data
   */
  generateDepartmentData: (overrides = {}) => ({
    departmentId: global.testUtils.generateDepartmentId(),
    companyId: global.testUtils.generateCompanyId(),
    name: 'Test Department',
    code: 'TEST',
    status: 'Active',
    ...overrides
  }),

  /**
   * Generate test designation data
   */
  generateDesignationData: (overrides = {}) => ({
    designationId: global.testUtils.generateDesignationId(),
    companyId: global.testUtils.generateCompanyId(),
    title: 'Test Designation',
    code: 'TDSG',
    level: 'Mid',
    levelNumber: 3,
    status: 'Active',
    ...overrides
  })
};

// Mock console methods in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging test failures
    error: console.error
  };
}

// Setup database connection for tests
let mongoose;

beforeAll(async () => {
  // Import mongoose only when needed
  mongoose = (await import('mongoose')).default;

  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
  }
});

// Cleanup database after each test
afterEach(async () => {
  // Clear all collections between tests
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      // Skip system collections
      if (!collection.collectionName.startsWith('system.')) {
        await collection.deleteMany({});
      }
    }
  }
});

// Close database connection after all tests
afterAll(async () => {
  if (mongoose && mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});
