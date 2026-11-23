
import { Router } from "express";
import {
  createInvitation,
  getInvitations,
  regenerateInvitation,
  revokeInvitation,
} from "./invitation.controller.js";

import { authenticate } from "../../middleware/authenticate.js";
import { requireSuperAdmin } from "../../middleware/requireSuperAdmin.js";

import {
  registerChurch,
  getChurches,
  getChurch,
  editChurch,
  changeChurchStatus,
   getDashboardSummary,
     getAuditLogs,
} from "./platform.controller.js";

const router = Router();

// Every platform route requires Platform Administrator access.
router.use(authenticate, requireSuperAdmin);
router.get("/audit-logs", getAuditLogs);
router.post("/churches", registerChurch);
router.get("/churches", getChurches);
router.get("/churches/:churchId", getChurch);
router.patch("/churches/:churchId", editChurch);
router.patch("/churches/:churchId/status", changeChurchStatus);
// Church Admin invitations — Platform Administrator only
router.post(
  "/churches/:churchId/invitations",
  createInvitation
);

router.get(
  "/churches/:churchId/invitations",
  getInvitations
);

router.post(
  "/churches/:churchId/invitations/:invitationId/regenerate",
  regenerateInvitation
);

router.post(
  "/churches/:churchId/invitations/:invitationId/revoke",
  revokeInvitation
);
router.get("/dashboard-summary", getDashboardSummary);
export default router;
