/**
 * Unified Types for the generic App Machine
 *
 * This file defines all context, event, and utility types for the unified
 * machine that combines IXO wallet functionality with generic business operations.
 */

// Import types from existing services
import type { AuthResponse } from "../../services/ixo/matrix.js";

/**
 * IXO Address Record - represents a blockchain address associated with a user
 */
export interface IxoAddress {
  address: string;
  ixo_did?: string;
  encrypted_mnemonic?: string;
  encrypted_matrix_username?: string;
  encrypted_matrix_password?: string;
  id?: number;
  user_id?: number;
  date_created?: string;
  date_changed?: string | null;
  encrypted_pin?: string;
  preferred_language?: string;
  last_completed_action?: string;
  last_menu_location?: string;
}

/**
 * User state tracking - tracks the user's progress through flows
 */
export interface UserState {
  hasIxoAccount: boolean;
  isWalletSetupComplete: boolean;
  isAgentLoggedIn: boolean;
  pinVerified?: boolean;
  rateLimited?: boolean;
}

/**
 * Balance information for IXO accounts
 */
export interface IxoBalance {
  ixo: string;
  native?: string;
}

/**
 * Transaction result information
 */
export interface TransactionResult {
  transactionHash?: string;
  success: boolean;
  error?: string;
  amount?: string;
  recipient?: string;
  timestamp?: string;
}

/**
 * IXO-specific context data
 * Contains all data related to blockchain wallet operations
 */
export interface IxoContextData {
  // User and account data
  addresses?: IxoAddress[];
  selectedAddress?: IxoAddress | string;

  // Authentication and session
  matrixSession?: AuthResponse;
  pin?: string;
  pinAttempts?: number;

  // Transaction data
  sendRecipient?: string;
  sendAmount?: string;
  sendResult?: TransactionResult;

  // Balance and account info
  balance?: string | IxoBalance;
  newDisplayName?: string;

  // Account management
  username?: string;
  displayName?: string;

  // Security and rate limiting
  lastActivityTimestamp?: string;
  dailyTransactionCount?: number;
  dailyTransactionVolume?: number;

  // Validation and errors
  validationError?: string;
  error?: string;
}

/**
 * App-specific context data
 * Contains all data related to business operations
 */
export interface AppContextData {
  // Basic user and wallet info
  user?: {
    phoneNumber: string;
    ixoAccount?: string;
  };

  // Agent management
  agentId?: string;
  agentPin?: string;

  // Location and service selection
  selectedProvince?: string;
  selectedArea?: string;
  selectedDistrict?: string;

  // Purchase and order management
  selectedBag?: string;
  selectedAccessory?: string;
  selectedContract?: string;
  selectedVoucher?: string;
  voucherType?: string;
  voucherAmount?: string;

  // Financial operations
  topUpAmount?: string;
  mobileMoneyNumber?: string;
  balance?: string;
  paymentMethod?: string;

  // Order tracking
  orderId?: string;
  orderStatus?: string;
  deliveryAddress?: string;
  orderType?: string;

  // Performance tracking
  usagePeriod?: string;
  savingsPeriod?: string;
  carbonPeriod?: string;
  totalUsage?: string;
  averageUsage?: string;
  moneySaved?: string;
  fuelSaved?: string;
  co2Saved?: string;
  treesEquivalent?: string;

  // Fault reporting
  faultDescription?: string;
  faultType?: string;
  faultStatus?: string;
  faultId?: string;

  // Contract management
  contracts?: {
    id: string;
    type: string;
    status: string;
    start: string;
    end: string;
    balance: string;
  }[];
  selectedContractIndex?: number;

  // Information and help
  selectedInfo?: string;
}

/**
 * Shared/temporary context data
 * Contains validation, error handling, and temporary processing data
 */
export interface TempContextData {
  // Validation and error handling
  validationError?: string;
  error?: string;

  // Attempt tracking
  pinAttempts?: number;
  loginAttempts?: number;

