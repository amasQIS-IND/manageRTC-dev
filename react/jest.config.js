/**
 * Jest Configuration for React Frontend Testing
 *
 * @see https://jestjs.io/docs/configuration
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Root directory for tests
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(css|scss|sass|less)$': 'jest-transform-stub',
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': 'jest-transform-stub'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\](?!(@ant-design|antd|@fullcalendar|rc-.+?|react-router-dom|react-redux|@reduxjs/toolkit)/)'
  ],

  // Mock CSS modules
  moduleNameMapper: {
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy'
  }
};
