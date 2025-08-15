/**
 * PostgreSQL service for managing database operations
 */
import { Pool } from "pg";
import { createModuleLogger } from "./logger.js";
import { databaseManager } from "./database-manager.js";

// Create a module-specific logger
const logger = createModuleLogger("postgres-service");

export interface PgUserRecord {
  id: number;
  phone_number: string;
  first_seen: string;
  last_seen: string;
  visits: number;
  custom_fields: Record<string, any> | null;
}

export interface PgIxoAddressRecord {
  id: number;
  user_id: number;
  address: string;
  date_created: string;
  date_changed: string | null;
  ixo_did: string | null;
  encrypted_pin: string | null;
  encrypted_mnemonic: string | null;
  preferred_language: string | null;
  last_completed_action: string | null;
  last_menu_location: string | null;
  encrypted_matrix_username: string | null;
  encrypted_matrix_password: string | null;
}

export class PostgresService {
  private getPool(): Pool {
    return databaseManager.getPool();
  }

  async getUserByPhone(
    phoneNumber: string
  ): Promise<(PgUserRecord & { ixo_addresses: PgIxoAddressRecord[] }) | null> {
    const pool = this.getPool();
    const res = await pool.query<
      PgUserRecord & { ixo_addresses: PgIxoAddressRecord[] }
    >(
      `
        SELECT u.*, COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ia.id,
              'user_id', ia.user_id,
              'address', ia.address,
              'did', ia.did,
              'mnemonic', ia.mnemonic,
              'encrypted_pin', ia.encrypted_pin,
              'created_at', ia.created_at,
              'updated_at', ia.updated_at
            )
          ) FILTER (WHERE ia.id IS NOT NULL), 
          '[]'
        ) AS ixo_addresses
        FROM users u 
        LEFT JOIN ixo_addresses ia ON u.id = ia.user_id 
        WHERE u.phone_number = $1 
        GROUP BY u.id
      `,
      [phoneNumber]
    );

    logger.debug(
      {
        phoneNumber: `***${phoneNumber.slice(-4)}`,
        foundUser: res.rows.length > 0,
      },
      "PostgreSQL user lookup by phone"
    );

    return res.rows[0] || null;
  }

  async getUserByPhoneAndAddress(
    phoneNumber: string,
    ixoAddress: string
  ): Promise<(PgUserRecord & { ixo_addresses: PgIxoAddressRecord[] }) | null> {
    const pool = this.getPool();
    const res = await pool.query(
      `SELECT u.*, 
        COALESCE(json_agg(ia.*) FILTER (WHERE ia.id IS NOT NULL), '[]') as ixo_addresses
       FROM users u
       INNER JOIN ixo_addresses ia ON u.id = ia.user_id
       WHERE u.phone_number = $1 AND ia.address = $2
       GROUP BY u.id`,
      [phoneNumber, ixoAddress]
    );
    if (!res.rows[0]) return null;
    const user = res.rows[0];
    user.ixo_addresses = JSON.parse(user.ixo_addresses);
    // custom_fields is already a JS object or null; do not parse or check type
    return user;
  }

  async createUser(phoneNumber: string): Promise<PgUserRecord> {
    const pool = this.getPool();
    const now = new Date().toISOString();
    const res = await pool.query(
      `INSERT INTO users (phone_number, first_seen, last_seen, visits, custom_fields)
       VALUES ($1, $2, $2, 1, $3)
       RETURNING *`,
      [phoneNumber, now, null]
    );
    return res.rows[0];
  }

  async createIxoAddress(
    userId: number,
    addressData: Omit<PgIxoAddressRecord, "id" | "user_id"> & {
      address: string;
    }
  ): Promise<PgIxoAddressRecord> {
    const pool = this.getPool();
    const res = await pool.query(
      `INSERT INTO ixo_addresses (user_id, address, date_created, date_changed, ixo_did, encrypted_pin, encrypted_mnemonic, preferred_language, last_completed_action, last_menu_location, encrypted_matrix_username, encrypted_matrix_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        addressData.address,
        addressData.date_created,
        addressData.date_changed,
        addressData.ixo_did,
        addressData.encrypted_pin,
        addressData.encrypted_mnemonic,
        addressData.preferred_language,
        addressData.last_completed_action,
        addressData.last_menu_location,
        addressData.encrypted_matrix_username,
        addressData.encrypted_matrix_password,
      ]
    );
    return res.rows[0];
  }

  async updateIxoAddressMatrixCredentials(
    userId: number,
    address: string,
    encrypted_matrix_username: string,
    encrypted_matrix_password: string
  ): Promise<PgIxoAddressRecord> {
    const pool = this.getPool();
    const res = await pool.query(
      `UPDATE ixo_addresses SET encrypted_matrix_username = $1, encrypted_matrix_password = $2 WHERE user_id = $3 AND address = $4 RETURNING *`,
      [encrypted_matrix_username, encrypted_matrix_password, userId, address]
    );
    return res.rows[0];
  }

  async updateUserVisit(phoneNumber: string): Promise<PgUserRecord> {
    const pool = this.getPool();
    const now = new Date().toISOString();
    const res = await pool.query(
      `UPDATE users
       SET last_seen = $2, visits = visits + 1
       WHERE phone_number = $1
       RETURNING *`,
      [phoneNumber, now]
    );
    return res.rows[0];
  }

  async close(): Promise<void> {
    // Use centralized database manager for cleanup
    await databaseManager.close();
  }
}

export const postgresService = new PostgresService();
