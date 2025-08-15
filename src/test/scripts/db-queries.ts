/**
 * Script to query phone and customer data from the database.
 * Usage:
 *   ts-node db-queries.ts <phoneNumber>
 *   ts-node db-queries.ts --customer <customer_id>
 *   ts-node db-queries.ts --profile <ixo_profile_id>
 *   ts-node db-queries.ts --matrix <customer_id>
 *   ts-node db-queries.ts         # (to list all phones)
 */

import { Pool } from "pg";
import "dotenv/config";

const ssl =
  process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  database: process.env.PG_DATABASE || "ixo-ussd-dev",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "",
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432", 10),
  ssl,
});

async function queryPhones(phoneNumber?: string) {
  console.log("Connecting to the database to view users...");
  console.log("PG_USER:", process.env.PG_USER);
  console.log("PG_HOST:", process.env.PG_HOST);
  console.log("PG_PORT:", process.env.PG_PORT);
  console.log("PG_DATABASE:", process.env.PG_DATABASE);
  const client = await pool.connect();
  try {
    let query = `
      SELECT
        p.id AS phone_id,
        p.phone_number,
        p.first_seen,
        p.last_seen,
        p.number_of_visits,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'customer_db_id', c.id,
              'customer_id', c.customer_id,
              'full_name', c.full_name,
              'email', c.email,
              'encrypted_pin', c.encrypted_pin,
              'preferred_language', c.preferred_language,
              'date_added', c.date_added,
              'last_completed_action', c.last_completed_action,
              'household_id', c.household_id,
              'created_at', c.created_at,
              'updated_at', c.updated_at
            )
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS customers
      FROM phones p
      LEFT JOIN customer_phones cp ON p.id = cp.phone_id
      LEFT JOIN customers c ON cp.customer_id = c.id
    `;
    const params: any[] = [];
    if (phoneNumber) {
      query += ` WHERE p.phone_number = $1`;
      params.push(phoneNumber);
    }
    query += `
      GROUP BY p.id
      ORDER BY p.last_seen DESC
    `;

    const res = await client.query(query, params);

    if (res.rows.length === 0) {
      console.log(
        phoneNumber
          ? `\nNo data found for phone number: ${phoneNumber}`
          : "\nNo phone records found."
      );
    } else {
      console.log(
        phoneNumber
          ? `\nData for phone number: ${phoneNumber}`
          : "\nAll phone records:"
      );
      // Display main phone info, showing customer count
      const displayRows = res.rows.map(row => {
        let customers = row.customers;
        if (typeof customers === "string") {
          try {
            customers = JSON.parse(customers);
          } catch {
            customers = [];
          }
        }
        return {
          ...row,
          customers: Array.isArray(customers) ? customers.length : 0,
        };
      });
      console.table(displayRows);

      // Print detailed customers for each phone
      res.rows.forEach((row, idx) => {
        let customers = row.customers;
        if (typeof customers === "string") {
          try {
            customers = JSON.parse(customers);
          } catch {
            customers = [];
          }
        }
        if (Array.isArray(customers) && customers.length > 0) {
          console.log(`\nPhone #${idx} (${row.phone_number}) customers:`);
          customers.forEach((cust, i) => {
            console.log(`  [${i + 1}]`, JSON.stringify(cust, null, 2));
          });
        }
      });
    }
  } catch (err) {
    console.error("\nError executing query:", err);
  } finally {
    client.release();
  }
}

async function queryIxoProfiles(customerId: string) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        ip.id,
        ip.customer_id,
        ip.household_id,
        ip.did,
        ip.created_at,
        ip.updated_at,
        c.customer_id as customer_code,
        c.full_name
      FROM ixo_profiles ip
      LEFT JOIN customers c ON ip.customer_id = c.id
      WHERE c.customer_id = $1
      ORDER BY ip.created_at DESC
    `;

    const res = await client.query(query, [customerId]);

    if (res.rows.length === 0) {
      console.log(`\nNo IXO profiles found for customer: ${customerId}`);
    } else {
      console.log(`\nIXO Profiles for customer: ${customerId}`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error("\nError executing IXO profiles query:", err);
  } finally {
    client.release();
  }
}

async function queryIxoAccounts(ixoProfileId: string) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        ia.id,
        ia.ixo_profile_id,
        ia.address,
        ia.is_primary,
        ia.created_at,
        ia.updated_at,
        ip.did,
        c.customer_id as customer_code
      FROM ixo_accounts ia
      JOIN ixo_profiles ip ON ia.ixo_profile_id = ip.id
      LEFT JOIN customers c ON ip.customer_id = c.id
      WHERE ia.ixo_profile_id = $1
      ORDER BY ia.is_primary DESC, ia.created_at ASC
    `;

    const res = await client.query(query, [ixoProfileId]);

    if (res.rows.length === 0) {
      console.log(`\nNo IXO accounts found for profile ID: ${ixoProfileId}`);
    } else {
      console.log(`\nIXO Accounts for profile ID: ${ixoProfileId}`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error("\nError executing IXO accounts query:", err);
  } finally {
    client.release();
  }
}

async function queryMatrixVaults(customerId: string) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        mv.id,
        mv.ixo_profile_id,
        mv.username,
        mv.created_at,
        mv.updated_at,
        ip.did,
        c.customer_id as customer_code,
        c.full_name
      FROM matrix_vaults mv
      JOIN ixo_profiles ip ON mv.ixo_profile_id = ip.id
      JOIN customers c ON ip.customer_id = c.id
      WHERE c.customer_id = $1
      ORDER BY mv.created_at DESC
    `;

    const res = await client.query(query, [customerId]);

    if (res.rows.length === 0) {
      console.log(`\nNo Matrix vaults found for customer: ${customerId}`);
    } else {
      console.log(`\nMatrix Vaults for customer: ${customerId}`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error("\nError executing Matrix vaults query:", err);
  } finally {
    client.release();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

async function main() {
  try {
    if (args.length === 0) {
      // Default: list all phones
      await queryPhones();
    } else if (args[0] === "--customer" && args[1]) {
      await queryIxoProfiles(args[1]);
    } else if (args[0] === "--profile" && args[1]) {
      await queryIxoAccounts(args[1]);
    } else if (args[0] === "--matrix" && args[1]) {
      await queryMatrixVaults(args[1]);
    } else if (!args[0].startsWith("--")) {
      // Phone number query
      await queryPhones(args[0]);
    } else {
      console.log(`
Usage:
  ts-node db-queries.ts <phoneNumber>     # Query by phone number
  ts-node db-queries.ts --customer <id>   # Query IXO profiles by customer_id
  ts-node db-queries.ts --profile <id>    # Query IXO accounts by ixo_profile_id  
  ts-node db-queries.ts --matrix <id>     # Query Matrix vaults by customer_id
  ts-node db-queries.ts                   # List all phones
      `);
    }
  } finally {
    await pool.end();
    console.log("\nDatabase connection closed.");
  }
}

main().catch(err => {
  console.error("\nFailed to run the script:", err);
});
