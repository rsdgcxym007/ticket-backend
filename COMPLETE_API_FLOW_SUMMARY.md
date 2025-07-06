# 🎯 Complete API Flow Summary

## 📋 Executive Summary

This document provides a comprehensive overview of all API endpoints, data flows, and integration patterns for the ticketing system backend. It serves as a complete reference for AI bots, frontend developers, and system integrators.

## 🔗 API Endpoints Overview

### 1. Order Management (`/api/orders`)
- **POST** `/api/orders` - Create new order (standing or seated)
- **GET** `/api/orders` - Get orders with pagination and filtering
- **GET** `/api/orders/:id` - Get specific order details
- **PATCH** `/api/orders/:id/status` - Update order status

### 2. Payment Processing (`/api/payments`)
- **POST** `/api/payments/standing` - Create standing ticket payment
- **POST** `/api/payments/seated` - Create seated ticket payment
- **POST** `/api/payments` - Legacy payment endpoint (backward compatible)
- **POST** `/api/payments/:id/slip` - Upload payment slip
- **GET** `/api/payments/:id` - Get payment details
- **GET** `/api/payments` - Get payments with pagination

### 3. Dashboard Analytics (`/api/dashboard`)
- **GET** `/api/dashboard/stats` - Get overall statistics
- **GET** `/api/dashboard/revenue` - Get revenue analytics
- **GET** `/api/dashboard/occupancy` - Get seat occupancy data
- **GET** `/api/dashboard/performance` - Get performance metrics
- **GET** `/api/dashboard/referrers` - Get referrer analytics
- **GET** `/api/dashboard/activities` - Get recent activities
- **GET** `/api/dashboard/alerts` - Get system alerts

### 4. Authentication (`/api/auth`)
- **GET** `/api/auth/google` - Google OAuth login
- **GET** `/api/auth/facebook` - Facebook OAuth login
- **GET** `/api/auth/line` - LINE OAuth login
- **GET** `/api/auth/profile` - Get user profile

### 5. Referrer Management (`/api/referrers`)
- **GET** `/api/referrers` - Get all referrers
- **POST** `/api/referrers` - Create new referrer
- **PUT** `/api/referrers/:id` - Update referrer

### 6. Seat Management (`/api/seats`)
- **GET** `/api/seats/available` - Get available seats
- **POST** `/api/seats/reserve` - Reserve seats

### 7. Upload & OCR (`/api/upload`, `/api/ocr`)
- **POST** `/api/upload` - Upload files
- **POST** `/api/ocr/process` - Process OCR

### 8. Mobile API (`/api/mobile`)
- **GET** `/api/mobile/config` - Get mobile configuration
- **POST** `/api/mobile/orders` - Create mobile orders

## 🎯 Complete User Journey Flows

### Flow 1: Standing Ticket Purchase
```
1. Create Order → POST /api/orders
2. Create Payment → POST /api/payments/standing
3. Upload Slip → POST /api/payments/:id/slip
4. Check Status → GET /api/orders/:id
5. Confirm Payment → PATCH /api/orders/:id/status
```

### Flow 2: Seated Ticket Purchase
```
1. Check Availability → GET /api/seats/available
2. Reserve Seats → POST /api/seats/reserve
3. Create Order → POST /api/orders
4. Create Payment → POST /api/payments/seated
5. Upload Slip → POST /api/payments/:id/slip
6. Confirm Payment → PATCH /api/orders/:id/status
```

### Flow 3: Admin Dashboard Monitoring
```
1. Login → GET /api/auth/google
2. Get Overview → GET /api/dashboard/stats
3. View Revenue → GET /api/dashboard/revenue
4. Check Occupancy → GET /api/dashboard/occupancy
5. Monitor Activities → GET /api/dashboard/activities
6. Handle Alerts → GET /api/dashboard/alerts
```

### Flow 4: Mobile App Integration
```
1. Get Config → GET /api/mobile/config
2. Create Order → POST /api/mobile/orders
3. Upload Slip → POST /api/payments/:id/slip
4. Track Status → GET /api/orders/:id
```

## 📊 Data Models & Schemas

### Order Schema
```typescript
interface Order {
  id: string;
  ticketType: 'STANDING' | 'SEATED';
  standingAdultQty?: number;
  standingChildQty?: number;
  standingTotal?: number;
  standingCommission?: number;
  seatNumbers?: string[];
  zoneId?: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  showDate: string;
  paymentMethod: string;
  referrerCode?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Payment Schema
```typescript
interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  slipUrl?: string;
  commission?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Dashboard Stats Schema
```typescript
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  standingTickets: number;
  seatedTickets: number;
  averageOrderValue: number;
  conversionRate: number;
}
```

## 🔧 Technical Implementation

### Authentication Headers
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "customerEmail",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🎨 Frontend Integration Examples

### React Hook for Orders
```javascript
const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const createOrder = async (orderData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      const result = await response.json();
      if (result.success) {
        setOrders(prev => [...prev, result.data]);
      }
      return result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { orders, loading, createOrder };
};
```

