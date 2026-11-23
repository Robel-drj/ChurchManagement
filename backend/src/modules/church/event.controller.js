import { z } from "zod";
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
  eventActionSchema,
} from "./event.validation.js";

import {
  createEvent,
  listManageEvents,
  getManageEvent,
  updateEvent,
  changeEventStatus,
  addEventMedia,
  removeEventMedia,
  deleteEvent,
  listPublishedEvents,
  getPublishedEvent,
} from "./event.service.js";

function sendError(res, error) {
  console.error("Event controller error:", error);

  const status = error.status || error.statusCode || 500;

  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error.",
  });
}

export async function createChurchEvent(req, res) {
  try {
    const data = createEventSchema.parse(req.body);

    const event = await createEvent(
      req.church.id,
      req.churchMembership.id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      data: event,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

export async function getChurchEvents(req, res) {
  try {
    const query = listEventsQuerySchema.parse(req.query);
    const result = await listManageEvents(req.church.id, query);

    return res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

export async function getChurchEvent(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const event = await getManageEvent(req.church.id, eventId);

    return res.json({ success: true, data: event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    return sendError(res, error);
  }
}

export async function editChurchEvent(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const data = updateEventSchema.parse(req.body);

    const event = await updateEvent(req.church.id, eventId, data);

    return res.json({
      success: true,
      message: "Event updated successfully.",
      data: event,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

export async function updateChurchEventStatus(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const { action } = eventActionSchema.parse(req.body);

    const event = await changeEventStatus(
      req.church.id,
      eventId,
      action
    );

    return res.json({
      success: true,
      message: `Event ${action} successful.`,
      data: event,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID or action.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

export async function uploadChurchEventMedia(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);

    const media = await addEventMedia(
      req.church.id,
      eventId,
      req.files
    );

    return res.status(201).json({
      success: true,
      message: "Event media uploaded successfully.",
      data: media,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    return sendError(res, error);
  }
}

export async function deleteChurchEventMedia(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const mediaId = eventIdSchema.parse(req.params.mediaId);

    const result = await removeEventMedia(
      req.church.id,
      eventId,
      mediaId
    );

    return res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event or media ID.",
      });
    }

    return sendError(res, error);
  }
}

export async function removeChurchEvent(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);

    const result = await deleteEvent(req.church.id, eventId);

    return res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    return sendError(res, error);
  }
}

export async function getPublishedChurchEvents(req, res) {
  try {
    const query = listEventsQuerySchema
      .omit({ status: true })
      .parse(req.query);

    const result = await listPublishedEvents(req.church.id, query);

    return res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

export async function getPublishedChurchEvent(req, res) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);

    const event = await getPublishedEvent(req.church.id, eventId);

    return res.json({ success: true, data: event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    return sendError(res, error);
  }
}
