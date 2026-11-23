
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  acceptInvitation,
  getInvitationDetails,
} from "./invitation.controller.js";

const router = Router();

const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many invitation attempts. Please try again later.",
  },
});

const invitationLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many invitation lookups. Please try again later.",
  },
});

router.post("/accept", invitationLimiter, acceptInvitation);
router.get(
  "/:invitationToken",
  invitationLookupLimiter,
  getInvitationDetails
);

export default router;
