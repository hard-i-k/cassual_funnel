const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * Validate a single event object
 * Returns an error string if invalid, or null if valid
 */
function validateEvent(event, index = null) {
  const prefix = index !== null ? `Event at index ${index}: ` : '';

  if (!event || typeof event !== 'object') {
    return `${prefix}Invalid event payload, expected an object`;
  }

  if (!event.session_id || typeof event.session_id !== 'string' || !event.session_id.trim()) {
    return `${prefix}session_id is required and must be a non-empty string`;
  }

  if (!event.event_type || !['page_view', 'click'].includes(event.event_type)) {
    return `${prefix}event_type is required and must be either 'page_view' or 'click'`;
  }

  if (!event.page_url || typeof event.page_url !== 'string' || !event.page_url.trim()) {
    return `${prefix}page_url is required and must be a non-empty string`;
  }

  if (event.timestamp !== undefined && event.timestamp !== null) {
    const parsedDate = new Date(event.timestamp);
    if (isNaN(parsedDate.getTime())) {
      return `${prefix}timestamp must be a valid date or timestamp`;
    }
  }

  if (event.click_x !== undefined && event.click_x !== null && typeof event.click_x !== 'number') {
    return `${prefix}click_x must be a number`;
  }

  if (event.click_y !== undefined && event.click_y !== null && typeof event.click_y !== 'number') {
    return `${prefix}click_y must be a number`;
  }

  if (event.viewport_width !== undefined && event.viewport_width !== null && typeof event.viewport_width !== 'number') {
    return `${prefix}viewport_width must be a number`;
  }

  if (event.viewport_height !== undefined && event.viewport_height !== null && typeof event.viewport_height !== 'number') {
    return `${prefix}viewport_height must be a number`;
  }

  return null;
}

/**
 * Normalize and clean event object before persisting
 */
function formatEvent(event) {
  return {
    session_id: event.session_id.trim(),
    event_type: event.event_type,
    page_url: event.page_url.trim(),
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    click_x: event.click_x !== undefined && event.click_x !== null ? Number(event.click_x) : null,
    click_y: event.click_y !== undefined && event.click_y !== null ? Number(event.click_y) : null,
    viewport_width: event.viewport_width !== undefined && event.viewport_width !== null ? Number(event.viewport_width) : null,
    viewport_height: event.viewport_height !== undefined && event.viewport_height !== null ? Number(event.viewport_height) : null,
  };
}

/**
 * @route   POST /api/events
 * @desc    Receive and store events (single or batch)
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;

    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty',
      });
    }

    // Determine if batch (array directly or { events: [...] }) or single object
    let rawEvents = [];
    if (Array.isArray(body)) {
      rawEvents = body;
    } else if (Array.isArray(body.events)) {
      rawEvents = body.events;
    } else if (typeof body === 'object' && body !== null) {
      rawEvents = [body];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload. Must be an event object or an array of events.',
      });
    }

    if (rawEvents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No events provided in request',
      });
    }

    // Validate all events
    const validationErrors = [];
    for (let i = 0; i < rawEvents.length; i++) {
      const err = validateEvent(rawEvents[i], rawEvents.length > 1 ? i : null);
      if (err) {
        validationErrors.push(err);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Format events
    const formattedEvents = rawEvents.map(formatEvent);

    // Insert into MongoDB
    let inserted;
    if (formattedEvents.length === 1) {
      inserted = [await Event.create(formattedEvents[0])];
    } else {
      inserted = await Event.insertMany(formattedEvents);
    }

    return res.status(201).json({
      success: true,
      message: `${inserted.length} event(s) recorded successfully`,
      count: inserted.length,
      data: formattedEvents.length === 1 ? inserted[0] : inserted,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/events
 * @desc    Fetch recent events (optional helper with pagination)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const skip = parseInt(req.query.skip, 10) || 0;
    const filter = {};

    if (req.query.session_id) {
      filter.session_id = req.query.session_id;
    }
    if (req.query.event_type) {
      filter.event_type = req.query.event_type;
    }
    if (req.query.page_url) {
      filter.page_url = req.query.page_url;
    }

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: events.length,
      total,
      data: events,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
