import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

export async function setupTestDatabase() {
  console.log("Setting up test database...");

  const pool = new Pool({
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  });

  try {
    // Log connection details (excluding sensitive info)
    console.log("Database connection details:", {
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
    });

    // Test connection
    await pool.query("SELECT NOW()");
    console.log("Successfully connected to database");

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      "migrations",
      "postgres",
      "001-init.sql"
    );
    console.log("Reading migration from:", migrationPath);
    const migration = fs.readFileSync(migrationPath, "utf8");
    console.log("Migration SQL:", migration);

    // Execute migration
    await pool.query(migration);
    console.log("Migration executed successfully");

    // Verify table creation
    const tableResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log("Table structure:", tableResult.rows);
  } catch (error) {
    console.error("Failed to initialize test database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}
