import { pool } from "../../config/database.js";
import { cloudinary } from "../../config/cloudinary.js";

function uploadLogoBuffer(file, churchId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `churches/${churchId}/profile`,
        public_id: "logo",
        resource_type: "image",
        overwrite: true,
        invalidate: true,
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

export async function getChurchProfile(churchId) {
  const result = await pool.query(
    `SELECT
       id,
       church_name,
       church_code,
       address,
       phone,
       email,
       logo_url,
       status,
       created_at,
       updated_at
     FROM churches
     WHERE id = $1`,
    [churchId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Church not found.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function updateChurchProfile(churchId, updates) {
  const allowedColumns = {
    church_name: "church_name",
    address: "address",
    phone: "phone",
    email: "email",
    logo_url: "logo_url",
  };

  const entries = Object.entries(updates).filter(
    ([field]) => Object.hasOwn(allowedColumns, field)
  );

  if (entries.length === 0) {
    const error = new Error("No valid profile fields provided.");
    error.statusCode = 400;
    throw error;
  }

  const values = entries.map(([, value]) => value);

  const setClause = entries
    .map(([field], index) => `${allowedColumns[field]} = $${index + 1}`)
    .join(", ");

  values.push(churchId);

  const result = await pool.query(
    `UPDATE churches
     SET ${setClause},
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING
       id,
       church_name,
       church_code,
       address,
       phone,
       email,
       logo_url,
       status,
       created_at,
       updated_at`,
    values
  );

  if (result.rowCount === 0) {
    const error = new Error("Church not found.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function updateChurchLogo(churchId, file) {
  let uploadResult;

  try {
    uploadResult = await uploadLogoBuffer(file, churchId);
  } catch (uploadError) {
    console.error("CHURCH LOGO UPLOAD ERROR:", {
      churchId,
      message: uploadError.message,
      httpCode: uploadError.http_code,
    });

    const error = new Error("Unable to upload the church profile photo.");
    error.statusCode = 502;
    throw error;
  }

  return updateChurchProfile(churchId, {
    logo_url: uploadResult.secure_url,
  });
}
