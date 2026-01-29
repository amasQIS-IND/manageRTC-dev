/**
 * Swagger/OpenAPI Documentation Configuration
 * API Documentation for manageRTC REST APIs
 */

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'manageRTC REST API',
      version: '1.0.0',
      description: `
        REST API documentation for the manageRTC HRMS Platform.

        ## Authentication
        All API endpoints require authentication via Clerk JWT Bearer token.

        Include the token in the Authorization header:
        \`Authorization: Bearer <your_clerk_jwt_token>\`

        ## Features
        - Employee Management (11 endpoints)
        - Project Management (8 endpoints)
        - Task Management (9 endpoints)
        - Lead Management (11 endpoints)
        - Client Management (10 endpoints)
        - Attendance Management (10 endpoints)
        - Leave Management (10 endpoints)
        - Asset Management (8 endpoints)
        - Training Management (7 endpoints)
        - Activity Management (12 endpoints)
        - Pipeline Management (13 endpoints)
        - Holiday Types Management (6 endpoints)
        - Promotion Management (9 endpoints)

        **Total: 128 REST Endpoints**
      `,
      contact: {
        name: 'manageRTC Support',
        email: 'support@managertc.com',
        url: 'https://managertc.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.managertc.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Clerk JWT authentication token'
        }
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'object',
                  example: {}
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1
                },
                limit: {
                  type: 'number',
                  example: 20
                },
                total: {
                  type: 'number',
                  example: 150
                },
                totalPages: {
                  type: 'number',
                  example: 8
                }
              }
            }
          }
        },
        // Employee Schema
        Employee: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'dateOfJoining'],
          properties: {
            _id: {
              type: 'string',
              description: 'Employee unique identifier'
            },
            employeeId: {
              type: 'string',
              description: 'Generated employee ID (EMP-YYYY-NNNN)',
              example: 'EMP-2026-0001'
            },
            firstName: {
              type: 'string',
              description: 'First name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              description: 'Last name',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
              example: 'john.doe@company.com'
            },
            phone: {
              type: 'string',
              description: 'Phone number',
              example: '+1234567890'
            },
            department: {
              type: 'string',
              description: 'Department name',
              example: 'Engineering'
            },
            designation: {
              type: 'string',
              description: 'Job title/designation',
              example: 'Software Engineer'
            },
            manager: {
              type: 'string',
              description: 'Manager employee ID'
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive', 'OnLeave'],
              description: 'Employee status',
              example: 'Active'
            },
            dateOfJoining: {
              type: 'string',
              format: 'date',
              description: 'Date of joining',
              example: '2024-01-01'
            },
            salary: {
              type: 'number',
              description: 'Annual salary',
              example: 75000
            }
          }
        },
        // Project Schema
        Project: {
          type: 'object',
          required: ['name'],
          properties: {
            _id: {
              type: 'string'
            },
            name: {
              type: 'string',
              example: 'Website Redesign'
            },
            description: {
              type: 'string',
              example: 'Complete website redesign project'
            },
            status: {
              type: 'string',
              enum: ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
              example: 'In Progress'
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Critical'],
              example: 'High'
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 45
            },
            teamLeader: {
              type: 'string'
            },
            teamMembers: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        },
        // Task Schema
        Task: {
          type: 'object',
          required: ['title'],
          properties: {
            _id: {
              type: 'string'
            },
            title: {
              type: 'string',
              example: 'Design homepage'
            },
            description: {
              type: 'string'
            },
            project: {
              type: 'string'
            },
            assignee: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
              example: 'In Progress'
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Urgent'],
              example: 'High'
            },
            dueDate: {
              type: 'string',
              format: 'date'
            },
            estimatedHours: {
              type: 'number',
              example: 8
            },
            actualHours: {
              type: 'number',
              example: 6
            }
          }
        }
      },
      parameters: {
        // Common parameters
        pageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        searchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term',
          required: false,
          schema: {
            type: 'string'
          }
        },
        sortParam: {
          name: 'sortBy',
          in: 'query',
          description: 'Sort field',
          required: false,
          schema: {
            type: 'string'
          }
        },
        orderParam: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc'
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/api/*.js',
    './controllers/rest/*.js'
  ]
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi, options as swaggerUiOptions };
