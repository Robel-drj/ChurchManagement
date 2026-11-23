
import {
  createChurchAdminInvitation,
  getChurchAdminInvitationDetails,
  listChurchAdminInvitations,
  regenerateChurchAdminInvitation,
  revokeChurchAdminInvitation,
  acceptChurchAdminInvitation,
} from "./invitation.service.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITATION_TOKEN_REGEX = /^[0-9a-f]{64}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createInvitation(req, res, next) {
  try {
    const { churchId } = req.params;
    const { invitedEmail, invitedPhone } = req.body;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

    if (
      invitedEmail !== undefined &&
      (typeof invitedEmail !== "string" || invitedEmail.trim().length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invited email.",
      });
    }

    if (
      invitedPhone !== undefined &&
      (typeof invitedPhone !== "string" || invitedPhone.trim().length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid invited phone.",
      });
    }

    if (!invitedEmail?.trim() && !invitedPhone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Provide an email address or phone number.",
      });
    }

    if (
      invitedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

   const result = await createChurchAdminInvitation({
  churchId,
  invitedEmail,
  invitedPhone,
  invitedBy: req.user.id,
  ipAddress: req.ip,
});

    return res.status(201).json({
      success: true,
      message: "Church Admin invitation created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvitations(req, res, next) {
  try {
    const { churchId } = req.params;

    if (!UUID_REGEX.test(churchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID.",
      });
    }

    const invitations = await listChurchAdminInvitations(churchId);

    return res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeInvitation(req, res, next) {
  try {
    const { churchId, invitationId } = req.params;

    if (!UUID_REGEX.test(churchId) || !UUID_REGEX.test(invitationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID or invitation ID.",
      });
    }

   const invitation = await revokeChurchAdminInvitation({
  churchId,
  invitationId,
  revokedBy: req.user.id,
  ipAddress: req.ip,
});

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully.",
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
}

export async function regenerateInvitation(req, res, next) {
  try {
    const { churchId, invitationId } = req.params;

    if (!UUID_REGEX.test(churchId) || !UUID_REGEX.test(invitationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid church ID or invitation ID.",
      });
    }

    const result = await regenerateChurchAdminInvitation({
      churchId,
      invitationId,
    });

    return res.status(200).json({
      success: true,
      message: "A new invitation link was generated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvitationDetails(req, res, next) {
  try {
    const invitationToken = req.params.invitationToken?.trim();

    if (!INVITATION_TOKEN_REGEX.test(invitationToken || "")) {
      return res.status(400).json({
        success: false,
        message: "A valid invitation token is required.",
      });
    }

    const result = await getChurchAdminInvitationDetails(invitationToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const {
      invitationToken,
      fullName,
      email,
      phone,
      password,
    } = req.body;

    const normalizedInvitationToken =
      typeof invitationToken === "string"
        ? invitationToken.trim()
        : "";

    if (!INVITATION_TOKEN_REGEX.test(normalizedInvitationToken)) {
      return res.status(400).json({
        success: false,
        message: "A valid invitation token is required.",
      });
    }

    if (
      fullName !== undefined &&
      fullName !== null &&
      typeof fullName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid full name.",
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      typeof email !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }

    if (
      typeof email === "string" &&
      email.trim() &&
      (!EMAIL_REGEX.test(email.trim()) || email.trim().length > 150)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    if (
      typeof phone === "string" &&
      phone.trim() &&
      (phone.trim().length < 7 || phone.trim().length > 20)
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain between 7 and 20 characters.",
      });
    }

    if (
      password !== undefined &&
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid password.",
      });
    }

    if (typeof password === "string" && password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain no more than 72 characters.",
      });
    }

    const result = await acceptChurchAdminInvitation({
      invitationToken: normalizedInvitationToken,
      fullName,
      email,
      phone,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Church Admin invitation accepted successfully. You can now log in.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

