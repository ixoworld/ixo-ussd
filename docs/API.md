# API Reference

This document describes the IXO USSD server API endpoints and integration patterns.

## 🔌 USSD Endpoint

### POST `/api/ussd`

Main endpoint for USSD interactions. Handles session management and state machine processing.

**Request Format:**
```json
{
  "sessionId": "string",
  "serviceCode": "string",
  "phoneNumber": "string",
  "text": "string"
}
```

**Request Fields:**
- `sessionId` - Unique session identifier from telecom gateway
- `serviceCode` - USSD service code (e.g., "*2233#")
- `phoneNumber` - User's phone number in international format
- `text` - User input text (empty for initial dial)

**Response Format:**
```
CON Welcome to IXO USSD
1. Know More
2. Account Menu
*. Exit
```

**Response Types:**
- `CON` - Continue session (show menu, wait for input)
- `END` - End session (final message)

### Example Flow

**Initial Dial:**
```bash
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session123",
    "serviceCode": "*2233#",
    "phoneNumber": "+260971234567",
    "text": ""
  }'
```

Response:
```
CON Welcome to IXO USSD
1. Know More
2. Account Menu
*. Exit
```

**User Input:**
```bash
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session123",
    "serviceCode": "*2233#",
    "phoneNumber": "+260971234567",
    "text": "1"
  }'
```

Response:
```
CON Information Center
1. Interested in Product
2. Pricing & accessories
3. Can we deliver to you?
4. Can the product be fixed?
5. What is Performance?
6. What is a Digital Voucher?
7. What is a Contract?
```

## 🔍 Debug Endpoints

### GET `/api/ussd/debug/:sessionId`

Inspect session state for debugging.

**Response:**
```json
{
  "sessionId": "session123",
  "debugInfo": {
    "state": "preMenu",
    "context": {
      "sessionId": "session123",
      "phoneNumber": "+260971234567",
      "message": "Welcome to IXO USSD...",
      "isAuthenticated": false
    },
    "status": "active"
  },
  "activeSessions": ["session123", "session456"]
}
```

### GET `/api/ussd/sessions`

List all active sessions.

**Response:**
```json
{
  "activeSessions": ["session123", "session456"],
  "count": 2
}
```

## 🏥 Health Endpoints

### GET `/`

Basic health check for PaaS platforms.

**Response:**
```json
{
  "status": "ok",
  "message": "ixo-ussd-server running",
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/health`

Detailed health check with database status.

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

## 🔗 Integration Examples

### Telecom Gateway Integration

Most telecom USSD gateways send HTTP POST requests with form data:

```javascript
// Express.js middleware to convert form data to JSON
app.use('/api/ussd', (req, res, next) => {
  // Convert telecom gateway format to our API format
  const ussdRequest = {
    sessionId: req.body.sessionId || req.body.session_id,
    serviceCode: req.body.serviceCode || req.body.service_code,
    phoneNumber: req.body.phoneNumber || req.body.phone_number,
    text: req.body.text || req.body.input || ''
  };

  req.body = ussdRequest;
  next();
});
```

### Africa's Talking Integration

```javascript
// Africa's Talking format
const africasTalkingRequest = {
  sessionId: req.body.sessionId,
  serviceCode: req.body.serviceCode,
  phoneNumber: req.body.phoneNumber,
  text: req.body.text
};

// Forward to IXO USSD
const response = await fetch('http://localhost:3000/api/ussd', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(africasTalkingRequest)
});

const ussdResponse = await response.text();
res.type('text/plain').send(ussdResponse);
```

### Testing with curl

```bash
# Test complete flow
SESSION_ID="test-$(date +%s)"

# Initial dial
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"serviceCode\":\"*2233#\",\"phoneNumber\":\"+260971234567\",\"text\":\"\"}"

# Select option 1
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"serviceCode\":\"*2233#\",\"phoneNumber\":\"+260971234567\",\"text\":\"1\"}"

# Exit
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"serviceCode\":\"*2233#\",\"phoneNumber\":\"+260971234567\",\"text\":\"*\"}"
```

## 📋 Request Validation

The API validates all requests using Zod schemas:

**Phone Number:** International format (E.164)
- Valid: `+260971234567`, `+1234567890`
- Invalid: `0971234567`, `1234`

**Service Code:** USSD format
- Valid: `*2233#`, `*123*456#`
- Invalid: `2233`, `*2233`

**Text Input:** Max 182 characters (USSD limit)

**Session ID:** Max 100 characters

## ⚠️ Error Responses

**Validation Error:**
```
END Invalid input. Please try again.
```

**Server Error:**
```
END Service temporarily unavailable. Please try again later.
```

**Session Timeout:**
Sessions automatically expire after inactivity. New requests with expired session IDs create new sessions.

## 🔒 Security

- Rate limiting: 100 requests per minute per IP
- Input sanitization: All inputs are validated and sanitized
- PIN encryption: User PINs are encrypted using AES-256
- CORS protection: Configurable CORS headers
- Request logging: All requests are logged for monitoring

## 📊 Monitoring

The server provides metrics at `/metrics` (if enabled):
- Request count and duration
- Active session count
- Database connection status
- Memory and CPU usage