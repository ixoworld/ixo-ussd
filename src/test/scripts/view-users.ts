/**
 * A standalone script to view all users in the Postgres database.
 */
import { Pool } from "pg";
import "dotenv/config"; // Make sure to install dotenv and run with --require dotenv/config

// Configure connection pool using environment variables from your .env file
const pool = new Pool({
  database: process.env.PG_DATABASE || "ixo-ussd-dev",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "",
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432", 10),
});

async function viewUsers() {
  console.log("Connecting to the database to view users...");
  const client = await pool.connect();
  try {
    // Select columns from users and aggregate all ixo_addresses details as JSON
    const res = await client.query(`
      SELECT
        u.id,
        u.phone_number,
        u.first_seen,
        u.last_seen,
        u.visits,
        u.custom_fields,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', ia.id,
              'user_id', ia.user_id,
              'address', ia.address,
              'date_created', ia.date_created,
              'date_changed', ia.date_changed,
              'ixo_did', ia.ixo_did,
              'encrypted_pin', ia.encrypted_pin,
              'encrypted_mnemonic', ia.encrypted_mnemonic,
              'preferred_language', ia.preferred_language,
              'last_completed_action', ia.last_completed_action,
              'last_menu_location', ia.last_menu_location,
              'encrypted_matrix_username', ia.encrypted_matrix_username,
              'encrypted_matrix_password', ia.encrypted_matrix_password
            )
          ) FILTER (WHERE ia.id IS NOT NULL), '[]'
        ) as ixo_addresses
      FROM
        users u
      LEFT JOIN
        ixo_addresses ia ON u.id = ia.user_id
      GROUP BY
        u.id
      ORDER BY
        u.last_seen DESC
    `);

    if (res.rows.length === 0) {
      console.log('\nThe "users" table is empty.');
    } else {
      console.log("\nCurrent users in the database:");
      // Print main user info, showing address count
      const displayRows = res.rows.map(row => {
        let addresses = row.ixo_addresses;
        if (typeof addresses === "string") {
          try {
            addresses = JSON.parse(addresses);
          } catch {
            addresses = [];
          }
        }
        return {
          ...row,
          ixo_addresses: Array.isArray(addresses) ? addresses.length : 0,
        };
      });
      console.table(displayRows);

      // Print detailed addresses for each user
      res.rows.forEach((row, idx) => {
        let addresses = row.ixo_addresses;
        if (typeof addresses === "string") {
          try {
            addresses = JSON.parse(addresses);
          } catch {
            addresses = [];
          }
        }
        if (Array.isArray(addresses) && addresses.length > 0) {
          console.log(`\nUser #${idx} (${row.phone_number}) addresses:`);
          addresses.forEach((addr, i) => {
            console.log(`  [${i + 1}]`, JSON.stringify(addr, null, 2));
          });
        }
      });
    }
  } catch (err) {
    console.error("\nError executing query:", err);
  } finally {
    client.release();
    await pool.end();
    console.log("\nDatabase connection closed.");
  }
}

viewUsers().catch(err => {
  console.error("\nFailed to run the script:", err);
  // Pool is already ended in the viewUsers function's finally block
  // No need to call pool.end() again here to avoid "Called end on pool more than once" error
});
