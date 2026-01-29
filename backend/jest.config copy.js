/**
 * Jest Configuration for Backend Testing
 *
 * @see https://jestjs.io/docs/configuration
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Coverage report format
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Transform files (for ES modules)
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Global variables
  globals: {
    'NODE_ENV': 'test'
  },

  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@config/(.*)$': '<rootDir>/config/$1'
  },

  // Timeout for tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks after each test
  restoreMocks: true
};
