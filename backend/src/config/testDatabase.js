import dotenv from "dotenv";
import { pool } from "./database.js";

dotenv.config();

async function testDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        NOW() AS server_time
    `);

    console.log("DATABASE CONNECTED SUCCESSFULLY!");
    console.log(result.rows[0]);

  } catch (error) {
    console.error("DATABASE CONNECTION FAILED!");
    console.error(error);

  } finally {
    await pool.end();
  }
}

testDatabase();