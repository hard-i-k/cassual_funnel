const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * Controller: Get heatmap click data for a specific page URL
 * @route GET /api/heatmap?page_url=...
 */
router.get('/', async (req, res, next) => {
  try {
    const { page_url } = req.query;

    if (!page_url || !page_url.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "page_url" is required',
      });
    }

    const trimmedUrl = page_url.trim();
    let decodedUrl = trimmedUrl;
    try {
      decodedUrl = decodeURIComponent(trimmedUrl);
    } catch (e) {
      decodedUrl = trimmedUrl;
    }

    // Fetch click events for the specified page_url
    const clicks = await Event.find({
      page_url: { $in: [trimmedUrl, decodedUrl] },
      event_type: 'click',
    })
      .select('session_id page_url click_x click_y viewport_width viewport_height timestamp')
      .sort({ timestamp: -1 })
      .lean();

    return res.json({
      success: true,
      page_url: decodedUrl,
      count: clicks.length,
      clicks,
      data: clicks, // Alias for frontend compatibility
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
