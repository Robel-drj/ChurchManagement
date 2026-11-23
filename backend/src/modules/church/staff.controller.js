import {
  listChurchStaff,
  assignChurchStaffRole,
  removeChurchStaffRole,
} from "./staff.service.js";

import {
  assignStaffRoleSchema,
  staffMembershipIdSchema,
} from "./staff.validation.js";

export async function getStaff(req, res, next) {
  try {
    const staff = await listChurchStaff(req.church.id);

    return res.status(200).json({
      success: true,
      message: "Church staff retrieved successfully.",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignStaffRole(req, res, next) {
  try {
    const idValidation = staffMembershipIdSchema.safeParse(
      req.params.membershipId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const validation = assignStaffRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role.",
        errors: validation.error.issues,
      });
    }

    const result = await assignChurchStaffRole(
      req.church.id,
      idValidation.data,
      validation.data.role_name,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeStaffRole(req, res, next) {
  try {
    const idValidation = staffMembershipIdSchema.safeParse(
      req.params.membershipId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const validation = assignStaffRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role.",
        errors: validation.error.issues,
      });
    }

    const result = await removeChurchStaffRole(
      req.church.id,
      idValidation.data,
      validation.data.role_name
    );

    return res.status(200).json({
      success: true,
      message: "Staff role removed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}