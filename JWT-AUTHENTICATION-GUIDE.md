# 🔐 JWT Authentication Guide

## ✅ ปัญหาที่แก้ไขแล้ว

### 1. EntityMetadataNotFoundError สำหรับ Auth Entity
**ปัญหา:** TypeORM ไม่รู้จัก Auth entity
**แก้ไข:** เพิ่ม Auth entity ใน:
- `src/app.module.ts` - ใน TypeORM entities array
- `src/auth/auth.module.ts` - ใน TypeOrmModule.forFeature

### 2. JWT Secret Mismatch
**ปัญหา:** JWT secret ไม่ตรงกันระหว่าง JwtModule และ JwtStrategy
**แก้ไข:** ใช้ ConfigService สำหรับการจัดการ JWT secret ทั้งคู่

### 3. Authentication Flow ไม่ทำงาน
**ปัญหา:** หลังจาก login แล้วไม่สามารถเข้าถึง protected endpoints ได้
**แก้ไข:** แก้ไข JWT configuration และ secret management

## 🔧 การแก้ไขที่ทำ

### 1. อัปเดต `src/app.module.ts`
```typescript
// เพิ่ม Auth entity
entities: [
  User,
  Order,
  Seat,
  SeatBooking,
  Zone,
  Referrer,
  Payment,
  PaymentSlip,
  AuditLog,
  AppConfig,
  Auth, // ← เพิ่มบรรทัดนี้
],
```

### 2. อัปเดต `src/auth/auth.module.ts`
```typescript
// เพิ่ม TypeOrmModule.forFeature สำหรับ Auth
TypeOrmModule.forFeature([Auth]),

// ใช้ ConfigService สำหรับ JWT
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'myUltraSecretHash123'),
    signOptions: { expiresIn: '7d' },
  }),
  inject: [ConfigService],
}),
```

### 3. อัปเดต `src/auth/strategies/jwt.strategy.ts`
```typescript
// ใช้ ConfigService
constructor(private configService: ConfigService) {
  const secret = configService.get('JWT_SECRET') || 'myUltraSecretHash123';
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret,
  });
}
```

## 📋 วิธีใช้งาน

### 1. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin1234"}'
```

**Response:**
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. ใช้ JWT Token เพื่อเข้าถึง Protected Endpoints
```bash
# Get Profile
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get Users (Admin only)
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 ข้อมูล User Account สำหรับทดสอบ

### Admin Account
- **Email:** admin@example.com
- **Password:** admin1234
- **Role:** admin

### Staff Account
- **Email:** staff@example.com
- **Password:** staff1234
- **Role:** staff

### User Account
- **Email:** user@example.com
- **Password:** user1234
- **Role:** user

## 🔒 Protected Endpoints

### Authentication Required
- `GET /api/v1/auth/profile` - ได้ข้อมูล profile
- `GET /api/v1/users` - ดูรายชื่อผู้ใช้ (Admin/Staff)
- `POST /api/v1/orders` - สร้างคำสั่งซื้อ
- `GET /api/v1/orders` - ดูคำสั่งซื้อ
- `PATCH /api/v1/orders/:id` - แก้ไขคำสั่งซื้อ

### Admin Only
- `DELETE /api/v1/users/:id` - ลบผู้ใช้
- `POST /api/v1/users` - สร้างผู้ใช้ใหม่
- `GET /api/v1/analytics/*` - ดูรายงาน

## 🛠️ สำหรับ Frontend Integration

### 1. เก็บ JWT Token
```javascript
// หลังจาก login สำเร็จ
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await loginResponse.json();
localStorage.setItem('token', data.access_token);
```

### 2. ใช้ Token ในคำขอ API
```javascript
// ส่งคำขอพร้อม Authorization header
const response = await fetch('/api/v1/auth/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### 3. Handle Token Expiry
```javascript
// ตรวจสอบ token หมดอายุ
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

## ⚠️ Security Notes

1. **JWT Secret:** ใช้ environment variable `JWT_SECRET` ใน production
2. **Token Expiry:** Token หมดอายุใน 7 วัน
3. **HTTPS:** ใช้ HTTPS ใน production เสมอ
4. **Token Storage:** ใช้ httpOnly cookies แทน localStorage ใน production

## 🔍 Debugging Tips

1. **ตรวจสอบ Server Logs:** ดู console logs สำหรับ JWT errors
2. **ตรวจสอบ Token:** ใช้ [jwt.io](https://jwt.io) เพื่อ decode JWT
3. **ตรวจสอบ Headers:** ใช้ developer tools ดู Authorization header
4. **ตรวจสอบ Environment:** ตรวจสอบว่า JWT_SECRET ถูกต้อง

## ✅ Status: ✅ ทำงานได้แล้ว

ระบบ JWT Authentication ทำงานได้สมบูรณ์:
- ✅ Login ได้
- ✅ ได้ JWT Token 
- ✅ เข้าถึง Protected Endpoints ได้
- ✅ Role-based Access Control ทำงาน
- ✅ Token Validation ทำงาน

วันที่อัปเดต: 6 กรกฎาคม 2025