### Vue Composable for Dashboard
```javascript
import { ref, computed } from 'vue';

export function useDashboard() {
  const stats = ref({});
  const revenue = ref([]);
  const loading = ref(false);

  const fetchStats = async () => {
    loading.value = true;
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      stats.value = data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      loading.value = false;
    }
  };

  const totalRevenue = computed(() => stats.value.totalRevenue || 0);
  const conversionRate = computed(() => stats.value.conversionRate || 0);

  return {
    stats,
    revenue,
    loading,
    fetchStats,
    totalRevenue,
    conversionRate
  };
}
```

## 📱 Mobile Integration

### React Native Service
```javascript
class TicketService {
  static baseURL = 'https://api.yourapp.com';
  
  static async createOrder(orderData) {
    const response = await fetch(`${this.baseURL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
  
  static async uploadSlip(paymentId, imageUri) {
    const formData = new FormData();
    formData.append('slip', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'slip.jpg'
    });
    
    const response = await fetch(`${this.baseURL}/api/payments/${paymentId}/slip`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.json();
  }
}
```

### Flutter Integration
```dart
class TicketAPI {
  static const baseUrl = 'https://api.yourapp.com';
  
  static Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/orders'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode(orderData),
    );
    return jsonDecode(response.body);
  }
  
  static Future<Map<String, dynamic>> uploadSlip(String paymentId, File imageFile) async {
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/payments/$paymentId/slip'));
    request.files.add(await http.MultipartFile.fromPath('slip', imageFile.path));
    var response = await request.send();
    return jsonDecode(await response.stream.bytesToString());
  }
}
```

## 🧪 Testing & Quality Assurance

### API Testing with Jest
```javascript
describe('Order API', () => {
  test('should create standing order', async () => {
    const orderData = {
      ticketType: 'STANDING',
      standingAdultQty: 2,
      standingChildQty: 1,
      customerName: 'Test User',
      customerPhone: '0812345678',
      customerEmail: 'test@example.com'
    };
    
    const response = await request(app)
      .post('/api/orders')
      .send(orderData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.standingTotal).toBe(4200);
  });
});
```

### Integration Testing
```javascript
describe('Payment Flow', () => {
  test('should complete standing ticket payment flow', async () => {
    // 1. Create order
    const order = await createOrder({
      ticketType: 'STANDING',
      standingAdultQty: 2,
      standingChildQty: 1
    });
    
    // 2. Create payment
    const payment = await createPayment({
      orderId: order.id,
      amount: order.totalAmount,
      paymentMethod: 'CREDIT_CARD'
    });
    
    // 3. Upload slip
    const slip = await uploadSlip(payment.id, mockImageFile);
    
    // 4. Verify order status
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe('CONFIRMED');
  });
});
```

## 📊 Performance & Monitoring

### Caching Strategy
```javascript
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

### Real-time Updates
```javascript
// WebSocket connection for real-time updates
const socket = io('ws://localhost:3000');

socket.on('order_created', (order) => {
  // Update UI with new order
  updateOrdersList(order);
});

socket.on('payment_confirmed', (payment) => {
  // Update payment status
  updatePaymentStatus(payment);
});

socket.on('dashboard_update', (stats) => {
  // Update dashboard metrics
  updateDashboardStats(stats);
});
```

## 🔐 Security Considerations

### API Security
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Input validation
const validateOrderData = (req, res, next) => {
  const { customerEmail, customerPhone } = req.body;
  
  if (!validator.isEmail(customerEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }
  
  if (!validator.isMobilePhone(customerPhone, 'th-TH')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone format'
    });
  }
  
  next();
};
```

### Data Protection
```javascript
// Sanitize sensitive data
const sanitizeUserData = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

// Encrypt sensitive fields
const encryptPaymentData = (paymentData) => {
  return {
    ...paymentData,
    cardNumber: encrypt(paymentData.cardNumber),
    cvv: encrypt(paymentData.cvv)
  };
};
```

## 🌍 Deployment & Environment

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ticketing

# Authentication
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-facebook-app-id
LINE_CHANNEL_ID=your-line-channel-id

# Payment Gateway
PAYMENT_GATEWAY_URL=https://payment.gateway.com
PAYMENT_API_KEY=your-payment-api-key

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-s3-bucket

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

### Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

## 📈 Monitoring & Analytics

### Health Check Endpoints
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

app.get('/health/database', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Metrics Collection
```javascript
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const orderCreatedCounter = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['ticket_type']
});
```

## 📋 API Collection Usage

The complete API collection is available in `api-collection.json` and can be imported into:

- **Postman**: File → Import → Upload Files
- **Thunder Client**: Collections → Import → Browse Files
- **Insomnia**: Import/Export → Import Data → From File

### Environment Variables for Testing
```json
{
  "baseUrl": "http://localhost:3000",
  "token": "your-jwt-token-here",
  "orderId": "order-123",
  "paymentId": "payment-456",
  "referrerId": "referrer-789"
}
```

This comprehensive guide provides everything needed for AI bot integration, frontend development, and system maintenance of the ticketing platform.
