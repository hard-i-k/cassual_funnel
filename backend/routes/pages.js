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
    // Get distinct page URLs across all events (or click events)
    const pages = await Event.distinct('page_url');

    return res.json({
      success: true,
      count: pages.length,
      pages,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
