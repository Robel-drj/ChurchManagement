import { registerChurchMember } from "./member.service.js";
import { registerMemberSchema } from "./member.validation.js";
import {
  listChurchMembers,
  getChurchMemberDetails,
  updateChurchMemberProfile,
  updateChurchMembershipStatus,
  updateChurchMemberPassword,
  updateOwnProfilePicture
} from "./member.service.js";

import {
  listMembersQuerySchema,
  memberIdSchema,
  updateMemberProfileSchema,
  updateMembershipStatusSchema,
  updateMemberPasswordSchema,
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
export async function uploadMyProfilePicture(req, res, next) {
  try {
    const churchId = memberIdSchema.safeParse(req.params.churchId);

    if (!churchId.success || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Select a profile photo and a valid church.",
      });
    }

    const profileImage = await updateOwnProfilePicture(
      churchId.data,
      req.user.id,
      req.file
    );

    return res.status(200).json({
      success: true,
      data: { profileImage },
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
export async function updateMemberPassword(req, res, next) {
  try {
    if (!req.churchRoles.includes("church_admin")) {
      return res.status(403).json({
        success: false,
        message: "Only church administrators can update member passwords.",
      });
    }

    const membershipId = memberIdSchema.safeParse(req.params.membershipId);
    if (!membershipId.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership ID.",
      });
    }

    const input = updateMemberPasswordSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({
        success: false,
        message: "Enter a password with at least 8 characters and at most 72 bytes.",
      });
    }

    await updateChurchMemberPassword(req.church.id, membershipId.data, input.data.password);

    return res.status(200).json({
      success: true,
      message: "Member password updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}