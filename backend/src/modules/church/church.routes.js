import { Router } from "express";
import { registerMember } from "./member.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  requireChurchPermission,
} from "../../middleware/requireChurchPermission.js";
import rateLimit from "express-rate-limit";
import {
  initializeMemberPayment,
  getMemberPaymentStatus,
  getMemberContributionHistory,
} from "../payments/payment.controller.js";
import {
  getActiveChurches,
  registerPublicMember,
} from "./public-church.controller.js";
import {
  getContributionCategories,
  addContributionCategory,
  editContributionCategory,
  getPaymentMethods,
  addPaymentMethod,
  editPaymentMethod,
  getContributionMembers,
  addContribution,
getContributions,
getContribution,
editContribution,
  getChurchFinanceReport,
  addContributionAdjustment,
getContributionAdjustments,
decideAdjustment,
} from "./finance.controller.js";
import {
  addPost,
  getManagePosts,
  getManagePost,
  editPost,
  updatePostStatus,
  uploadPostMedia,
  deletePostMedia,
  removePost,
  getPublishedFeed,
  getPublishedPostDetails,
  likePublishedPost,
  unlikePublishedPost,
} from "./content.controller.js";
import {
  getChurchMediaLibrary,
} from "./media.controller.js";
import {
  createChurchEvent,
  getChurchEvents,
  getChurchEvent,
  editChurchEvent,
  updateChurchEventStatus,
  uploadChurchEventMedia,
  deleteChurchEventMedia,
  removeChurchEvent,
  getPublishedChurchEvents,
  getPublishedChurchEvent,
} from "./event.controller.js";

