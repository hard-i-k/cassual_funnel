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

    // Build URL candidates to match with/without trailing slashes and .html
    const candidates = new Set();
    [trimmedUrl, decodedUrl].forEach((u) => {
      candidates.add(u);
      const withoutSlash = u.replace(/\/+$/, '');
      candidates.add(withoutSlash);
      candidates.add(withoutSlash + '/');

      if (withoutSlash.toLowerCase().endsWith('.html')) {
        const withoutHtml = withoutSlash.slice(0, -5);
        candidates.add(withoutHtml);
        candidates.add(withoutHtml + '/');
      } else {
        candidates.add(withoutSlash + '.html');
      }
    });

    // Also extract pathname if full URL
    let pathRegex = null;
    try {
      let pathname = trimmedUrl;
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        const parsed = new URL(trimmedUrl);
        pathname = parsed.pathname;
      }
      if (pathname && pathname !== '/') {
        const cleanPath = pathname.replace(/\/+$/, '').replace(/\.html$/i, '');
        const escaped = cleanPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pathRegex = new RegExp(`(${escaped})(\\.html)?\\/?$`, 'i');
      }
    } catch (e) {}

    const query = {
      event_type: 'click',
    };

    if (trimmedUrl.toLowerCase() !== 'all' && trimmedUrl !== '*') {
      query.$or = [
        { page_url: { $in: Array.from(candidates) } },
        ...(pathRegex ? [{ page_url: pathRegex }] : []),
      ];
    }

    // Fetch click events for the specified page_url
    const clicks = await Event.find(query)
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
