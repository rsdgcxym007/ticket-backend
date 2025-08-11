# API Guide for Frontend Integration

## Authentication Endpoints

### Login
- **Method**: `POST`
- **URL**: `/auth/login`
- **Request Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "password123",
    "deviceInfo": {
      "deviceName": "iPhone 13",
      "ipAddress": "192.168.1.1"
    }
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "JWT_TOKEN",
    "expiresIn": 86400 // 1 day in seconds
  }
  ```

### Logout
- **Method**: `POST`
- **URL**: `/auth/logout`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Response**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### Logout All Devices
- **Method**: `POST`
- **URL**: `/auth/logout-all`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Response**:
  ```json
  {
    "message": "Logged out from all devices successfully"
  }
  ```

---

## Token Management on Frontend

### Storing the Token
- Store the `accessToken` received from `/auth/login` in `localStorage` or `sessionStorage` based on the application requirements.

### Setting a Timeout
- Use the `expiresIn` value from the login response to set a timeout for token expiration (e.g., 1 day).

### Checking Token Expiration
- Redirect the user to the login page if the token has expired.
- Use middleware or interceptors to validate the token before making API requests.

---

## Making Authenticated API Requests
- Add the following header to all requests that require authentication:
  ```json
  {
    "Authorization": "Bearer <JWT_TOKEN>"
  }
  ```

---

## Handling Token Expiration
- If a request returns a `401 Unauthorized` response:
  - Remove the stored token.
  - Redirect the user to the login page.

---

## Testing Checklist
- Test login and logout functionality on multiple devices.
- Verify token expiration after 1 day.
- Test the "Logout All Devices" functionality.

---

For further questions or clarifications, feel free to reach out to the backend team!