  // Navigation and flow control
  previousState?: string;
  returnToState?: string;
  targetFlow?: string;

  // Processing and rate limiting flags
  isProcessing?: boolean;
  rateLimited?: boolean;
  lastAction?: string;

  // Authentication and PIN management
  pinForVerification?: string;

  // Transaction data
  transactionAmount?: number;

  // Payment and mobile money
  mobileMoneyNumber?: string;
}

/**
 * Main context interface for the generic App Machine
 * Combines all sections: session metadata, user state, IXO data, app data, and temp data
 */
export interface AppTypesContext {
  // Session metadata
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  language: string;
  message: string;

  // User state tracking
  userState: UserState;

  // IXO-specific data
  ixo: IxoContextData;

  // App-specific data
  example: AppContextData;

  // Shared/temporary data
  temp: TempContextData;
}

/**
 * Event Types
 */

// Basic input event for USSD interactions
export interface InputEvent {
  type: "INPUT";
  input: string;
}

// Update event for session management
export interface UpdateEvent {
  type: "UPDATE";
  sessionId?: string;
  phoneNumber?: string;
  serviceCode?: string;
  language?: string;
  data?: Partial<AppTypesContext>;
}

// IXO-specific events
export interface IxoAccountCreatedEvent {
  type: "IXO_ACCOUNT_CREATED";
  address: string;
}

export interface IxoTransactionCompleteEvent {
  type: "IXO_TRANSACTION_COMPLETE";
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface MatrixLoginEvent {
  type: "MATRIX_LOGIN";
  authResponse: AuthResponse;
}

export interface PinVerifiedEvent {
  type: "PIN_VERIFIED";
  success: boolean;
  attemptsUsed: number;
}

export interface BalanceUpdatedEvent {
  type: "BALANCE_UPDATED";
  balance: string | IxoBalance;
  timestamp: string;
}

export interface AddressSelectedEvent {
  type: "ADDRESS_SELECTED";
  address: IxoAddress | string;
  addressIndex?: number;
}

export interface WalletVerifiedEvent {
  type: "WALLET_VERIFIED";
  walletId: string;
  isActive: boolean;
}

export interface OrderCreatedEvent {
  type: "ORDER_CREATED";
  orderId: string;
  orderType: string;
}

export interface AgentLoginEvent {
  type: "AGENT_LOGIN";
  agentId: string;
  success: boolean;
}

export interface PurchaseInitiatedEvent {
  type: "PURCHASE_INITIATED";
  productType: string;
  amount: string;
  paymentMethod: string;
}

export interface FaultReportedEvent {
  type: "FAULT_REPORTED";
  faultId: string;
  faultType: string;
  description: string;
}

// Flow control events
export interface FlowTransitionEvent {
  type: "FLOW_TRANSITION";
  fromFlow: string;
  toFlow: string;
  returnState?: string;
}

export interface MenuSelectionEvent {
  type: "MENU_SELECTION";
  menuLevel: string;
  selection: string;
  previousMenu?: string;
}

// Error and validation events
export interface ValidationErrorEvent {
  type: "VALIDATION_ERROR";
  error: string;
  field?: string;
}

export interface SystemErrorEvent {
  type: "SYSTEM_ERROR";
  error: string;
  recoverable: boolean;
}

export interface RateLimitExceededEvent {
  type: "RATE_LIMIT_EXCEEDED";
  limit: number;
  resetTime: string;
}

/**
 * Base event shape used across the machine.
 * Adds optional `input` and `output` to every event so that helper
 * actions can access these properties without needing to narrow the event type first.
 * This keeps runtime flexibility while preserving compile-time safety.
 */
interface BaseEvent {
  /** Raw user input captured from the USSD session */
  input?: string;
  /** Data returned from an invoked service (e.g. onDone output) */
  output?: unknown;
}

/** Utility helper to compose any event with the common BaseEvent fields */
type WithBase<T extends { type: string }> = T & BaseEvent;

/**
 * Union of all possible events
 */
export type ExampleWalletEvent =
  | WithBase<InputEvent>
  | WithBase<UpdateEvent>
  // IXO-specific events
  | WithBase<IxoAccountCreatedEvent>
  | WithBase<IxoTransactionCompleteEvent>
  | WithBase<MatrixLoginEvent>
  | WithBase<PinVerifiedEvent>
  | WithBase<BalanceUpdatedEvent>
  | WithBase<AddressSelectedEvent>
  | WithBase<OrderCreatedEvent>
  | WithBase<AgentLoginEvent>
  | WithBase<PurchaseInitiatedEvent>
  | WithBase<FaultReportedEvent>
  // Flow control events
  | WithBase<FlowTransitionEvent>
  | WithBase<MenuSelectionEvent>
  // Error and validation events
  | WithBase<ValidationErrorEvent>
  | WithBase<SystemErrorEvent>
  | WithBase<RateLimitExceededEvent>;

/**
 * State Machine Input - data passed when creating the machine actor
 */
export interface ExampleWalletInput {
  phoneNumber: string;
  sessionId?: string;
  serviceCode?: string;
  language?: string;
}

/**
 * Guard Function Types
 */
export type ContextGuard = (context: AppTypesContext) => boolean;
export type EventGuard = (event: ExampleWalletEvent) => boolean;
export type CombinedGuard = (
  context: AppTypesContext,
  event: ExampleWalletEvent
) => boolean;

/**
 * Action Function Types for XState v5 compatibility
 */
export type ContextAction = (
  context: AppTypesContext
) => Partial<AppTypesContext>;

/**
 * Flow State Configuration - Simplified for type organization
 * Note: Uses 'any' for maximum XState compatibility
 */
export interface FlowStateConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  states: Record<string, any>;
  context?: Partial<AppTypesContext>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guards?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: Record<string, any>;
}

