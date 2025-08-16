import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  environment: string;
  apiVersion: string;
  domain: {
    frontend: string;
    backend: string;
    api: string;
  };
  cors: {
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
  };
  swagger: {
    enabled: boolean;
    path: string;
    title: string;
    description: string;
    version: string;
  };
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '4000', 10),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',

    domain: {
      frontend:
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://patongboxingstadiumticket.com'
          : 'http://localhost:3000'),
      backend:
        process.env.BACKEND_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://api.patongboxingstadiumticket.com'
          : 'http://localhost:4000'),
      api:
        process.env.API_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://api.patongboxingstadiumticket.com/api'
          : 'http://localhost:4000/api'),
    },

    cors: {
      origins: [
        // Production domains
        'https://patongboxingstadiumticket.com',
        'https://www.patongboxingstadiumticket.com',
        'https://api.patongboxingstadiumticket.com',

        // Development
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',

        // Server IP (existing)
        'http://43.229.133.51:3000',
        'http://43.229.133.51:4000',

        // Custom domains from environment
        ...(process.env.ADDITIONAL_CORS_ORIGINS?.split(',') || []),
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Allow-Origin',
      ],
      credentials: true,
    },

    swagger: {
      enabled: process.env.SWAGGER_ENABLED !== 'false',
      path: 'api/docs',
      title: '🎫 Patong Boxing Stadium Ticket System API',
      description: `
      ## 🥊 Patong Boxing Stadium - Complete Ticket Booking System
      
      Official API for Patong Boxing Stadium ticket booking and management system.
      
      ### 🌐 Domain Information
      - **Frontend**: https://patongboxingstadiumticket.com
      - **API**: https://api.patongboxingstadiumticket.com
      - **Documentation**: https://api.patongboxingstadiumticket.com/api/docs
      
      ### 🎯 Features
      - 🎟️ Ticket Booking & Management
      - 💳 Payment Processing (Cash, QR, Transfer)
      - 💺 Seat Management (VIP, Premium, Standing)
      - 📧 Automated Email Tickets
      - 📊 Analytics & Reporting
      - 🔐 Role-based Access Control
      - 🔍 Complete Audit Trail
      
      ### 🔑 Authentication
      Use JWT token in Authorization header: \`Bearer <your-jwt-token>\`
      
      ### 📱 Contact
      - **Email**: info@patongboxingstadiumticket.com
      - **Website**: https://patongboxingstadiumticket.com
    `,
      version: '1.0.0',
    },
  }),
);
