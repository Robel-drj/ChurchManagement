import { pool } from "../../config/database.js";

export async function listActiveChurches() {
  const result = await pool.query(
    `SELECT
       id,
       church_name,
       church_code,
       address,
       logo_url,
       status
     FROM churches
     WHERE status = 'active'
     ORDER BY church_name ASC`
  );

  return result.rows;
}