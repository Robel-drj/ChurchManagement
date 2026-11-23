import {
  getChurchProfile,
  updateChurchProfile,
  updateChurchLogo,
} from "./church-profile.service.js";

import {
  updateChurchProfileSchema,
} from "./church.validation.js";

export async function getProfile(req, res, next) {
  try {
    const profile = await getChurchProfile(req.church.id);

    return res.status(200).json({
      success: true,
      message: "Church profile retrieved successfully.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const validation = updateChurchProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid church profile information.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const profile = await updateChurchProfile(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Church profile updated successfully.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfileLogo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Select a profile photo to upload.",
      });
    }

    const profile = await updateChurchLogo(req.church.id, req.file);

    return res.status(200).json({
      success: true,
      message: "Church profile photo updated successfully.",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}
