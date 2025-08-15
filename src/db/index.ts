/* eslint-disable @typescript-eslint/no-unused-vars */
import { Kysely } from "kysely";
import { databaseManager } from "../services/database-manager.js";
import { ENV } from "../config.js";

// Initialize database manager
if (!ENV.IS_TEST) {
  // In production/development, initialize immediately
  databaseManager.initialize().catch(error => {
    // Use process.stderr for logging during initialization
    process.stderr.write(`Failed to initialize database: ${error}\n`);
    process.exit(1);
  });
}

// Export getter function instead of direct instance
export const getDb = (): Kysely<Database> => {
  return databaseManager.getKysely();
};

// Export lazy db instance for backwards compatibility with full proxy support
export const db = new Proxy({} as Kysely<Database>, {
  get(target, prop) {
    const kysely = databaseManager.getKysely();
    const value = (kysely as any)[prop];
    return typeof value === "function" ? value.bind(kysely) : value;
  },

  set(target, prop, value) {
    const kysely = databaseManager.getKysely();
    (kysely as any)[prop] = value;
    return true;
  },

  deleteProperty(target, prop) {
    const kysely = databaseManager.getKysely();
    delete (kysely as any)[prop];
    return true;
  },

  has(target, prop) {
    const kysely = databaseManager.getKysely();
    return prop in kysely;
  },

  ownKeys(target) {
    const kysely = databaseManager.getKysely();
    return Reflect.ownKeys(kysely);
  },

  getOwnPropertyDescriptor(target, prop) {
    const kysely = databaseManager.getKysely();
    return Reflect.getOwnPropertyDescriptor(kysely, prop);
  },

  defineProperty(target, prop, descriptor) {
    const kysely = databaseManager.getKysely();
    return Reflect.defineProperty(kysely, prop, descriptor);
  },

  getPrototypeOf(target) {
    const kysely = databaseManager.getKysely();
    return Reflect.getPrototypeOf(kysely);
  },

  setPrototypeOf(target, prototype) {
    const kysely = databaseManager.getKysely();
    return Reflect.setPrototypeOf(kysely, prototype);
  },

  isExtensible(target) {
    const kysely = databaseManager.getKysely();
    return Reflect.isExtensible(kysely);
  },

  preventExtensions(target) {
    const kysely = databaseManager.getKysely();
    return Reflect.preventExtensions(kysely);
  },
});

export interface Database {
  phones: {
    id?: number;
    phone_number: string;
    first_seen: Date;
    last_seen: Date;
    number_of_visits: number;
    created_at: Date;
    updated_at: Date;
  };
  households: {
    id?: number;
    created_at: Date;
    updated_at: Date;
  };
  customers: {
    id?: number;
    customer_id: string;
    full_name: string | null;
    email: string | null;
    encrypted_pin: string | null; // Allow null for PIN clearing
    preferred_language: string | null;
    date_added: Date;
    last_completed_action: string | null;
    household_id: number | null;
    created_at: Date;
    updated_at: Date;
  };
  customer_phones: {
    id?: number;
    customer_id: number;
    phone_id: number;
    is_primary: boolean | null;
    created_at: Date;
  };
  ixo_profiles: {
    id?: number;
    customer_id: number | null;
    household_id: number | null;
    did: string;
    created_at: Date;
    updated_at: Date;
  };
  ixo_accounts: {
    id?: number;
    ixo_profile_id: number;
    address: string;
    encrypted_mnemonic: string;
    is_primary: boolean | null;
    created_at: Date;
    updated_at: Date;
  };
  matrix_vaults: {
    id?: number;
    ixo_profile_id: number;
    username: string;
    encrypted_password: string;
    created_at: Date;
    updated_at: Date;
  };
}
