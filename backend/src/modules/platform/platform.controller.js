
import {
  createChurch,
  listChurches,
  getChurchById,
  updateChurch,
   getPlatformDashboardSummary,
  updateChurchStatus,
    listPlatformAuditLogs,
} from "./platform.service.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function registerChurch(req, res, next) {
  try {
    const {
      churchName,
      address,
      phone,
      email,
      logoUrl,
    } = req.body;

    if (
      typeof churchName !== "string" ||
      churchName.trim().length < 2 ||
      churchName.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Church name must contain between 2 and 150 characters.",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

  const result = await createChurch(
  {
    churchName: churchName.trim(),
    address,
    phone,
    email: email?.trim().toLowerCase(),
    logoUrl,
  },
  req.user.id,
  req.ip
);

    return res.status(201).json({
      success: true,
      message: "Church registered successfully. It is currently pending activation.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getChurches(req, res, next) {
  try {
    const { status, search } = req.query;

    const allowedStatuses = ["pending", "active", "suspended"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church status filter.",
      });
    }

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const offset = Math.max(
      Number.parseInt(req.query.offset, 10) || 0,
      0
    );

    const churches = await listChurches({
      status,
      search,
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: churches,
      pagination: {
        limit,
        offset,
        returned: churches.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getChurch(req, res, next) {
  try {
    const { churchId } = req.params;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

    const church = await getChurchById(churchId);

    if (!church) {
      return res.status(404).json({
        success: false,
        message: "Church not found.",
      });
    }

    return res.json({
      success: true,
      data: church,
    });
  } catch (error) {
    next(error);
  }
}

export async function editChurch(req, res, next) {
  try {
    const { churchId } = req.params;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

    const allowedFields = [
      "churchName",
      "address",
      "phone",
      "email",
      "logoUrl",
    ];

    const hasAllowedField = allowedFields.some(
      (field) => Object.hasOwn(req.body, field)
    );

    if (!hasAllowedField) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one church field to update.",
      });
    }

    if (
      req.body.churchName !== undefined &&
      (
        typeof req.body.churchName !== "string" ||
        req.body.churchName.trim().length < 2 ||
        req.body.churchName.trim().length > 150
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Church name must contain between 2 and 150 characters.",
      });
    }

    if (
      req.body.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const data = { ...req.body };

    if (data.churchName) data.churchName = data.churchName.trim();
    if (data.email) data.email = data.email.trim().toLowerCase();

    const church = await updateChurch(
  churchId,
  data,
  req.user.id,
  req.ip
);
    if (!church) {
      return res.status(404).json({
        success: false,
        message: "Church not found.",
      });
    }

    return res.json({
      success: true,
      message: "Church information updated successfully.",
      data: church,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeChurchStatus(req, res, next) {
  try {
    const { churchId } = req.params;
    const { status } = req.body;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

  if (!["active", "suspended"].includes(status)) {
  return res.status(400).json({
    success: false,
    message: "Status must be either active or suspended.",
  });
}
const church = await updateChurchStatus(
  churchId,
  status,
  req.user.id,
  req.ip
);

    if (!church) {
      return res.status(404).json({
        success: false,
        message: "Church not found.",
      });
    }

    return res.json({
      success: true,
      message: `Church ${status === "active" ? "activated" : "suspended"} successfully.`,
      data: church,
    });
  } catch (error) {
    next(error);
  }
}
export async function getDashboardSummary(req, res, next) {
  try {
    const summary = await getPlatformDashboardSummary();

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
export async function getAuditLogs(req, res, next) {
  try {
    const action =
      typeof req.query.action === "string"
        ? req.query.action.trim()
        : "";

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const offset = Math.max(
      Number.parseInt(req.query.offset, 10) || 0,
      0
    );

    const result = await listPlatformAuditLogs({
      action: action || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        limit,
        offset,
        total: result.total,
        returned: result.logs.length,
      },
    });
  } catch (error) {
    next(error);
  }
}