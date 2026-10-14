const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * @route   GET /api/sessions
 * @desc    Fetch list of sessions with event counts and timestamps using aggregation
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const sessions = await Event.aggregate([
      {
        $group: {
          _id: '$session_id',
          total_events: { $sum: 1 },
          page_views: {
            $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] },
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] },
          },
          first_seen: { $min: '$timestamp' },
          last_seen: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          _id: 0,
          session_id: '$_id',
          total_events: 1,
          event_count: '$total_events', // Alias for flexible frontend integration
          page_views: 1,
          clicks: 1,
          first_seen: 1,
          last_seen: 1,
        },
      },
      {
        $sort: { last_seen: -1 },
      },
    ]);

    res.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sessions/:sessionId/events
 * @desc    Fetch all events for a specific session ordered by timestamp (User Journey)
 * @access  Public
 */
router.get('/:sessionId/events', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId path parameter is required',
      });
    }

    const events = await Event.find({ session_id: sessionId })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      success: true,
      session_id: sessionId,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
