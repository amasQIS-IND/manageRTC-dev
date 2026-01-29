/**
 * Environment Variable Configuration & Validation
 *
 * Validates all required environment variables at startup
 * Throws error if any required variable is missing or invalid
 *
 * Run this file early in the application startup (before importing other modules)
 *
 * @example
 * // In server.js (first import)
 * import './config/env.js'; // Validates env on startup
 * import express from 'express';
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Joi from 'joi';

// Load environment variables from .env file in parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '..', '.env') });

/**
 * Environment variable schema
 * All environment variables must be defined and validated before use
 */
const envSchema = Joi.object({
  // ====================
  // Server Configuration
  // ====================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .port()
    .min(1)
    .max(65535)
    .default(5000)
    .description('Server port'),

  // ====================
  // Database Configuration
  // ====================
  MONGODB_URI: Joi.string()
    .uri()
    .required()
    .description('MongoDB connection string'),

  // ====================
  // Clerk Authentication
  // ====================
  CLERK_SECRET_KEY: Joi.string()
    .pattern(/^sk_test_[A-Za-z0-9_-]+$/)
    .required()
    .description('Clerk secret key'),

  CLERK_JWT_KEY: Joi.string()
    .required()
    .description('Clerk JWT verification key'),

  CLERK_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_test_[A-Za-z0-9_-]+$/)
    .required()
    .description('Clerk publishable key'),

  // ====================
  // Frontend Configuration
  // ====================
  FRONTEND_URL: Joi.string()
    .uri()
    .required()
    .description('Frontend application URL'),

  // ====================
  // Email Configuration (Optional for now)
  // ====================
  EMAIL_FROM: Joi.string()
    .email()
    .description('Default sender email address')
    .optional(),

  SENDGRID_API_KEY: Joi.string()
    .description('SendGrid API key for emails')
    .optional(),

  // ====================
  // Monitoring & Error Tracking (Optional)
  // ====================
  SENTRY_DSN: Joi.string()
    .uri()
    .description('Sentry DSN for error tracking')
    .optional(),

  // ====================
  // AWS Configuration (Optional)
  // ====================
  AWS_REGION: Joi.string()
    .default('us-east-1')
    .description('AWS region'),

  AWS_ACCESS_KEY_ID: Joi.string()
    .description('AWS access key')
    .optional(),

  AWS_SECRET_ACCESS_KEY: Joi.string()
    .description('AWS secret key')
    .optional(),

  S3_BUCKET: Joi.string()
    .description('S3 bucket for backups')
    .optional(),

  // ====================
  // Development Mode (Optional)
  // ====================
  DEV_USER_ID: Joi.string()
    .description('Development mode user ID')
    .optional(),

  DEV_COMPANY_ID: Joi.string()
    .description('Development mode company ID')
    .optional(),

  DEV_USER_ROLE: Joi.string()
    .valid('superadmin', 'admin', 'hr', 'employee', 'leads')
    .default('admin')
    .description('Development mode user role')
    .optional(),

  // ====================
  // Application Configuration
  // ====================
  APP_NAME: Joi.string()
    .default('manageRTC')
    .description('Application name'),

  APP_URL: Joi.string()
    .uri()
    .description('Application base URL')
    .optional(),

  // ====================
  // Rate Limiting Configuration
  // ====================
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .min(1000)
    .default(60000)
    .description('Rate limit window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .min(1)
    .default(100)
    .description('Max requests per rate limit window'),

  // ====================
  // Session Configuration
  // ====================
  SESSION_SECRET: Joi.string()
    .min(32)
    .description('Session secret key')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  // ====================
  // JWT Configuration
  // ====================
  JWT_SECRET: Joi.string()
    .min(32)
    .description('JWT secret key (fallback)')
    .optional(),

  JWT_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('JWT expiration time'),

  // ====================
  // File Upload Configuration
  // ====================
  MAX_FILE_SIZE_MB: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .description('Maximum file upload size in MB'),

  ALLOWED_FILE_TYPES: Joi.array()
    .items(Joi.string())
    .default(['image/jpeg', 'image/png', 'image/gif', 'application/pdf'])
    .description('Allowed file types for upload'),

  // ====================
  // Pagination Defaults
  // ====================
  DEFAULT_PAGE_SIZE: Joi.number()
    .min(1)
    .max(100)
    .default(20)
    .description('Default pagination page size'),

  MAX_PAGE_SIZE: Joi.number()
    .min(1)
    .max(100)
    .default(100)
    .description('Maximum pagination page size'),

  // ====================
  // Feature Flags
  // ====================
  ENABLE_CACHING: Joi.boolean()
    .default(true)
    .description('Enable response caching'),

  ENABLE_RATE_LIMITING: Joi.boolean()
    .default(true)
    .description('Enable rate limiting'),

  ENABLE_CORS: Joi.boolean()
    .default(true)
    .description('Enable CORS'),

  ENABLE_COMPRESSION: Joi.boolean()
    .default(true)
    .description('Enable response compression'),

  // ====================
  // Logging Configuration
  // ====================
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info')
    .description('Logging level'),

  ENABLE_FILE_LOGGING: Joi.boolean()
    .default(true)
    .description('Enable file logging'),

  // ====================
  // Database Configuration
  // ====================
  DB_POOL_SIZE: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .description('Database connection pool size'),

  DB_AUTO_INDEX: Joi.boolean()
    .default(true)
    .description('Auto-create database indexes'),

  // ====================
  // Socket.IO Configuration
  // ====================
  SOCKET_IO_PATH: Joi.string()
    .default('/socket.io')
    .description('Socket.IO path'),

  SOCKET_IO_PING_TIMEOUT: Joi.number()
    .min(1000)
    .default(30000)
    .description('Socket.IO ping timeout'),

  SOCKET_IO_PING_INTERVAL: Joi.number()
    .min(1000)
    .default(25000)
    .description('Socket.IO ping interval')

}).unknown(); // Allow unknown env vars (for flexibility)

