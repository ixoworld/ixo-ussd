import fs from "fs";
import path from "path";
import { environmentSetup } from "./environment-setup.js";
import { messages as brandingMessages } from "../../constants/branding.js";

// Mock data interfaces
export interface MockUser {
  id: string;
  phoneNumber: string;
  pin?: string;
  mnemonic?: string;
  ixoAddress?: string;
  balance?: number;
  createdAt: string;
}

export interface MockTransaction {
  id: string;
  userId: string;
  type: "topup" | "purchase" | "transfer";
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface MockIxoAccount {
  address: string;
  balance: number;
  tokens: Array<{
    denom: string;
    amount: string;
  }>;
}

export interface MockData {
  users: MockUser[];
  transactions: MockTransaction[];
  ixoAccounts: MockIxoAccount[];
  sessions: Record<string, any>;
}

/**
 * Mock Database Service
 */
export class MockDatabaseService {
  private mockData: MockData;
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath =
      dataPath || path.join(process.cwd(), "src/test/fixtures/mock-data");
    this.mockData = this.loadMockData();
  }

  private loadMockData(): MockData {
    const defaultData: MockData = {
      users: [
        {
          id: "user-1",
          phoneNumber: "+1234567890",
          pin: "1234",
          mnemonic:
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
          ixoAddress: "ixo1mock123456789abcdef",
          balance: 1000,
          createdAt: new Date().toISOString(),
        },
      ],
      transactions: [],
      ixoAccounts: [
        {
          address: "ixo1mock123456789abcdef",
          balance: 1000,
          tokens: [{ denom: "uixo", amount: "1000000" }],
        },
      ],
      sessions: {},
    };

    try {
      const dataFile = path.join(this.dataPath, "mock-data.json");
      if (fs.existsSync(dataFile)) {
        const fileContent = fs.readFileSync(dataFile, "utf-8");
        return { ...defaultData, ...JSON.parse(fileContent) };
      }
    } catch (error) {
      console.warn("⚠️ Could not load mock data file, using defaults");
    }

    return defaultData;
  }

  private saveMockData(): void {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }

      const dataFile = path.join(this.dataPath, "mock-data.json");
      fs.writeFileSync(dataFile, JSON.stringify(this.mockData, null, 2));
    } catch (error) {
      console.warn("⚠️ Could not save mock data:", error);
    }
  }

  // User operations
  async findUserByPhoneNumber(phoneNumber: string): Promise<MockUser | null> {
    return (
      this.mockData.users.find(user => user.phoneNumber === phoneNumber) || null
    );
  }

  async createUser(userData: Partial<MockUser>): Promise<MockUser> {
    const user: MockUser = {
      id: `user-${Date.now()}`,
      phoneNumber: userData.phoneNumber!,
      pin: userData.pin,
      mnemonic: userData.mnemonic,
      ixoAddress: userData.ixoAddress,
      balance: userData.balance || 0,
      createdAt: new Date().toISOString(),
    };

    this.mockData.users.push(user);
    this.saveMockData();
    return user;
  }

  async updateUser(
    userId: string,
    updates: Partial<MockUser>
  ): Promise<MockUser | null> {
    const userIndex = this.mockData.users.findIndex(user => user.id === userId);
    if (userIndex === -1) return null;

    this.mockData.users[userIndex] = {
      ...this.mockData.users[userIndex],
      ...updates,
    };
    this.saveMockData();
    return this.mockData.users[userIndex];
  }

  // Transaction operations
  async createTransaction(
    transactionData: Partial<MockTransaction>
  ): Promise<MockTransaction> {
    const transaction: MockTransaction = {
      id: `tx-${Date.now()}`,
      userId: transactionData.userId!,
      type: transactionData.type!,
      amount: transactionData.amount!,
      status: transactionData.status || "pending",
      createdAt: new Date().toISOString(),
    };

    this.mockData.transactions.push(transaction);
    this.saveMockData();
    return transaction;
  }

  async getTransactionsByUser(userId: string): Promise<MockTransaction[]> {
    return this.mockData.transactions.filter(tx => tx.userId === userId);
  }

  // Session operations
  async setSession(sessionId: string, data: any): Promise<void> {
    this.mockData.sessions[sessionId] = data;
    this.saveMockData();
  }

  async getSession(sessionId: string): Promise<any> {
    return this.mockData.sessions[sessionId] || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    delete this.mockData.sessions[sessionId];
    this.saveMockData();
  }

  // Reset data
  async reset(): Promise<void> {
    this.mockData = {
      users: [],
      transactions: [],
      ixoAccounts: [],
      sessions: {},
    };
    this.saveMockData();
  }
}