/**
 * Utility type for partial context updates
 */
export type ContextUpdate = Partial<{
  message: string;
  userState: Partial<UserState>;
  ixo: Partial<IxoContextData>;
  example: Partial<AppContextData>;
  temp: Partial<TempContextData>;
}>;

/**
 * Export all types for easy importing
 */
export type { AuthResponse };

/**
 * Context Initialization and Utility Functions
 */

/**
 * Create initial context for App Machine
 * Provides safe defaults for all context fields
 */
export function createInitialContext(
  input: ExampleWalletInput
): AppTypesContext {
  return {
    // Session metadata
    sessionId:
      input.sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    phoneNumber: input.phoneNumber,
    serviceCode: input.serviceCode || "*483*7#",
    language: input.language || "eng",
    message: "Welcome to USSD Example App...",

    // User state tracking
    userState: {
      hasIxoAccount: false,
      isWalletSetupComplete: false,
      isAgentLoggedIn: false,
      rateLimited: false,
    },

    // IXO-specific data
    ixo: {
      addresses: [],
      selectedAddress: undefined,
      matrixSession: undefined,
      pin: undefined,
      pinAttempts: 0,
      sendRecipient: undefined,
      sendAmount: undefined,
      sendResult: undefined,
      balance: undefined,
      newDisplayName: undefined,
      username: undefined,
      displayName: undefined,
      lastActivityTimestamp: new Date().toISOString(),
      dailyTransactionCount: 0,
      dailyTransactionVolume: 0,
      validationError: undefined,
      error: undefined,
    },

    // App-specific data
    example: {
      user: undefined,
      agentId: undefined,
      agentPin: undefined,
      selectedProvince: undefined,
      selectedArea: undefined,
      selectedDistrict: undefined,
      selectedBag: undefined,
      selectedAccessory: undefined,
      selectedContract: undefined,
      selectedVoucher: undefined,
      voucherType: undefined,
      voucherAmount: undefined,
      topUpAmount: undefined,
      mobileMoneyNumber: undefined,
      balance: undefined,
      paymentMethod: undefined,
      orderId: undefined,
      orderStatus: undefined,
      deliveryAddress: undefined,
      orderType: undefined,
      usagePeriod: undefined,
      savingsPeriod: undefined,
      carbonPeriod: undefined,
      totalUsage: undefined,
      averageUsage: undefined,
      moneySaved: undefined,
      fuelSaved: undefined,
      co2Saved: undefined,
      treesEquivalent: undefined,
      faultDescription: undefined,
      faultType: undefined,
      faultStatus: undefined,
      faultId: undefined,
      contracts: [],
      selectedContractIndex: undefined,
      selectedInfo: undefined,
    },

    // Shared/temporary data
    temp: {
      validationError: undefined,
      error: undefined,
      pinAttempts: 0,
      loginAttempts: 0,
      previousState: undefined,
      returnToState: undefined,
      isProcessing: false,
      lastAction: undefined,
      pinForVerification: undefined,
      transactionAmount: undefined,
      mobileMoneyNumber: undefined,
    },
  };
}

