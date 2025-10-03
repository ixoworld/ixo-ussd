# Getting Started with IXO USSD

Complete setup guide for development and production environments.

## 📋 Prerequisites

**Required Software:**

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://postgresql.org/download/)
- **pnpm** - Install with `npm install -g pnpm`

**System Requirements:**

- 4GB RAM minimum
- 10GB disk space
- Internet connection for dependencies

## 🗄️ Database Setup

**1. Start PostgreSQL Service:**

```bash
# macOS with Homebrew
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Windows (WSL)
sudo service postgresql start
```

**2. Create Database and User:**

```bash
# Method 1: Using PostgreSQL superuser
sudo -u postgres psql
CREATE DATABASE "ixo-ussd-dev";
CREATE USER ixouser WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE "ixo-ussd-dev" TO ixouser;
\q

# Method 2: Use existing PostgreSQL user
# Just create the database with your existing credentials
```

## ⚙️ Environment Configuration

**1. Copy Example Configuration:**

```bash
cp env.example .env
```

**2. Edit Required Variables:**

```bash
# Database connection (update with your credentials)
DATABASE_URL=postgres://ixouser:secure-password@localhost:5432/ixo-ussd-dev

# Security key (generate with: openssl rand -hex 16)
PIN_ENCRYPTION_KEY=your-generated-32-character-key-here

# Logging level
LOG_LEVEL=debug
```

**3. Optional Configuration:**

```bash
# Development settings
NODE_ENV=development
PORT=3000

# USSD service codes (comma-separated)
ZM_SERVICE_CODES=*2233#,*123#

# IXO blockchain endpoints (defaults provided)
IXO_API_URL=https://api.ixo.world
IXO_BLOCKCHAIN_URL=https://rpc.ixo.world
```

## 🚀 Start Development

**1. Install Dependencies:**

```bash
pnpm install
```

**2. Run Database Migrations:**

```bash
pnpm build && node dist/src/migrations/run-migrations.js
```

**3. Start Server:**

```bash
pnpm dev
```

Server runs at `http://localhost:3000`

## 🧪 Test Your Setup

**Interactive USSD Test:**

```bash
pnpm test:interactive
```

**Test Flow:**

1. Press **Enter** (initial dial)
2. Type **1** (Know More menu)
3. Type **1** (Product information)
4. Type **0** (Back)
5. Type **\*** (Exit)

## 🔧 Environment Variables

### Required Variables

| Variable             | Description                         | Example                             |
| -------------------- | ----------------------------------- | ----------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string        | `postgres://user:pass@host:5432/db` |
| `PIN_ENCRYPTION_KEY` | 32-character key for PIN encryption | `abcd1234efgh5678ijkl9012mnop3456`  |
| `LOG_LEVEL`          | Logging level                       | `debug`, `info`, `warn`, `error`    |

### Optional Variables

| Variable             | Default                 | Description                          |
| -------------------- | ----------------------- | ------------------------------------ |
| `NODE_ENV`           | `development`           | Environment mode                     |
| `PORT`               | `3000`                  | Server port                          |
| `ZM_SERVICE_CODES`   | `*2233#`                | USSD service codes (comma-separated) |
| `IXO_API_URL`        | `https://api.ixo.world` | IXO API endpoint                     |
| `IXO_BLOCKCHAIN_URL` | `https://rpc.ixo.world` | IXO blockchain RPC                   |

## 🏗️ Project Structure

```
src/
├── machines/           # State machine definitions
│   └── example/        # Example USSD app
├── services/           # Core services (database, session)
├── routes/             # API endpoints
├── utils/              # Utility functions
└── config.ts           # Configuration management

docs/                   # Documentation
migrations/             # Database migrations
```

## 🎯 Next Steps

1. **Explore the Code**: Start with `src/machines/example/parentMachine.ts`
2. **Run Tests**: `pnpm test` to run the test suite
3. **Create Custom Machines**: Follow patterns in `src/machines/example/`
4. **Read Architecture Guide**: See `docs/ARCHITECTURE_PATTERNS_GUIDE.md`
5. **Study IXO Integration**: Check `src/services/ixo/` for blockchain services

## 🚨 Common Issues

**Database connection failed:**

- Start PostgreSQL: `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux)
- Check DATABASE_URL in `.env` matches your setup

**Port 3000 in use:**

- Kill process: `lsof -ti:3000 | xargs kill`
- Or change port: `echo "PORT=3001" >> .env`

**Missing environment variables:**

- Copy example: `cp env.example .env`
- Generate PIN key: `openssl rand -hex 16`
- Update IXO Feegrant Configuration to avoid errors related to IXO blockchain gas and fee payments:
  - `"error":"Failed to create IXO account: Account 'ixo1234...4321' does not exist on chain. Send some tokens there before trying to query sequence."`

**Migration failed:**

- Ensure database exists and user has permissions
- Run manually: `pnpm build && node dist/src/migrations/run-migrations.js`

## ❓ FAQ

**Can I use this without IXO blockchain?**
Yes! Remove IXO services and use as a generic USSD framework.

**What do these errors mean?**

- `"error":"Failed to create IXO account: Account 'ixo1234...4321' does not exist on chain. Send some tokens there before trying to query sequence."` Update the IXO Feegrant Configuration to avoid errors related to IXO blockchain gas and fee payments.

**How do I customize USSD menus?**
Edit state machines in `src/machines/example/` and branding in `src/constants/branding.ts`.

**How do I add multiple service codes?**
Set `ZM_SERVICE_CODES=*2233#,*123#` in `.env`.

**Is this production-ready?**
Yes, but use Redis for session storage and proper monitoring at scale.

**State machine not working?**

- Test in isolation: `pnpm tsx src/machines/example/information/knowMoreMachine-demo.ts`
- Check logs: `LOG_LEVEL=debug pnpm dev`

**TypeScript errors?**

- Check compilation: `pnpm tsc --noEmit`
- Fix imports: use `.js` extensions
- Run linter: `pnpm lint`

## 📚 What's Next?

- [API Reference](API.md) - USSD endpoints and integration
- [Architecture Guide](ARCHITECTURE_PATTERNS_GUIDE.md) - State machine patterns
- [State Machine Patterns](STATE_MACHINE_PATTERNS.md) - Development workflow

## 🆘 Need Help?

- [GitHub Issues](https://github.com/ixoworld/ixo-ussd/issues) for bugs and questions
- [GitHub Discussions](https://github.com/ixoworld/ixo-ussd/discussions) for discussion topics
- Run demo files: `pnpm tsx src/machines/example/information/knowMoreMachine-demo.ts`
- Check existing patterns in `src/machines/example/`

## 📚 Documentation Guide

- **Quick Start:** [README.md](../README.md) - Essential steps to get running
- **Complete Setup:** This guide - Detailed setup and configuration
- **API Reference:** [API.md](API.md) - Endpoints and integration examples
- **Architecture:** [ARCHITECTURE_PATTERNS_GUIDE.md](ARCHITECTURE_PATTERNS_GUIDE.md) - State machine patterns
- **Development:** [STATE_MACHINE_PATTERNS.md](STATE_MACHINE_PATTERNS.md) - Creating custom machines