/**
 * Mock IXO Service
 */
export class MockIxoService {
  private mockData: MockData;

  constructor() {
    // Share data with database service
    const dbService = new MockDatabaseService();
    this.mockData = (dbService as any).mockData;
  }

  async getBalance(address: string): Promise<number> {
    const account = this.mockData.ixoAccounts.find(
      acc => acc.address === address
    );
    return account?.balance || 0;
  }

  async getTokens(
    address: string
  ): Promise<Array<{ denom: string; amount: string }>> {
    const account = this.mockData.ixoAccounts.find(
      acc => acc.address === address
    );
    return account?.tokens || [];
  }

  async sendTokens(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const fromAccount = this.mockData.ixoAccounts.find(
      acc => acc.address === fromAddress
    );

    if (!fromAccount || fromAccount.balance < amount) {
      return {
        success: false,
        error: "Insufficient balance",
      };
    }

    // Update balances
    fromAccount.balance -= amount;

    let toAccount = this.mockData.ixoAccounts.find(
      acc => acc.address === toAddress
    );
    if (!toAccount) {
      toAccount = {
        address: toAddress,
        balance: amount,
        tokens: [{ denom: "uixo", amount: (amount * 1000000).toString() }],
      };
      this.mockData.ixoAccounts.push(toAccount);
    } else {
      toAccount.balance += amount;
    }

    return {
      success: true,
      txHash: `mock-tx-${Date.now()}`,
    };
  }

  async createAccount(): Promise<{
    address: string;
    mnemonic: string;
  }> {
    const mockAddress = `ixo1mock${Date.now()}`;
    const mockMnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    // Add to mock accounts
    this.mockData.ixoAccounts.push({
      address: mockAddress,
      balance: 0,
      tokens: [],
    });

    return {
      address: mockAddress,
      mnemonic: mockMnemonic,
    };
  }
}

/**
 * Mock Matrix Service
 */
export class MockMatrixService {
  private rooms: Map<string, any> = new Map();

  async sendMessage(
    roomId: string,
    message: string
  ): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { messages: [] });
    }

    const room = this.rooms.get(roomId);
    const eventId = `$mock-event-${Date.now()}`;

    room.messages.push({
      eventId,
      message,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      eventId,
    };
  }

  async createRoom(name: string): Promise<{
    success: boolean;
    roomId?: string;
    error?: string;
  }> {
    const roomId = `!mock-room-${Date.now()}:matrix.org`;

    this.rooms.set(roomId, {
      name,
      messages: [],
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      roomId,
    };
  }

  async getRoomMessages(roomId: string): Promise<any[]> {
    const room = this.rooms.get(roomId);
    return room?.messages || [];
  }
}

/**
 * Mock Service Factory
 */
export class MockServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getDatabaseService(): MockDatabaseService {
    if (!this.instances.has("database")) {
      const config = environmentSetup.getCurrentConfig();
      this.instances.set(
        "database",
        new MockDatabaseService(config.mockDataPath)
      );
    }
    return this.instances.get("database");
  }

  static getIxoService(): MockIxoService {
    if (!this.instances.has("ixo")) {
      this.instances.set("ixo", new MockIxoService());
    }
    return this.instances.get("ixo");
  }

  static getMatrixService(): MockMatrixService {
    if (!this.instances.has("matrix")) {
      this.instances.set("matrix", new MockMatrixService());
    }
    return this.instances.get("matrix");
  }

  static reset(): void {
    // Reset all mock services
    const dbService = this.getDatabaseService();
    dbService.reset();

    this.instances.clear();
    console.log("🔄 All mock services reset");
  }
}

/**
 * Mock USSD Handler for testing
 */
export class MockUssdHandler {
  private dbService: MockDatabaseService;
  private ixoService: MockIxoService;
  private matrixService: MockMatrixService;

  constructor() {
    this.dbService = MockServiceFactory.getDatabaseService();
    this.ixoService = MockServiceFactory.getIxoService();
    this.matrixService = MockServiceFactory.getMatrixService();
  }

