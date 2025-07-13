# 📋 Audit Summary for Staff Management

## 🔍 Overview
This document summarizes the audit logs and response data for the Staff Management system. It is intended for integration with the front-end team.

---

## 📝 Audit Logs

### **1. Staff Creation**
**Endpoint:** `POST /staff`

**Audit Log:**
```json
{
  "action": "CREATE",
  "entityType": "Staff",
  "entityId": "staff_id",
  "context": {
    "source": "StaffController.create",
    "createdBy": "admin_id",
    "creationTime": "2025-07-14T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "สร้างพนักงานสำเร็จ พร้อมบัญชีผู้ใช้และสิทธิ์ในการเข้าสู่ระบบ",
  "data": {
    "id": "staff_id",
    "staffCode": "STF2507001",
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "email": "somchai@example.com",
    "role": "staff",
    "permissions": ["view_analytics", "manage_orders"],
    "department": "การขาย",
    "position": "พนักงานขาย",
    "createdAt": "2025-07-14T10:00:00Z",
    "updatedAt": "2025-07-14T10:00:00Z"
  },
  "note": "รหัสผ่านเริ่มต้น: StaffSTF2507001!"
}
```

---

### **2. Staff Login**
**Endpoint:** `POST /auth/login`

**Audit Log:**
```json
{
  "action": "LOGIN",
  "entityType": "Auth",
  "entityId": "auth_id",
  "context": {
    "source": "AuthService.login",
    "email": "somchai@example.com",
    "loginTime": "2025-07-14T10:05:00Z",
    "hasStaffProfile": true
  }
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "auth_id",
    "email": "somchai@example.com",
    "role": "staff",
    "createdAt": "2025-07-14T10:00:00Z",
    "updatedAt": "2025-07-14T10:00:00Z"
  },
  "staff": {
    "id": "staff_id",
    "staffCode": "STF2507001",
    "fullName": "สมชาย ใจดี",
    "role": "staff",
    "permissions": ["view_analytics", "manage_orders"],
    "department": "การขาย",
    "position": "พนักงานขาย",
    "createdAt": "2025-07-14T10:00:00Z",
    "updatedAt": "2025-07-14T10:00:00Z"
  }
}
```

---

### **3. Staff Deletion (Soft Delete)**
**Endpoint:** `DELETE /staff/:id`

**Audit Log:**
```json
{
  "action": "DELETE",
  "entityType": "Staff",
  "entityId": "staff_id",
  "context": {
    "source": "StaffController.remove",
    "deletedBy": "admin_id",
    "deletionTime": "2025-07-14T10:10:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "ลบพนักงานสำเร็จ",
  "data": {
    "id": "staff_id",
    "staffCode": "STF2507001"
  }
}
```

---

### **4. Password Reset**
**Endpoint:** `PATCH /staff/:id/reset-password`

**Audit Log:**
```json
{
  "action": "UPDATE",
  "entityType": "Auth",
  "entityId": "auth_id",
  "context": {
    "source": "StaffController.resetPassword",
    "updatedBy": "admin_id",
    "updateTime": "2025-07-14T10:15:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "รีเซ็ตรหัสผ่านสำเร็จ",
  "data": {
    "newPassword": "StaffSTF2507001!",
    "note": "กรุณาแจ้งรหัสผ่านใหม่ให้กับพนักงาน"
  }
}
```

---

### **5. Staff Permissions Check**
**Endpoint:** `GET /staff/my/permissions`

**Audit Log:**
```json
{
  "action": "READ",
  "entityType": "Staff",
  "entityId": "staff_id",
  "context": {
    "source": "StaffController.getMyPermissions",
    "requestedBy": "staff_id",
    "requestTime": "2025-07-14T10:20:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "ดึงข้อมูลสิทธิ์ของตัวเองสำเร็จ",
  "data": {
    "staff": {
      "id": "staff_id",
      "staffCode": "STF2507001",
      "name": "สมชาย ใจดี",
      "email": "somchai@example.com",
      "role": "staff",
      "department": "การขาย",
      "position": "พนักงานขาย"
    },
    "permissions": {
      "current": ["view_analytics", "manage_orders"],
      "total": 2,
      "hasSystemAccess": false,
      "hasAnalyticsAccess": true,
      "hasStaffAccess": true
    }
  }
}
```

---

## 🚀 Integration Notes
- Ensure the front-end displays audit logs and response data in a user-friendly format.
- Use the `note` field in responses to provide additional context to users.
- Handle JWT tokens securely and pass them in the `Authorization` header for API requests.

---

## 📞 Contact
For any questions or issues, contact the back-end team at `backend-team@example.com`. 