import {
  uploadPostMedia as uploadEventMediaFiles,
} from "../../middleware/uploadContentMedia.js";
import { uploadPostMedia as uploadPostMediaFiles } from "../../middleware/uploadContentMedia.js";
import {
  listMembers,
  getMemberDetails,
  updateMemberProfile,
  updateMemberStatus,
  updateMemberPassword
} from "./member.controller.js";
import { getDashboard } from "./church.controller.js";
import {
  getStaff,
  assignStaffRole,
  removeStaffRole,
} from "./staff.controller.js";
import {
  getProfile,
  updateProfile,
  uploadProfileLogo,
} from "./church-profile.controller.js";
import {
  uploadChurchLogoFile,
} from "../../middleware/uploadChurchLogo.js";
import {
  createChurchNotification,
  getChurchNotifications,
  getChurchNotificationDetails,
  cancelNotification,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.controller.js";
const router = Router();
// Limit repeated public registration attempts from one IP address.
const publicRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// Public endpoint: list active churches for the mobile app.
router.get("/public/active", getActiveChurches);

// --------------------------------------------------
// MEMBER ONLINE CONTRIBUTIONS
// --------------------------------------------------

// A member can initiate an online contribution for themselves.
router.post(
  "/:churchId/finance/online-contributions",
  authenticate,
  requireChurchPermission("finance.contribution.create_self"),
  initializeMemberPayment
);
router.patch(
  "/:churchId/members/:membershipId/password",
  authenticate,
  requireChurchPermission("members.update"),
  updateMemberPassword
);
// A member can view their own contribution history.
router.get(
  "/:churchId/finance/my-contributions",
  authenticate,
  requireChurchPermission("finance.contribution.read_own"),
  getMemberContributionHistory
);

// A member can check the status of their own payment.
router.get(
  "/:churchId/finance/online-contributions/:contributionId/status",
  authenticate,
  requireChurchPermission("finance.contribution.read_own"),
  getMemberPaymentStatus
);

// Public endpoint: register a new member in an active church.
router.post(
  "/:churchId/register",
  publicRegistrationLimiter,
  registerPublicMember
);
// Church dashboard
router.get(
  "/:churchId/dashboard",
  authenticate,
  requireChurchPermission("church.dashboard.view"),
  getDashboard
);
router.post(
  "/:churchId/members",
  authenticate,
  requireChurchPermission("members.create"),
  registerMember
);
// View church profile
router.get(
  "/:churchId/profile",
  authenticate,
  requireChurchPermission("church.profile.read"),
  getProfile
);

// Update church profile
router.patch(
  "/:churchId/profile",
  authenticate,
  requireChurchPermission("church.profile.update"),
  updateProfile
);

// Upload or replace the church profile photo.
router.post(
  "/:churchId/profile/logo",
  authenticate,
  requireChurchPermission("church.profile.update"),
  uploadChurchLogoFile,
  uploadProfileLogo
);
// List and search church members
router.get(
  "/:churchId/members",
  authenticate,
  requireChurchPermission("members.read"),
  listMembers
);

// Get one member's details
router.get(
  "/:churchId/members/:membershipId",
  authenticate,
  requireChurchPermission("members.read"),
  getMemberDetails
);

// Update a member's personal profile
router.patch(
  "/:churchId/members/:membershipId/profile",
  authenticate,
  requireChurchPermission("members.update"),
  updateMemberProfile
);

// Suspend or reactivate a church membership
router.patch(
  "/:churchId/members/:membershipId/status",
  authenticate,
  requireChurchPermission("members.update"),
  updateMemberStatus
);
// View church staff
router.get(
  "/:churchId/staff",
  authenticate,
  requireChurchPermission("roles.read"),
  getStaff
);

// Assign a staff role
router.post(
  "/:churchId/staff/:membershipId/roles",
  authenticate,
  requireChurchPermission("roles.assign"),
  assignStaffRole
);

// Remove a staff role
router.delete(
  "/:churchId/staff/:membershipId/roles",
  authenticate,
  requireChurchPermission("roles.assign"),
  removeStaffRole
);
// --------------------------------------------------
// CONTRIBUTION CATEGORIES
// --------------------------------------------------

// Church members, collectors, and admins can view categories.
router.get(
  "/:churchId/finance/categories",
  authenticate,
  requireChurchPermission("finance.payment_methods.read"),
  getContributionCategories
);

// Only users with finance management permission can create categories.
router.post(
  "/:churchId/finance/categories",
  authenticate,
  requireChurchPermission("finance.payment_methods.manage"),
  addContributionCategory
);

// Update category details or deactivate/reactivate a category.
router.patch(
  "/:churchId/finance/categories/:categoryId",
  authenticate,
  requireChurchPermission("finance.payment_methods.manage"),
  editContributionCategory
);

// --------------------------------------------------
// PAYMENT METHODS
// --------------------------------------------------

router.get(
  "/:churchId/finance/payment-methods",
  authenticate,
  requireChurchPermission("finance.payment_methods.read"),
  getPaymentMethods
);

router.post(
  "/:churchId/finance/payment-methods",
  authenticate,
  requireChurchPermission("finance.payment_methods.manage"),
  addPaymentMethod
);

router.patch(
  "/:churchId/finance/payment-methods/:paymentMethodId",
  authenticate,
  requireChurchPermission("finance.payment_methods.manage"),
  editPaymentMethod
);
// --------------------------------------------------
// CONTRIBUTION RECORDS
// --------------------------------------------------

// List the minimal active-member data needed to record a contribution.
router.get(
  "/:churchId/finance/contribution-members",
  authenticate,
  requireChurchPermission("finance.transaction.create"),
  getContributionMembers
);

// Record a contribution.
router.post(
  "/:churchId/finance/contributions",
  authenticate,
  requireChurchPermission("finance.transaction.create"),
  addContribution
);

// List contributions.
router.get(
  "/:churchId/finance/contributions",
  authenticate,
  requireChurchPermission("finance.read"),
  getContributions
);

// Get one contribution.
router.get(
  "/:churchId/finance/contributions/:contributionId",
  authenticate,
  requireChurchPermission("finance.read"),
  getContribution
);

// Update allowed contribution fields and payment status.
router.patch(
  "/:churchId/finance/contributions/:contributionId",
  authenticate,
  requireChurchPermission("finance.transaction.update"),
  editContribution
);
// --------------------------------------------------
// FINANCIAL REPORTS
// --------------------------------------------------

router.get(
  "/:churchId/finance/reports",
  authenticate,
  requireChurchPermission("finance.read"),
  getChurchFinanceReport
);

router.post(
  "/:churchId/finance/adjustments",
  authenticate,
  requireChurchPermission("finance.transaction.create"),
  addContributionAdjustment
);

router.get(
  "/:churchId/finance/adjustments",
  authenticate,
  requireChurchPermission("finance.read"),
  getContributionAdjustments
);

router.patch(
  "/:churchId/finance/adjustments/:adjustmentId/decision",
  authenticate,
  requireChurchPermission("finance.transaction.update"),
  decideAdjustment
);

/*
 * CONTENT MANAGEMENT
 */

// Members and authorized staff can view published posts.
router.get(
  "/:churchId/content/posts/published",
  authenticate,
  requireChurchPermission("content.read_published"),
  getPublishedFeed
);

router.get(
  "/:churchId/content/posts/published/:postId",
  authenticate,
  requireChurchPermission("content.read_published"),
  getPublishedPostDetails
);

router.put(
  "/:churchId/content/posts/published/:postId/like",
  authenticate,
  requireChurchPermission("content.read_published"),
  likePublishedPost
);

router.delete(
  "/:churchId/content/posts/published/:postId/like",
  authenticate,
  requireChurchPermission("content.read_published"),
  unlikePublishedPost
);

// Church Admin and Content Creator can manage posts.
router.post(
  "/:churchId/content/posts",
  authenticate,
  requireChurchPermission("content.create"),
  addPost
);

router.get(
  "/:churchId/content/posts",
  authenticate,
  requireChurchPermission("content.create"),
  getManagePosts
);

router.get(
  "/:churchId/content/posts/:postId",
  authenticate,
  requireChurchPermission("content.create"),
  getManagePost
);

router.patch(
  "/:churchId/content/posts/:postId",
  authenticate,
  requireChurchPermission("content.update"),
  editPost
);

router.patch(
  "/:churchId/content/posts/:postId/status",
  authenticate,
  requireChurchPermission("content.publish"),
  updatePostStatus
);

router.post(
  "/:churchId/content/posts/:postId/media",
  authenticate,
  requireChurchPermission("media.upload"),
  uploadPostMediaFiles,
  uploadPostMedia
);

router.delete(
  "/:churchId/content/posts/:postId/media/:mediaId",
  authenticate,
  requireChurchPermission("content.update"),
  deletePostMedia
);

router.delete(
  "/:churchId/content/posts/:postId",
  authenticate,
  requireChurchPermission("content.delete"),
  removePost
);
// Published events – church members
router.get(
  "/:churchId/events/published",
  authenticate,
  requireChurchPermission("events.read_published"),
  getPublishedChurchEvents
);

router.get(
  "/:churchId/events/published/:eventId",
  authenticate,
  requireChurchPermission("events.read_published"),
  getPublishedChurchEvent
);

// Event management
router.post(
  "/:churchId/events",
  authenticate,
  requireChurchPermission("events.create"),
  createChurchEvent
);

router.get(
  "/:churchId/events",
  authenticate,
  requireChurchPermission("events.create"),
  getChurchEvents
);

router.get(
  "/:churchId/events/:eventId",
  authenticate,
  requireChurchPermission("events.create"),
  getChurchEvent
);

router.patch(
  "/:churchId/events/:eventId",
  authenticate,
  requireChurchPermission("events.update"),
  editChurchEvent
);

router.patch(
  "/:churchId/events/:eventId/status",
  authenticate,
  requireChurchPermission("events.publish"),
  updateChurchEventStatus
);

// Event media
router.post(
  "/:churchId/events/:eventId/media",
  authenticate,
  requireChurchPermission("events.update"),
  requireChurchPermission("media.upload"),
  uploadEventMediaFiles,
  uploadChurchEventMedia
);

router.delete(
  "/:churchId/events/:eventId/media/:mediaId",
  authenticate,
  requireChurchPermission("events.update"),
  deleteChurchEventMedia
);

// Delete event
router.delete(
  "/:churchId/events/:eventId",
  authenticate,
  requireChurchPermission("events.delete"),
  removeChurchEvent
);
// Unified church media library
router.get(
  "/:churchId/media",
  authenticate,
  requireChurchPermission("content.create"),
  requireChurchPermission("events.create"),
  getChurchMediaLibrary
);
// Church Admin notification management
router.post(
  "/:churchId/notifications",
  authenticate,
  requireChurchPermission("notifications.manage"),
  createChurchNotification
);

router.get(
  "/:churchId/notifications",
  authenticate,
  requireChurchPermission("notifications.manage"),
  getChurchNotifications
);

// Keep fixed notification paths before /:notificationId so Express does not
// treat "inbox" as a notification ID.
router.get(
  "/:churchId/notifications/inbox",
  authenticate,
  requireChurchPermission("notifications.read"),
  getMyNotifications
);

router.patch(
  "/:churchId/notifications/read-all",
  authenticate,
  requireChurchPermission("notifications.read"),
  markAllNotificationsRead
);

router.get(
  "/:churchId/notifications/:notificationId",
  authenticate,
  requireChurchPermission("notifications.manage"),
  getChurchNotificationDetails
);

router.patch(
  "/:churchId/notifications/:notificationId/cancel",
  authenticate,
  requireChurchPermission("notifications.manage"),
  cancelNotification
);

router.patch(
  "/:churchId/notifications/:notificationId/read",
  authenticate,
  requireChurchPermission("notifications.read"),
  markNotificationRead
);
export default router;
