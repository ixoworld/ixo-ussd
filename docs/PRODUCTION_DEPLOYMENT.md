
# 🚀 Production Deployment

## Environment Setup

**Production Environment Variables:**
```bash
# Required
NODE_ENV=production
DATABASE_URL=postgres://user:pass@prod-host:5432/ixo-ussd-prod
PIN_ENCRYPTION_KEY=your-secure-32-char-key-here
LOG_LEVEL=info

# Security
TRUST_PROXY_ENABLED=true
METRICS_ENABLED=true

# Optional
PORT=3000
ZM_SERVICE_CODES=*2233#,*123#
```

## Database Migration

```bash
# Build the application
pnpm build

# Run migrations in production
NODE_ENV=production node dist/src/migrations/run-migrations.js

# Start the server
NODE_ENV=production node dist/src/index.js
```

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
```

## Telecom Gateway Integration

**Africa's Talking Integration:**
```javascript
// Middleware to convert AT format
app.use('/ussd', (req, res, next) => {
  req.body = {
    sessionId: req.body.sessionId,
    serviceCode: req.body.serviceCode,
    phoneNumber: req.body.phoneNumber,
    text: req.body.text || ''
  };
  next();
});

// Proxy to IXO USSD
app.post('/ussd', async (req, res) => {
  const response = await fetch('http://ixo-ussd:3000/api/ussd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  const ussdResponse = await response.text();
  res.type('text/plain').send(ussdResponse);
});
```

**Generic Telecom Gateway:**
Most gateways send form data. Convert to JSON:
```javascript
app.use(express.urlencoded({ extended: true }));
app.post('/ussd-webhook', (req, res) => {
  const ussdRequest = {
    sessionId: req.body.session_id || req.body.sessionId,
    serviceCode: req.body.service_code || req.body.serviceCode,
    phoneNumber: req.body.phone_number || req.body.phoneNumber,
    text: req.body.text || req.body.input || ''
  };
  // Forward to IXO USSD server...
});
```

## Health Monitoring

**Health Check Endpoints:**
- `GET /health` - Application health
- `GET /metrics` - Prometheus metrics (if enabled)

**Monitoring Setup:**
```yaml
# docker-compose.yml monitoring
version: '3.8'
services:
  ixo-ussd:
    image: ixo-ussd:latest
    environment:
      - METRICS_ENABLED=true
    ports:
      - "3000:3000"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong PIN_ENCRYPTION_KEY (32+ characters)
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable request logging
- [ ] Set up database connection pooling
- [ ] Configure proper log levels
