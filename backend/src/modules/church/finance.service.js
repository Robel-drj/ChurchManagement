import { pool } from "../../config/database.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function handleUniqueViolation(error, message) {
  if (error.code === "23505") {
    throw createHttpError(message, 409);
  }

  throw error;
}

// --------------------------------------------------
// CONTRIBUTION CATEGORIES
// --------------------------------------------------

export async function listContributionCategories(
  churchId,
  includeInactive = false
) {
  const result = await pool.query(
    `SELECT
       id,
       church_id,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM contribution_categories
     WHERE church_id = $1
       AND ($2::boolean = TRUE OR is_active = TRUE)
     ORDER BY name ASC`,
    [churchId, includeInactive]
  );

  return result.rows;
}

export async function createContributionCategory(churchId, input) {
  try {
    const result = await pool.query(
      `INSERT INTO contribution_categories (
         church_id,
         name,
         description
       )
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        churchId,
        input.name,
        input.description ?? null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    handleUniqueViolation(
      error,
      "A collection category with this name already exists."
    );
  }
}

export async function updateContributionCategory(
  churchId,
  categoryId,
  input
) {
  const allowedFields = [
    "name",
    "description",
    "is_active",
  ];

  const fields = [];
  const values = [];
  let index = 1;

  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) {
      fields.push(`${field} = $${index}`);
      values.push(input[field]);
      index++;
    }
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(categoryId, churchId);

  try {
    const result = await pool.query(
      `UPDATE contribution_categories
       SET ${fields.join(", ")}
       WHERE id = $${index}
         AND church_id = $${index + 1}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw createHttpError("Collection category not found.", 404);
    }

    return result.rows[0];
  } catch (error) {
    handleUniqueViolation(
      error,
      "A collection category with this name already exists."
    );
  }
}

// --------------------------------------------------
// PAYMENT METHODS
// --------------------------------------------------

export async function listPaymentMethods(churchId, includeInactive = false) {
  const result = await pool.query(
    `SELECT
       id,
       church_id,
       method_name,
       provider,
       account_name,
       account_number,
       instructions,
       is_active,
       created_at,
       updated_at
     FROM payment_methods
     WHERE church_id = $1
       AND ($2::boolean = TRUE OR is_active = TRUE)
     ORDER BY method_name ASC`,
    [churchId, includeInactive]
  );

  return result.rows;
}

export async function createPaymentMethod(churchId, input) {
  try {
    const result = await pool.query(
      `INSERT INTO payment_methods (
         church_id,
         method_name,
         provider,
         account_name,
         account_number,
         instructions
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        churchId,
        input.method_name,
        input.provider ?? null,
        input.account_name ?? null,
        input.account_number ?? null,
        input.instructions ?? null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    handleUniqueViolation(
      error,
      "A payment method with this name already exists."
    );
  }
}

export async function updatePaymentMethod(
  churchId,
  paymentMethodId,
  input
) {
  const allowedFields = [
    "method_name",
    "provider",
    "account_name",
    "account_number",
    "instructions",
    "is_active",
  ];

  const fields = [];
  const values = [];
  let index = 1;

  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) {
      fields.push(`${field} = $${index}`);
      values.push(input[field]);
      index++;
    }
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(paymentMethodId, churchId);

  try {
    const result = await pool.query(
      `UPDATE payment_methods
       SET ${fields.join(", ")}
       WHERE id = $${index}
         AND church_id = $${index + 1}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw createHttpError("Payment method not found.", 404);
    }

    return result.rows[0];
  } catch (error) {
    handleUniqueViolation(
      error,
      "A payment method with this name already exists."
    );
  }
}
// --------------------------------------------------
// CONTRIBUTION RECORDING
// --------------------------------------------------

