import {
  listContributionCategories,
  createContributionCategory,
  updateContributionCategory,
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
    createContribution,
  listContributions,
  getContributionDetails,
  updateContribution,
   getFinanceReport,
   createContributionAdjustment,
listContributionAdjustments,
decideContributionAdjustment,
} from "./finance.service.js";


import {
   createContributionSchema,
  updateContributionSchema,
  listContributionsQuerySchema,
  createContributionCategorySchema,
  updateContributionCategorySchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  financeIdSchema,
    financeReportQuerySchema,
    createContributionAdjustmentSchema,
listContributionAdjustmentsQuerySchema,
decideContributionAdjustmentSchema,

} from "./finance.validation.js";


// --------------------------------------------------
// CONTRIBUTION CATEGORIES
// --------------------------------------------------

export async function getContributionCategories(req, res, next) {
  try {
    const includeInactive =
      req.churchRoles?.includes("church_admin") ?? false;

    const categories = await listContributionCategories(
      req.church.id,
      includeInactive
    );

    return res.status(200).json({
      success: true,
      message: "Collection categories retrieved successfully.",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function addContributionCategory(req, res, next) {
  try {
    const validation = createContributionCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection category information.",
        errors: validation.error.issues,
      });
    }

    const category = await createContributionCategory(
      req.church.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Collection category created successfully.",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function editContributionCategory(req, res, next) {
  try {
    const idValidation = financeIdSchema.safeParse(req.params.categoryId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection category ID.",
      });
    }

    const validation = updateContributionCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection category information.",
        errors: validation.error.issues,
      });
    }

    const category = await updateContributionCategory(
      req.church.id,
      idValidation.data,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Collection category updated successfully.",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// --------------------------------------------------
// PAYMENT METHODS
// --------------------------------------------------

export async function getPaymentMethods(req, res, next) {
  try {
    const methods = await listPaymentMethods(req.church.id);

    return res.status(200).json({
      success: true,
      message: "Payment methods retrieved successfully.",
      data: methods,
    });
  } catch (error) {
    next(error);
  }
}

export async function addPaymentMethod(req, res, next) {
  try {
    const validation = createPaymentMethodSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method information.",
        errors: validation.error.issues,
      });
    }

    const method = await createPaymentMethod(
      req.church.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Payment method created successfully.",
      data: method,
    });
  } catch (error) {
    next(error);
  }
}

export async function editPaymentMethod(req, res, next) {
  try {
    const idValidation = financeIdSchema.safeParse(
      req.params.paymentMethodId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method ID.",
      });
    }

    const validation = updatePaymentMethodSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method information.",
        errors: validation.error.issues,
      });
    }

    const method = await updatePaymentMethod(
      req.church.id,
      idValidation.data,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Payment method updated successfully.",
      data: method,
    });
  } catch (error) {
    next(error);
  }
}
// --------------------------------------------------
// CONTRIBUTION CONTROLLERS
// --------------------------------------------------

export async function addContribution(req, res, next) {
  try {
    const validation = createContributionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution information.",
        errors: validation.error.issues,
      });
    }

    const contribution = await createContribution(
      req.church.id,
      validation.data,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: "Contribution recorded successfully.",
      data: contribution,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContributions(req, res, next) {
  try {
    const validation = listContributionsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution filters.",
        errors: validation.error.issues,
      });
    }

    const contributions = await listContributions(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Contributions retrieved successfully.",
      data: contributions.items,
      pagination: contributions.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContribution(req, res, next) {
  try {
    const validation = financeIdSchema.safeParse(
      req.params.contributionId
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution ID.",
      });
    }

    const contribution = await getContributionDetails(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Contribution retrieved successfully.",
      data: contribution,
    });
  } catch (error) {
    next(error);
  }
}

export async function editContribution(req, res, next) {
  try {
    const idValidation = financeIdSchema.safeParse(
      req.params.contributionId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution ID.",
      });
    }

    const validation = updateContributionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution update information.",
        errors: validation.error.issues,
      });
    }

    const contribution = await updateContribution(
      req.church.id,
      idValidation.data,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Contribution updated successfully.",
      data: contribution,
    });
  } catch (error) {
    next(error);
  }
}
export async function getChurchFinanceReport(req, res, next) {
  try {
    const validation = financeReportQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid financial report date range.",
        errors: validation.error.issues,
      });
    }

    const report = await getFinanceReport(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Financial report generated successfully.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function addContributionAdjustment(req, res, next) {
  try {
    const validation = createContributionAdjustmentSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const adjustment = await createContributionAdjustment(
      req.church.id,
      validation.data,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: "Adjustment request submitted successfully.",
      data: adjustment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContributionAdjustments(req, res, next) {
  try {
    const validation = listContributionAdjustmentsQuerySchema.safeParse(
      req.query
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const result = await listContributionAdjustments(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function decideAdjustment(req, res, next) {
  try {
    if (!req.churchRoles?.includes("church_admin")) {
      return res.status(403).json({
        success: false,
        message: "Only a Church Admin can approve or reject adjustments.",
      });
    }

    const idValidation = financeIdSchema.safeParse(
      req.params.adjustmentId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid adjustment ID is required.",
      });
    }

    const validation = decideContributionAdjustmentSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const adjustment = await decideContributionAdjustment(
      req.church.id,
      idValidation.data,
      validation.data.decision,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: `Adjustment request ${validation.data.decision}.`,
      data: adjustment,
    });
  } catch (error) {
    next(error);
  }
}
