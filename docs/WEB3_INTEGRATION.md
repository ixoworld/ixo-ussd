# Web3 Integration Guide

## 🌐 How USSD Connects to Web3

The IXO USSD system bridges traditional mobile phones with Web3 infrastructure:

**Data Flow:**
```
USSD Input → State Machine → Database → IXO Blockchain → Verifiable Credentials
```

**Key Components:**

1. **Progressive Data Collection**:
   - Phone number → Customer profile → IXO identity → Blockchain wallet
   - Each step builds on the previous, allowing partial onboarding

2. **IXO Blockchain Integration**:
   - **DID Creation**: Each user gets a decentralized identifier
   - **Wallet Generation**: Blockchain accounts for transactions
   - **Credential Issuance**: Verifiable credentials for achievements/certifications

3. **Matrix Vault Storage**:
   - Secure, encrypted storage for sensitive data
   - Private keys and credentials stored safely
   - Accessible via Matrix protocol for interoperability

## Example Business Flows

**User Registration Flow:**
```
1. User dials *2233# → Account Menu → Create Account
2. Collects: Name, PIN, location data
3. Creates: Customer record, IXO DID, blockchain wallet
4. Issues: Basic identity credential
5. Stores: Encrypted data in Matrix vault
```

**Impact Verification Flow:**
```
1. User reports activity (e.g., tree planting)
2. System validates against business rules
3. Creates verifiable credential on IXO blockchain
4. Updates user's impact score/balance
5. Sends SMS confirmation with credential details
```

## Customizing for Your Use Case

**Environmental Impact Tracking:**
- Modify `src/machines/example/` for your specific activities
- Update database schema in `migrations/` for your data model
- Configure IXO blockchain endpoints for your network

**Supply Chain Verification:**
- Create state machines for product tracking
- Issue credentials for quality certifications
- Enable QR code generation for physical products

**Community Rewards:**
- Build point/token systems on IXO blockchain
- Create redemption flows through USSD
- Integrate with local payment systems

## Configuration for Different Networks

```bash
# IXO Mainnet (Production)
IXO_API_URL=https://api.ixo.world
IXO_BLOCKCHAIN_URL=https://rpc.ixo.world

# IXO Testnet (Development)
IXO_API_URL=https://api.testnet.ixo.world
IXO_BLOCKCHAIN_URL=https://rpc.testnet.ixo.world

# Custom IXO Network
IXO_API_URL=https://your-api.example.com
IXO_BLOCKCHAIN_URL=https://your-rpc.example.com
```