export async function createContribution(
  churchId,
  input,
  receivedBy
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const churchResult = await client.query(
      `SELECT id
       FROM churches
       WHERE id = $1
         AND status = 'active'
       FOR UPDATE`,
      [churchId]
    );

    if (churchResult.rowCount === 0) {
      throw createHttpError("Church not found or not active.", 403);
    }

    const membershipResult = await client.query(
      `SELECT id
       FROM church_memberships
       WHERE id = $1
         AND church_id = $2
         AND membership_status = 'active'
       FOR UPDATE`,
      [input.membership_id, churchId]
    );

    if (membershipResult.rowCount === 0) {
      throw createHttpError(
        "Active member not found in this church.",
        404
      );
    }

    const categoryResult = await client.query(
      `SELECT id
       FROM contribution_categories
       WHERE id = $1
         AND church_id = $2
         AND is_active = TRUE`,
      [input.category_id, churchId]
    );

    if (categoryResult.rowCount === 0) {
      throw createHttpError(
        "Active collection category not found in this church.",
        404
      );
    }

    const methodResult = await client.query(
      `SELECT id
       FROM payment_methods
       WHERE id = $1
         AND church_id = $2
         AND is_active = TRUE`,
      [input.payment_method_id, churchId]
    );

    if (methodResult.rowCount === 0) {
      throw createHttpError(
        "Active payment method not found in this church.",
        404
      );
    }

    const result = await client.query(
      `INSERT INTO contributions (
         church_id,
         membership_id,
         category_id,
         payment_method_id,
         amount,
         payment_status,
         transaction_reference,
         received_by,
         contribution_date,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        churchId,
        input.membership_id,
        input.category_id,
        input.payment_method_id,
        input.amount,
        input.payment_status ?? "pending",
        input.transaction_reference ?? null,
        receivedBy,
        input.contribution_date ?? new Date().toISOString(),
        input.notes ?? null,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw createHttpError(
        "This transaction reference already exists in this church.",
        409
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

// --------------------------------------------------
// LIST CONTRIBUTIONS
// --------------------------------------------------

export async function listContributions(churchId, filters) {
  const {
    page,
    limit,
    search,
    category_id,
    payment_method_id,
    payment_status,
    date_from,
    date_to,
  } = filters;

  const conditions = ["co.church_id = $1"];
  const values = [churchId];

  function addCondition(sql, value) {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  }

  if (search) {
    values.push(`%${search}%`);
    const parameter = `$${values.length}`;

    conditions.push(`(
      u.full_name ILIKE ${parameter}
      OR u.phone ILIKE ${parameter}
      OR COALESCE(co.transaction_reference, '') ILIKE ${parameter}
      OR cc.name ILIKE ${parameter}
    )`);
  }

  if (category_id) {
    addCondition("co.category_id = ?", category_id);
  }

  if (payment_method_id) {
    addCondition("co.payment_method_id = ?", payment_method_id);
  }

  if (payment_status) {
    addCondition("co.payment_status = ?", payment_status);
  }

  if (date_from) {
    addCondition("co.contribution_date >= ?::date", date_from);
  }

  if (date_to) {
    addCondition(
      "co.contribution_date < (?::date + INTERVAL '1 day')",
      date_to
    );
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM contributions co
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN users u ON u.id = cm.user_id
     JOIN contribution_categories cc
       ON cc.id = co.category_id
      AND cc.church_id = co.church_id
     WHERE ${whereClause}`,
    values
  );

  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       co.id,
       co.church_id,
       co.membership_id,
       co.category_id,
       co.payment_method_id,
       co.amount,
       co.payment_status,
       co.transaction_reference,
       co.contribution_date,
       co.notes,
       co.created_at,
       co.updated_at,
       u.full_name AS member_name,
       u.phone AS member_phone,
       cm.member_number,
       cc.name AS category_name,
       pm.method_name AS payment_method,
       receiver.full_name AS received_by_name
     FROM contributions co
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN users u ON u.id = cm.user_id
     JOIN contribution_categories cc
       ON cc.id = co.category_id
      AND cc.church_id = co.church_id
     JOIN payment_methods pm
       ON pm.id = co.payment_method_id
      AND pm.church_id = co.church_id
     LEFT JOIN users receiver
       ON receiver.id = co.received_by
     WHERE ${whereClause}
     ORDER BY co.contribution_date DESC, co.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    dataValues
  );

  const total = countResult.rows[0].total;

  return {
    items: result.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

// --------------------------------------------------
// CONTRIBUTION DETAILS
// --------------------------------------------------

export async function getContributionDetails(churchId, contributionId) {
  const result = await pool.query(
    `SELECT
       co.id,
       co.church_id,
       co.membership_id,
       co.category_id,
       co.payment_method_id,
       co.amount,
       co.payment_status,
       co.transaction_reference,
       co.contribution_date,
       co.notes,
       co.created_at,
       co.updated_at,
       u.full_name AS member_name,
       u.phone AS member_phone,
       u.email AS member_email,
       cm.member_number,
       cc.name AS category_name,
       pm.method_name AS payment_method,
       pm.provider AS payment_provider,
       receiver.full_name AS received_by_name
     FROM contributions co
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN users u ON u.id = cm.user_id
     JOIN contribution_categories cc
       ON cc.id = co.category_id
      AND cc.church_id = co.church_id
     JOIN payment_methods pm
       ON pm.id = co.payment_method_id
      AND pm.church_id = co.church_id
     LEFT JOIN users receiver
       ON receiver.id = co.received_by
     WHERE co.id = $1
       AND co.church_id = $2`,
    [contributionId, churchId]
  );

  if (result.rowCount === 0) {
    throw createHttpError("Contribution not found.", 404);
  }

  return result.rows[0];
}

// --------------------------------------------------
// UPDATE CONTRIBUTION
// --------------------------------------------------

export async function updateContribution(
  churchId,
  contributionId,
  input
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT id, payment_status
       FROM contributions
       WHERE id = $1
         AND church_id = $2
       FOR UPDATE`,
      [contributionId, churchId]
    );

    if (existingResult.rowCount === 0) {
      throw createHttpError("Contribution not found.", 404);
    }

    const existing = existingResult.rows[0];

    if (
      existing.payment_status === "rejected" ||
      existing.payment_status === "reversed"
    ) {
      throw createHttpError(
        "Rejected or reversed contributions cannot be updated.",
        409
      );
    }

    if (
      input.payment_status &&
      existing.payment_status !== "pending"
    ) {
      throw createHttpError(
        "Only pending contributions can change payment status.",
        409
      );
    }

    const allowedFields = [
      "payment_status",
      "transaction_reference",
      "notes",
    ];

    const fields = [];
    const values = [];
    let index = 1;

    for (const field of allowedFields) {
      if (Object.hasOwn(input, field)) {
        fields.push(`${field} = $${index}`);
        values.push(input[field]);
        index++;
      }
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    values.push(contributionId, churchId);

    const result = await client.query(
      `UPDATE contributions
       SET ${fields.join(", ")}
       WHERE id = $${index}
         AND church_id = $${index + 1}
       RETURNING *`,
      values
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw createHttpError(
        "This transaction reference already exists in this church.",
        409
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
// --------------------------------------------------
// FINANCIAL REPORTS
// --------------------------------------------------

function buildFinanceDateFilter(dateFrom, dateTo) {
  const conditions = ["co.church_id = $1"];
  const values = [];

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(
      `co.contribution_date >= $${values.length + 1}::date`
    );
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(
      `co.contribution_date < ($${values.length + 1}::date + INTERVAL '1 day')`
    );
  }

  return {
    whereClause: conditions.join(" AND "),
    values: [null, ...values],
  };
}

export async function getFinanceReport(churchId, filters) {
  const { date_from, date_to } = filters;

  const conditions = ["co.church_id = $1"];
  const values = [churchId];

  if (date_from) {
    values.push(date_from);
    conditions.push(
      `co.contribution_date >= $${values.length}::date`
    );
  }

  if (date_to) {
    values.push(date_to);
    conditions.push(
      `co.contribution_date < ($${values.length}::date + INTERVAL '1 day')`
    );
  }

  const whereClause = conditions.join(" AND ");

  // Overall totals
  const totalsResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_contributions,

       COUNT(*) FILTER (
         WHERE payment_status = 'confirmed'
       )::int AS confirmed_count,

       COUNT(*) FILTER (
         WHERE payment_status = 'pending'
       )::int AS pending_count,

       COUNT(*) FILTER (
         WHERE payment_status = 'rejected'
       )::int AS rejected_count,

       COUNT(*) FILTER (
         WHERE payment_status = 'reversed'
       )::int AS reversed_count,

       COALESCE(
         SUM(amount) FILTER (
           WHERE payment_status = 'confirmed'
         ),
         0
       ) AS confirmed_amount,

       COALESCE(
         SUM(amount) FILTER (
           WHERE payment_status = 'pending'
         ),
         0
       ) AS pending_amount,

       COALESCE(
         SUM(amount) FILTER (
           WHERE payment_status = 'rejected'
         ),
         0
       ) AS rejected_amount,

       COALESCE(
         SUM(amount) FILTER (
           WHERE payment_status = 'reversed'
         ),
         0
       ) AS reversed_amount

     FROM contributions co
     WHERE ${whereClause}`,
    values
  );

  // Totals by collection category
  const categoryResult = await pool.query(
    `SELECT
       cc.id AS category_id,
       cc.name AS category_name,
       COUNT(co.id)::int AS contribution_count,

       COUNT(co.id) FILTER (
         WHERE co.payment_status = 'confirmed'
       )::int AS confirmed_count,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'confirmed'
         ),
         0
       ) AS confirmed_amount,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'pending'
         ),
         0
       ) AS pending_amount

     FROM contributions co
     JOIN contribution_categories cc
       ON cc.id = co.category_id
      AND cc.church_id = co.church_id
     WHERE ${whereClause}
     GROUP BY cc.id, cc.name
     ORDER BY confirmed_amount DESC, cc.name ASC`,
    values
  );

  // Totals by payment method
  const paymentMethodResult = await pool.query(
    `SELECT
       pm.id AS payment_method_id,
       pm.method_name,
       COUNT(co.id)::int AS contribution_count,

       COUNT(co.id) FILTER (
         WHERE co.payment_status = 'confirmed'
       )::int AS confirmed_count,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'confirmed'
         ),
         0
       ) AS confirmed_amount,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'pending'
         ),
         0
       ) AS pending_amount

     FROM contributions co
     JOIN payment_methods pm
       ON pm.id = co.payment_method_id
      AND pm.church_id = co.church_id
     WHERE ${whereClause}
     GROUP BY pm.id, pm.method_name
     ORDER BY confirmed_amount DESC, pm.method_name ASC`,
    values
  );

  // Daily contribution activity
  const dailyResult = await pool.query(
    `SELECT
       DATE(co.contribution_date) AS contribution_day,
       COUNT(*)::int AS contribution_count,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'confirmed'
         ),
         0
       ) AS confirmed_amount,

       COALESCE(
         SUM(co.amount) FILTER (
           WHERE co.payment_status = 'pending'
         ),
         0
       ) AS pending_amount

     FROM contributions co
     WHERE ${whereClause}
     GROUP BY DATE(co.contribution_date)
     ORDER BY contribution_day ASC`,
    values
  );

  return {
    period: {
      date_from: date_from ?? null,
      date_to: date_to ?? null,
    },
    totals: totalsResult.rows[0],
    by_category: categoryResult.rows,
    by_payment_method: paymentMethodResult.rows,
    daily_activity: dailyResult.rows,
  };
}
export async function createContributionAdjustment(
  churchId,
  input,
  createdBy
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the contribution so concurrent adjustment requests
    // cannot over-adjust the same contribution.
    const contributionResult = await client.query(
      `SELECT id, amount, payment_status
       FROM contributions
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [input.contribution_id, churchId]
    );

    if (contributionResult.rowCount === 0) {
      throw createHttpError("Contribution not found.", 404);
    }

    const contribution = contributionResult.rows[0];

    if (contribution.payment_status !== "confirmed") {
      throw createHttpError(
        "Only confirmed contributions can be adjusted.",
        409
      );
    }

    // Permit only one pending adjustment per contribution.
    const pendingResult = await client.query(
      `SELECT id
       FROM contribution_adjustments
       WHERE contribution_id = $1
         AND church_id = $2
         AND status = 'pending'
       LIMIT 1`,
      [input.contribution_id, churchId]
    );

    if (pendingResult.rowCount > 0) {
      throw createHttpError(
        "This contribution already has a pending adjustment request.",
        409
      );
    }

    const historyResult = await client.query(
      `SELECT
         COALESCE(
           SUM(amount) FILTER (
             WHERE adjustment_type = 'refund'
               AND status = 'approved'
           ), 0
         ) AS refunded_amount,
         BOOL_OR(
           adjustment_type = 'refund' AND status = 'approved'
         ) AS has_approved_refund,
         BOOL_OR(
           adjustment_type = 'reversal' AND status = 'approved'
         ) AS has_approved_reversal
       FROM contribution_adjustments
       WHERE contribution_id = $1 AND church_id = $2`,
      [input.contribution_id, churchId]
    );

    const history = historyResult.rows[0];
    const refundedAmount = Number(history.refunded_amount || 0);
    const currentAmount = Number(contribution.amount);

    if (history.has_approved_reversal) {
      throw createHttpError(
        "This contribution has already been reversed.",
        409
      );
    }

    let previousAmount = null;

    if (input.adjustment_type === "refund") {
      const remainingAmount = currentAmount - refundedAmount;

      if (input.amount > remainingAmount) {
        throw createHttpError(
          `The refund cannot exceed the remaining contribution amount (${remainingAmount}).`,
          400
        );
      }
    }

    if (input.adjustment_type === "reversal") {
      if (history.has_approved_refund) {
        throw createHttpError(
          "A contribution with an approved partial refund cannot be fully reversed through this workflow.",
          409
        );
      }

      if (Number(input.amount) !== currentAmount) {
        throw createHttpError(
          "A reversal must equal the full current contribution amount.",
          400
        );
      }
    }

    if (input.adjustment_type === "correction") {
      if (history.has_approved_refund) {
        throw createHttpError(
          "A contribution with an approved refund cannot be corrected through this workflow.",
          409
        );
      }

      // For a correction, amount means the new corrected total.
      previousAmount = contribution.amount;

      if (Number(input.amount) === currentAmount) {
        throw createHttpError(
          "The corrected amount must differ from the current contribution amount.",
          400
        );
      }
    }

    const result = await client.query(
      `INSERT INTO contribution_adjustments (
         church_id,
         contribution_id,
         adjustment_type,
         amount,
         previous_amount,
         reason,
         status,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING
         id,
         church_id,
         contribution_id,
         adjustment_type,
         amount,
         previous_amount,
         reason,
         status,
         created_by,
         created_at`,
      [
        churchId,
        input.contribution_id,
        input.adjustment_type,
        input.amount,
        previousAmount,
        input.reason,
        createdBy,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listContributionAdjustments(churchId, filters) {
  const { page, limit, status, adjustment_type } = filters;
  const conditions = ["a.church_id = $1"];
  const values = [churchId];

  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (adjustment_type) {
    values.push(adjustment_type);
    conditions.push(`a.adjustment_type = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM contribution_adjustments a
     WHERE ${whereClause}`,
    values
  );

  const listValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       a.id,
       a.contribution_id,
       a.adjustment_type,
       a.amount,
       a.previous_amount,
       a.reason,
       a.status,
       a.created_at,
       a.approved_at,
       a.decided_at,
       member.full_name AS member_name,
       creator.full_name AS created_by_name,
       decider.full_name AS decided_by_name,
       approver.full_name AS approved_by_name,
       co.payment_status AS contribution_status,
       co.amount AS current_contribution_amount
     FROM contribution_adjustments a
     JOIN contributions co
       ON co.id = a.contribution_id
      AND co.church_id = a.church_id
     JOIN church_memberships cm
       ON cm.id = co.membership_id
      AND cm.church_id = co.church_id
     JOIN users member ON member.id = cm.user_id
     JOIN users creator ON creator.id = a.created_by
     LEFT JOIN users decider ON decider.id = a.decided_by
     LEFT JOIN users approver ON approver.id = a.approved_by
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues
  );

  return {
    adjustments: result.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      total_pages: Math.ceil(countResult.rows[0].total / limit),
    },
  };
}

export async function decideContributionAdjustment(
  churchId,
  adjustmentId,
  decision,
  decidedBy
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const adjustmentResult = await client.query(
      `SELECT *
       FROM contribution_adjustments
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [adjustmentId, churchId]
    );

    if (adjustmentResult.rowCount === 0) {
      throw createHttpError("Adjustment request not found.", 404);
    }

    const adjustment = adjustmentResult.rows[0];

    if (adjustment.status !== "pending") {
      throw createHttpError(
        "This adjustment request has already been decided.",
        409
      );
    }

    const contributionResult = await client.query(
      `SELECT id, amount, payment_status
       FROM contributions
       WHERE id = $1 AND church_id = $2
       FOR UPDATE`,
      [adjustment.contribution_id, churchId]
    );

    if (contributionResult.rowCount === 0) {
      throw createHttpError("Related contribution not found.", 404);
    }

    const contribution = contributionResult.rows[0];

    if (decision === "approved") {
      if (adjustment.adjustment_type === "correction") {
        // Prevent overwriting a contribution changed after this
        // correction request was submitted.
        if (
          Number(contribution.amount) !==
          Number(adjustment.previous_amount)
        ) {
          throw createHttpError(
            "The contribution amount has changed since this correction was requested. Submit a new correction request.",
            409
          );
        }

        if (contribution.payment_status !== "confirmed") {
          throw createHttpError(
            "Only confirmed contributions can be corrected.",
            409
          );
        }

        await client.query(
          `UPDATE contributions
           SET amount = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND church_id = $3`,
          [adjustment.amount, adjustment.contribution_id, churchId]
        );
      }

      if (adjustment.adjustment_type === "refund") {
        if (contribution.payment_status !== "confirmed") {
          throw createHttpError(
            "Only confirmed contributions can be refunded.",
            409
          );
        }

        const refundResult = await client.query(
          `SELECT COALESCE(SUM(amount), 0) AS refunded_amount
           FROM contribution_adjustments
           WHERE contribution_id = $1
             AND church_id = $2
             AND adjustment_type = 'refund'
             AND status = 'approved'`,
          [adjustment.contribution_id, churchId]
        );

        const alreadyRefunded = Number(
          refundResult.rows[0].refunded_amount || 0
        );

        if (
          alreadyRefunded + Number(adjustment.amount) >
          Number(contribution.amount)
        ) {
          throw createHttpError(
            "The approved refunds would exceed the contribution amount.",
            409
          );
        }
      }

      if (adjustment.adjustment_type === "reversal") {
        if (contribution.payment_status !== "confirmed") {
          throw createHttpError(
            "Only confirmed contributions can be reversed.",
            409
          );
        }

        if (
          Number(adjustment.amount) !== Number(contribution.amount)
        ) {
          throw createHttpError(
            "The reversal amount no longer matches the contribution amount.",
            409
          );
        }

        const refundResult = await client.query(
          `SELECT COUNT(*)::int AS total
           FROM contribution_adjustments
           WHERE contribution_id = $1
             AND church_id = $2
             AND adjustment_type = 'refund'
             AND status = 'approved'`,
          [adjustment.contribution_id, churchId]
        );

        if (refundResult.rows[0].total > 0) {
          throw createHttpError(
            "This contribution already has an approved refund and cannot be fully reversed.",
            409
          );
        }

        await client.query(
          `UPDATE contributions
           SET payment_status = 'reversed',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND church_id = $2`,
          [adjustment.contribution_id, churchId]
        );
      }
    }

    let updatedResult;

    if (decision === "approved") {
      updatedResult = await client.query(
        `UPDATE contribution_adjustments
         SET status = 'approved',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP,
             decided_by = $1,
             decided_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND church_id = $3
         RETURNING *`,
        [decidedBy, adjustmentId, churchId]
      );
    } else {
      updatedResult = await client.query(
        `UPDATE contribution_adjustments
         SET status = 'rejected',
             decided_by = $1,
             decided_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND church_id = $3
         RETURNING *`,
        [decidedBy, adjustmentId, churchId]
      );
    }

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}