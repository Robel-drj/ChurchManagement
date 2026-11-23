
import {
  createNotificationSchema,
  notificationIdSchema,
  notificationListQuerySchema,
  notificationInboxQuerySchema,
} from "./notification.validation.js";

import {
  createAndSendNotification,
  listChurchNotifications,
  getChurchNotification,
  cancelChurchNotification,
  listMemberNotifications,
  markMemberNotificationRead,
  markAllMemberNotificationsRead,
} from "./notification.service.js";

export async function createChurchNotification(req, res, next) {
  try {
    const data = createNotificationSchema.parse(req.body);

    const result = await createAndSendNotification(
      req.church.id,
      req.churchMembership.id,
      data
    );

    res.status(201).json({
      success: true,
      message: "Notification sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getChurchNotifications(req, res, next) {
  try {
    const filters = notificationListQuerySchema.parse(req.query);

    const result = await listChurchNotifications(req.church.id, filters);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getChurchNotificationDetails(req, res, next) {
  try {
    const { notificationId } = notificationIdSchema.parse(req.params);

    const result = await getChurchNotification(
      req.church.id,
      notificationId
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function cancelNotification(req, res, next) {
  try {
    const { notificationId } = notificationIdSchema.parse(req.params);

    const result = await cancelChurchNotification(
      req.church.id,
      notificationId
    );

    res.json({
      success: true,
      message: "Notification cancelled successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyNotifications(req, res, next) {
  try {
    const filters = notificationInboxQuerySchema.parse(req.query);

    const result = await listMemberNotifications(
      req.church.id,
      req.churchMembership.id,
      filters
    );

    res.json({
      success: true,
      data: result.notifications,
      unread_count: result.unread_count,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = notificationIdSchema.parse(req.params);

    const result = await markMemberNotificationRead(
      req.church.id,
      req.churchMembership.id,
      notificationId
    );

    res.json({
      success: true,
      message: "Notification marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await markAllMemberNotificationsRead(
      req.church.id,
      req.churchMembership.id
    );

    res.json({
      success: true,
      message: "Notifications marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
