import { registerChurchMember } from "./member.service.js";
import { registerMemberSchema } from "./member.validation.js";
import {
  listChurchMembers,
  getChurchMemberDetails,
  updateChurchMemberProfile,
  updateChurchMembershipStatus,
} from "./member.service.js";

import {
  listMembersQuerySchema,
  memberIdSchema,
  updateMemberProfileSchema,
  updateMembershipStatusSchema,
} from "./member.validation.js";
export async function registerMember(req, res, next) {
  try {
    const validation = registerMemberSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member information.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await registerChurchMember(
      req.church.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Church member registered successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
export async function listMembers(req, res, next) {
  try {
    const validation = listMembersQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member search parameters.",
        errors: validation.error.issues,
      });
    }

    const result = await listChurchMembers(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Church members retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemberDetails(req, res, next) {
  try {
    const idValidation = memberIdSchema.safeParse(
      req.params.membershipId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const member = await getChurchMemberDetails(
      req.church.id,
      idValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Member details retrieved successfully.",
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberProfile(req, res, next) {
  try {
    const idValidation = memberIdSchema.safeParse(
      req.params.membershipId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const validation = updateMemberProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member profile information.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const profile = await updateChurchMemberProfile(
      req.church.id,
      idValidation.data,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Member profile updated successfully.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberStatus(req, res, next) {
  try {
    const idValidation = memberIdSchema.safeParse(
      req.params.membershipId
    );

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const validation = updateMembershipStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership status.",
        errors: validation.error.issues,
      });
    }

    const membership = await updateChurchMembershipStatus(
      req.church.id,
      idValidation.data,
      validation.data.membership_status
    );

    return res.status(200).json({
      success: true,
      message: "Membership status updated successfully.",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
}