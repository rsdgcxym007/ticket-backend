# API Detailed Summary

## API Version
- **Version**: v1
- **Base URL**: `http://localhost:4000/api/v1`

## Endpoints

### 1. User Login
- **Path**: `/auth/login`
- **Method**: `POST`
- **Description**: User login with credentials
- **Request**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  }
  ```

### 2. User Registration
- **Path**: `/auth/register`
- **Method**: `POST`
- **Description**: User registration
- **Request**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  }
  ```

### 3. Fetch All Orders
- **Path**: `/orders`
- **Method**: `GET`
- **Description**: Fetch all orders
- **Request**:
  ```json
  {
    "status": "string (optional)"
  }
  ```
- **Response**:
  ```json
  [
    {
      "id": "string",
      "status": "string",
      "total": "number",
      "createdAt": "string"
    }
  ]
  ```

### 4. Fetch Order Details by ID
- **Path**: `/orders/{id}`
- **Method**: `GET`
- **Description**: Fetch order details by ID
- **Request**:
  ```json
  {
    "id": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "status": "string",
    "items": [
      {
        "productId": "string",
        "quantity": "number",
        "price": "number"
      }
    ],
    "total": "number",
    "createdAt": "string"
  }
  ```

### 5. Process Payment
- **Path**: `/payments`
- **Method**: `POST`
- **Description**: Process payment for an order
- **Request**:
  ```json
  {
    "orderId": "string",
    "paymentMethod": "string",
    "amount": "number"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Payment processed successfully",
    "paymentId": "string"
  }
  ```

### 6. Fetch Available Seats
- **Path**: `/seats`
- **Method**: `GET`
- **Description**: Fetch available seats
- **Request**:
  ```json
  {
    "eventId": "string (optional)"
  }
  ```
- **Response**:
  ```json
  [
    {
      "seatId": "string",
      "status": "string",
      "price": "number"
    }
  ]
  ```

### 7. Fetch Analytics Reports
- **Path**: `/analytics/reports`
- **Method**: `GET`
- **Description**: Fetch analytics reports
- **Request**:
  ```json
  {
    "type": "string (optional)"
  }
  ```
- **Response**:
  ```json
  [
    {
      "reportId": "string",
      "title": "string",
      "data": "object"
    }
  ]
  ```

### 8. Fetch Audit Logs
- **Path**: `/audit/logs`
- **Method**: `GET`
- **Description**: Fetch audit logs
- **Request**:
  ```json
  {
    "date": "string (optional)"
  }
  ```
- **Response**:
  ```json
  [
    {
      "logId": "string",
      "action": "string",
      "timestamp": "string"
    }
  ]
  ```

### 9. Fetch System Configuration Settings
- **Path**: `/config/settings`
- **Method**: `GET`
- **Description**: Fetch system configuration settings
- **Response**:
  ```json
  {
    "settings": {
      "key": "value"
    }
  }
  ```

### 10. Check Application Health
- **Path**: `/health`
- **Method**: `GET`
- **Description**: Check application health
- **Response**:
  ```json
  {
    "status": "healthy",
    "uptime": "number"
  }
  ```