/**
 * Deep merge utility for context updates
 * Safely merges partial context updates without losing existing data
 */
export function mergeContextUpdate(
  currentContext: AppTypesContext,
  update: ContextUpdate
): AppTypesContext {
  return {
    ...currentContext,
    message: update.message ?? currentContext.message,
    userState: update.userState
      ? { ...currentContext.userState, ...update.userState }
      : currentContext.userState,
    ixo: update.ixo
      ? { ...currentContext.ixo, ...update.ixo }
      : currentContext.ixo,
    example: update.example
      ? { ...currentContext.example, ...update.example }
      : currentContext.example,
    temp: update.temp
      ? { ...currentContext.temp, ...update.temp }
      : currentContext.temp,
  };
}

/**
 * Validate context integrity
 * Ensures required fields are present and valid
 */
export function validateContext(context: AppTypesContext): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate required session fields
  if (!context.sessionId) {
    errors.push("Missing sessionId");
  }
  if (!context.phoneNumber) {
    errors.push("Missing phoneNumber");
  }
  if (!context.serviceCode) {
    errors.push("Missing serviceCode");
  }
  if (!context.language) {
    errors.push("Missing language");
  }

  // Validate userState structure
  if (!context.userState) {
    errors.push("Missing userState");
  } else {
    if (typeof context.userState.hasIxoAccount !== "boolean") {
      errors.push("Invalid userState.hasIxoAccount");
    }
    if (typeof context.userState.isWalletSetupComplete !== "boolean") {
      errors.push("Invalid userState.isWalletSetupComplete");
    }
    if (typeof context.userState.isAgentLoggedIn !== "boolean") {
      errors.push("Invalid userState.isAgentLoggedIn");
    }
  }

  // Validate context structure
  if (!context.ixo) {
    errors.push("Missing ixo context");
  }
  if (!context.example) {
    errors.push("Missing example context");
  }
  if (!context.temp) {
    errors.push("Missing temp context");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Reset a specific section of the context to defaults
 */
export function resetContextSection(
  context: AppTypesContext,
  section: keyof Pick<AppTypesContext, "ixo" | "example" | "temp">
): AppTypesContext {
  const defaults = createInitialContext({
    phoneNumber: context.phoneNumber,
    sessionId: context.sessionId,
    serviceCode: context.serviceCode,
    language: context.language,
  });

  return {
    ...context,
    [section]: defaults[section],
  };
}

/**
 * Sanitize context for logging (remove sensitive data)
 */
export function sanitizeContextForLogging(
  context: AppTypesContext
): Partial<AppTypesContext> {
  return {
    sessionId: context.sessionId,
    phoneNumber: `***${context.phoneNumber.slice(-4)}`,
    serviceCode: context.serviceCode,
    language: context.language,
    userState: context.userState,
    // Omit sensitive sections
    temp: {
      validationError: context.temp.validationError,
      error: context.temp.error,
      isProcessing: context.temp.isProcessing,
      rateLimited: context.temp.rateLimited,
    },
  };
}
