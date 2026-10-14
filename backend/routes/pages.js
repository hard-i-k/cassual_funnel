const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

/**
 * @route   GET /api/pages
 * @desc    Fetch distinct page URLs that have recorded interactions
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    // 1. Get distinct pages that have clicks
    const clickPages = await Event.distinct('page_url', {
      event_type: 'click',
      page_url: { $ne: null },
    });

    // 2. Get distinct pages across all events
    const allPages = await Event.distinct('page_url', {
      page_url: { $ne: null },
    });

    // 3. Count clicks per page for UI display
    const pageStats = await Event.aggregate([
      { $match: { event_type: 'click', page_url: { $ne: null } } },
      { $group: { _id: '$page_url', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
    ]);

    // Build combined unique list with click pages first
    const combinedSet = new Set([...clickPages, ...allPages]);
    const validPages = Array.from(combinedSet).filter(
      (p) => typeof p === 'string' && p.trim().length > 0
    );

    return res.json({
      success: true,
      count: validPages.length,
      pages: validPages,
      click_pages: clickPages,
      stats: pageStats,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
