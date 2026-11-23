
import {
  initializeOnlineContribution,
  verifyMyContribution,
  listMyContributions,
} from "./payment.service.js";

import {
  initializeOnlineContributionSchema,
} from "./payment.validation.js";

import { z } from "zod";

const uuidSchema = z.string().uuid();

export async function initializeMemberPayment(req, res, next) {
  try {
    const validation =
      initializeOnlineContributionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid online contribution information.",
        errors: validation.error.issues,
      });
    }

    const result = await initializeOnlineContribution(
      req.church.id,
      req.user.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Online payment initialized successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemberPaymentStatus(req, res, next) {
  try {
    const validation = uuidSchema.safeParse(
      req.params.contributionId
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution ID.",
      });
    }

    const result = await verifyMyContribution(
      req.church.id,
      req.user.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemberContributionHistory(req, res, next) {
  try {
    const contributions = await listMyContributions(
      req.church.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Your contributions retrieved successfully.",
      data: contributions,
    });
  } catch (error) {
    next(error);
  }
}
