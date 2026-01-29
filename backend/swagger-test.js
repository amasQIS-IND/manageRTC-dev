import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'manageRTC API',
      version: '1.0.0'
    }
  },
  apis: ['./routes/**/*.js']
};

console.log('options.apis:', options.apis);
export const swaggerSpec = swaggerJsdoc(options);
