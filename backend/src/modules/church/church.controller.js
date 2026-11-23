
import { getChurchDashboard } from "./church.service.js";

export async function getDashboard(req, res, next) {
  try {
    const dashboard = await getChurchDashboard(req.church.id);

    return res.status(200).json({
      success: true,
      message: "Church dashboard retrieved successfully.",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}