/**
 * Validate environment variables
 * This runs on module import and will throw if validation fails
 */
const { error, value: envVars, warning } = envSchema.validate(process.env, {
  stripUnknown: true,
  convert: true
});

/**
 * Handle validation errors
 */
if (error) {
  const missingVars = error.details.filter(d => d.type === 'any.required');
  const invalidVars = error.details.filter(d => d.type !== 'any.required');

  let errorMessage = '\n=================================\n';
  errorMessage += '❌ ENVIRONMENT VARIABLE VALIDATION FAILED\n';
  errorMessage += '=================================\n\n';

  if (missingVars.length > 0) {
    errorMessage += 'Missing required environment variables:\n\n';
    missingVars.forEach(({ context, message }) => {
      errorMessage += `  🔴 ${context.label}: ${message}\n`;
    });
    errorMessage += '\n';
  }

  if (invalidVars.length > 0) {
    errorMessage += 'Invalid environment variables:\n\n';
    invalidVars.forEach(({ context, message }) => {
      errorMessage += `  🟠 ${context.label}: ${message}\n`;
    });
    errorMessage += '\n';
  }

  errorMessage += 'Please check your .env file and ensure all required variables are set.\n';
  errorMessage += '=================================\n';

  // In development, show helpful message
  if (envVars.NODE_ENV === 'development') {
    errorMessage += '\n💡 Development Mode:\n';
    errorMessage += '   Copy .env.example to .env and fill in the values.\n';
    errorMessage += '   See .env.example for all required variables.\n';
  }

  console.error(errorMessage);
  throw new Error('Environment validation failed. See error details above.');
}

/**
 * Log warnings for deprecated or optional variables
 */
if (warning && warning.length > 0) {
  console.warn('\n⚠️  Environment Variable Warnings:\n');
  warning.forEach(({ context, message }) => {
    console.warn(`  ⚠️  ${context.label}: ${message}`);
  });
  console.warn('');
}

/**
 * Log successful validation (development only)
 */
if (envVars.NODE_ENV === 'development') {
  console.log('\n=================================');
  console.log('✅ Environment variables validated');
  console.log('=================================');
  console.log(`  Environment: ${envVars.NODE_ENV}`);
  console.log(`  Port: ${envVars.PORT}`);
  console.log(`  Database: ${envVars.MONGODB_URI ? 'Connected ✓' : 'Not configured ✗'}`);
  console.log(`  Frontend: ${envVars.FRONTEND_URL}`);
  console.log(`  Clerk: ${envVars.CLERK_PUBLISHABLE_KEY ? 'Configured ✓' : 'Not configured ✗'}`);
  console.log('=================================\n');
}

/**
 * Export validated environment variables
 * Import these in other modules instead of using process.env directly
 */
export default envVars;

/**
 * Helper function to get a required environment variable
 * Throws error if variable is not set
 */
export const getRequiredEnv = (varName) => {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
  return value;
};

/**
 * Helper function to get an optional environment variable with default
 */
export const getOptionalEnv = (varName, defaultValue = null) => {
  return process.env[varName] || defaultValue;
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = () => envVars.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = () => envVars.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = () => envVars.NODE_ENV === 'test';