  async handleUssdRequest(
    input: string,
    sessionId: string,
    phoneNumber: string,
    serviceCode: string
  ): Promise<string> {
    try {
      // Get or create session
      let session = await this.dbService.getSession(sessionId);
      if (!session) {
        session = {
          phoneNumber,
          serviceCode,
          state: "welcome",
          data: {},
        };
        await this.dbService.setSession(sessionId, session);
      }

      // Handle based on current state and input
      return await this.processUssdFlow(input, session, sessionId);
    } catch (error) {
      console.error("Mock USSD Handler error:", error);
      return "END An error occurred. Please try again.";
    }
  }

  private async processUssdFlow(
    input: string,
    session: any,
    sessionId: string
  ): Promise<string> {
    switch (session.state) {
      case "welcome":
        return this.handleWelcome(input, session, sessionId);

      case "know_more":
        return this.handleKnowMore(input, session, sessionId);

      case "purchase":
        return this.handlePurchase(input, session, sessionId);

      case "top_up":
        return this.handleTopUp(input, session);

      case "report_fault":
        return this.handleReportFault(input);

      default:
        return "END Invalid session state.";
    }
  }

  private async handleWelcome(
    input: string,
    session: any,
    sessionId: string
  ): Promise<string> {
    if (input === "") {
      return `CON ${brandingMessages.welcome}\n1. Know More\n2. Purchase\n3. Top Up Balance\n4. Report Fault`;
    }

    switch (input) {
      case "1":
        session.state = "know_more";
        await this.dbService.setSession(sessionId, session);
        return "CON Know More\n1. About Example\n2. How it works\n3. Contact us\n0. Back";

      case "2":
        session.state = "purchase";
        await this.dbService.setSession(sessionId, session);
        return "CON Purchase\n1. Solar Panel\n2. Battery\n3. Inverter\n0. Back";

      case "3":
        session.state = "top_up";
        await this.dbService.setSession(sessionId, session);
        return "CON Top Up Balance\nEnter amount:";

      case "4":
        session.state = "report_fault";
        await this.dbService.setSession(sessionId, session);
        return "CON Report Fault\nDescribe the issue:";

      default:
        return "END Invalid option. Thank you.";
    }
  }

  private async handleKnowMore(
    input: string,
    session: any,
    sessionId: string
  ): Promise<string> {
    switch (input) {
      case "1":
        return "END Example provides solar energy solutions for rural communities.";
      case "2":
        return "END Our system uses blockchain technology to enable transparent energy trading.";
      case "3":
        return "END Contact us at support@example.com or call +123456789.";
      case "0":
        session.state = "welcome";
        await this.dbService.setSession(sessionId, session);
        return `CON ${brandingMessages.welcome}\n1. Know More\n2. Purchase\n3. Top Up Balance\n4. Report Fault`;
      default:
        return "END Invalid option. Thank you.";
    }
  }

  private async handlePurchase(
    input: string,
    session: any,
    sessionId: string
  ): Promise<string> {
    switch (input) {
      case "1":
        return "END Solar Panel - $500. Transaction initiated.";
      case "2":
        return "END Battery - $200. Transaction initiated.";
      case "3":
        return "END Inverter - $300. Transaction initiated.";
      case "0":
        session.state = "welcome";
        await this.dbService.setSession(sessionId, session);
        return `CON ${brandingMessages.welcome}\n1. Know More\n2. Purchase\n3. Top Up Balance\n4. Report Fault`;
      default:
        return "END Invalid option. Thank you.";
    }
  }

  private async handleTopUp(input: string, session: any): Promise<string> {
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      return "END Invalid amount. Please try again.";
    }

    // Mock top-up process
    const user = await this.dbService.findUserByPhoneNumber(
      session.phoneNumber
    );
    if (user) {
      await this.dbService.updateUser(user.id, {
        balance: (user.balance || 0) + amount,
      });
      await this.dbService.createTransaction({
        userId: user.id,
        type: "topup",
        amount,
        status: "completed",
      });
    }

    return `END Top-up of $${amount} successful. Thank you!`;
  }

  private async handleReportFault(input: string): Promise<string> {
    if (input.length < 10) {
      return "END Description too short. Please provide more details.";
    }

    // Mock fault report
    return `END Fault reported: "${input}". Reference: FR${Date.now()}. We will contact you soon.`;
  }
}

// Export singleton instances
export const mockServiceFactory = MockServiceFactory;
export const mockUssdHandler = new MockUssdHandler();
