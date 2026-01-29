/**
 * Swagger API Documentation Configuration
 *
 * OpenAPI/Swagger specification for manageRTC API
 * Auto-generates interactive API documentation
 *
 * @module backend/swagger
 * @see {@link https://swagger.io/specification/}
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger Options
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'manageRTC API',
      version: '1.0.0',
      description: `
        **manageRTC** - Complete HRMS, Project Management, and CRM Platform

        ## Features
        - **Employee Management**: Complete employee lifecycle management
        - **Attendance Tracking**: Real-time attendance with overtime calculation
        - **Leave Management**: Leave requests, approvals, and balance tracking
        - **Payroll Processing**: Automated salary calculation and payslip generation
        - **Project Management**: Project and task tracking with time logging
        - **CRM**: Lead, deal, and customer management
        - **Performance**: Goals, appraisals, and reviews

        ## Authentication
        Most endpoints require authentication via Clerk JWT tokens.
        Include the token in the Authorization header:
        \`Authorization: Bearer <token>\`

        ## Multi-Tenancy
        All requests must include the \`companyId\` header for data isolation.
        The system ensures complete data segregation between companies.

        ## Rate Limiting
        API requests are rate-limited based on user role and plan.

        ## Support
        For API support, contact: support@manage-rtc.com
      `,
      contact: {
        name: 'manageRTC API Support',
        email: 'support@manage-rtc.com',
        url: 'https://manage-rtc.com/support'
      },
      license: {
        name: 'Proprietary',
        url: 'https://manage-rtc.com/terms'
      }
    },
    servers: [
      {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://apidev.manage-rtc.com',
        description: 'Staging API server'
      },
      {
        url: 'https://api.manage-rtc.com',
        description: 'Production API server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication using Clerk tokens'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['error', 'fail'],
              description: 'Response status'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that caused the error'
                  },
                  message: {
                    type: 'string',
                    description: 'Error message for the field'
                  }
                }
              },
              description: 'Array of validation errors'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
            type: 'string',
              enum: ['success', 'ok'],
              description: 'Response status'
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Array of results'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  description: 'Current page number'
                },
                limit: {
                  type: 'number',
                  description: 'Number of items per page'
                },
                total: {
                  type: 'number',
                  description: 'Total number of items'
                },
                totalPages: {
                  type: 'number',
                  description: 'Total number of pages'
                }
              }
            }
          }
        },
        Employee: {
          type: 'object',
          required: ['employeeId', 'companyId', 'firstName', 'lastName', 'email', 'joiningDate'],
          properties: {
            employeeId: {
              type: 'string',
              description: 'Unique employee identifier'
            },
            companyId: {
              type: 'string',
              description: 'Company/tenant identifier'
            },
            firstName: {
              type: 'string',
              description: 'First name'
            },
            lastName: {
              type: 'string',
              description: 'Last name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
              description: 'Gender'
            },
            joiningDate: {
              type: 'string',
              format: 'date',
              description: 'Date when employee joined'
            },
            employmentStatus: {
              type: 'string',
              enum: ['Active', 'Probation', 'Notice Period', 'Resigned', 'Terminated', 'On Leave'],
              description: 'Current employment status'
            },
            employmentType: {
              type: 'string',
              enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
              description: 'Type of employment'
            },
            departmentId: {
              type: 'string',
              description: 'Department ID'
            },
            designationId: {
              type: 'string',
              description: 'Designation ID'
            },
            salary: {
              type: 'object',
              properties: {
                basic: {
                  type: 'number',
                  description: 'Basic salary'
                },
                hra: {
                  type: 'number',
                  description: 'House Rent Allowance'
                },
                allowances: {
                  type: 'number',
                  description: 'Other allowances'
                }
              }
            },
            leaveBalance: {
              type: 'object',
              properties: {
                casual: { type: 'number' },
                sick: { type: 'number' },
                earned: { type: 'number' },
                compOff: { type: 'number' }
              }
            }
          }
        },
        Attendance: {
          type: 'object',
          required: ['attendanceId', 'companyId', 'employeeId', 'date'],
          properties: {
            attendanceId: {
              type: 'string',
              description: 'Unique attendance record identifier'
            },
            companyId: {
              type: 'string',
              description: 'Company/tenant identifier'
            },
            employeeId: {
              type: 'string',
              description: 'Employee ID'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Attendance date'
            },
            clockIn: {
              type: 'string',
              description: 'Clock in time (ISO 8601)'
            },
            clockOut: {
              type: 'string',
              description: 'Clock out time (ISO 8601)'
            },
            workHours: {
              type: 'number',
              description: 'Total hours worked'
            },
            status: {
              type: 'string',
              enum: ['Present', 'Absent', 'Half Day', 'On Leave'],
              description: 'Attendance status'
            }
          }
        },
        Leave: {
          type: 'object',
          required: ['leaveId', 'companyId', 'employeeId', 'fromDate', 'toDate', 'numberOfDays'],
          properties: {
            leaveId: {
              type: 'string',
              description: 'Unique leave identifier'
            },
            companyId: {
              type: 'string',
              description: 'Company/tenant identifier'
            },
            employeeId: {
              type: 'string',
              description: 'Employee ID'
            },
            leaveTypeId: {
              type: 'string',
              description: 'Leave type ID'
            },
            fromDate: {
              type: 'string',
              format: 'date',
              description: 'Leave start date'
            },
            toDate: {
              type: 'string',
              format: 'date',
              description: 'Leave end date'
            },
            numberOfDays: {
              type: 'number',
              description: 'Number of leave days'
            },
            reason: {
              type: 'string',
              description: 'Reason for leave'
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
              default: 'Pending',
              description: 'Leave request status'
            }
          }
        },
        Payroll: {
          type: 'object',
          required: ['payrollId', 'companyId', 'employeeId', 'month', 'year'],
          properties: {
            payrollId: {
              type: 'string',
              description: 'Unique payroll identifier'
            },
            companyId: {
              type: 'string',
              description: 'Company/tenant identifier'
            },
            employeeId: {
              type: 'string',
              description: 'Employee ID'
            },
            month: {
              type: 'number',
              minimum: 1,
              maximum: 12,
              description: 'Month (1-12)'
            },
            year: {
              type: 'number',
              minimum: 2020,
              maximum: 2099,
              description: 'Year'
            },
            earnings: {
              type: 'object',
              properties: {
                basicSalary: { type: 'number' },
                hra: { type: 'number' },
                dearnessAllowance: { type: 'number' },
                conveyanceAllowance: { type: 'number' },
                medicalAllowance: { type: 'number' },
                overtime: { type: 'number' },
                bonus: { type: 'number' }
              }
            },
            deductions: {
              type: 'object',
              properties: {
                professionalTax: { type: 'number' },
                tds: { type: 'number' },
                providentFund: { type: 'number' },
                esi: { type: 'number' }
              }
            },
            grossSalary: {
              type: 'number',
              description: 'Total earnings before deductions'
            },
            totalDeductions: {
              type: 'number',
              description: 'Total deductions'
            },
            netSalary: {
              type: 'number',
              description: 'Take-home pay'
            },
            status: {
              type: 'string',
              enum: ['Draft', 'Generated', 'Approved', 'Paid', 'Rejected', 'Cancelled'],
              default: 'Draft'
            }
          }
        },
        Project: {
          type: 'object',
          required: ['projectId', 'companyId', 'name', 'startDate', 'dueDate'],
          properties: {
            projectId: {
              type: 'string',
              description: 'Unique project identifier'
            },
            companyId: {
              type: 'string',
              description: 'Company/tenant identifier'
            },
            name: {
              type: 'string',
              description: 'Project name'
            },
            description: {
              type: 'string',
              description: 'Project description'
            },
            client: {
              type: 'string',
              description: 'Client name'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Project start date'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Project due date'
            },
            priority: {
              type: 'string',
              enum: ['High', 'Medium', 'Low'],
              default: 'Medium'
            },
            status: {
              type: 'string',
              enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
              default: 'Active'
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 0
            }
          }
        },
        Task: {
          type: 'object',
          required: ['projectId', 'title'],
          properties: {
            title: {
              type: 'string',
              description: 'Task title'
            },
            description: {
              type: 'string',
              description: 'Task description'
            },
            projectId: {
              type: 'string',
              description: 'Project ID'
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Inprogress', 'Completed', 'Onhold'],
              default: 'Pending'
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High'],
              default: 'Medium'
            },
            assignee: {
              type: 'array',
              items: { type: 'string' },
              description: 'Assigned employee IDs'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Task due date'
            }
          }
        },
        Deal: {
          type: 'object',
          required: ['name', 'stage', 'status', 'dealValue'],
          properties: {
            name: {
              type: 'string',
              description: 'Deal name'
            },
            stage: {
              type: 'string',
              enum: ['New', 'Prospect', 'Proposal', 'Won', 'Lost']
            },
            status: {
              type: 'string',
              enum: ['Won', 'Lost', 'Open']
            },
            dealValue: {
              type: 'number',
              description: 'Deal value'
            },
            expectedClosedDate: {
              type: 'string',
              format: 'date',
              description: 'Expected close date'
            }
          }
        }
      },
      parameters: {
        companyId: {
          name: 'companyId',
          in: 'header',
          description: 'Company/tenant identifier',
          required: true,
          schema: {
            type: 'string'
          }
        },
        page: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        search: {
          name: 'search',
          in: 'query',
          description: 'Search term for filtering results',
          schema: {
            type: 'string'
          }
        },
        sortBy: {
          name: 'sortBy',
          in: 'query',
          description: 'Sort field',
          schema: {
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'name', 'date']
          }
        },
        sortOrder: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          schema: {
            type: 'string',
            enum: ['asc', 'desc']
          }
        },
        month: {
          name: 'month',
          in: 'query',
          description: 'Month (1-12)',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 12
          }
        },
        year: {
          name: 'year',
          in: 'query',
          description: 'Year (2020-2099)',
          schema: {
            type: 'integer',
            minimum: 2020,
            maximum: 2099
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ],
      tags: [
        {
          name: 'Health',
          description: 'Health check and monitoring endpoints'
        },
        {
          name: 'Employees',
          description: 'Employee management endpoints'
        },
        {
          name: 'Attendance',
          description: 'Attendance tracking endpoints'
        },
        {
          name: 'Leave',
          description: 'Leave management endpoints'
        },
        {
          name: 'Payroll',
          description: 'Payroll processing endpoints'
        },
        {
          name: 'Projects',
          description: 'Project management endpoints'
        },
        {
          name: 'Tasks',
          description: 'Task management endpoints'
        },
        {
          name: 'Deals',
          description: 'CRM/Deal management endpoints'
        }
      ]
    },
    apis: [
      './routes/**/*.js',
      './controllers/**/*.js'
    ]
  }
};

/**
 * Export Swagger spec and UI middleware
 */
export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup;

/**
 * Swagger documentation endpoint (for manual setup if needed)
 */
export const setupSwagger = (app) => {
  // Serve swagger documentation
  app.use('/api-docs', swaggerUiServe, swaggerUiSetup(swaggerSpec));

  // JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default setupSwagger;
