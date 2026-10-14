const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: [true, 'session_id is required'],
      index: true,
      trim: true,
    },
    event_type: {
      type: String,
      required: [true, 'event_type is required'],
      enum: {
        values: ['page_view', 'click'],
        message: '{VALUE} is not a valid event_type. Must be "page_view" or "click"',
      },
      trim: true,
    },
    page_url: {
      type: String,
      required: [true, 'page_url is required'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    click_x: {
      type: Number,
      default: null,
    },
    click_y: {
      type: Number,
      default: null,
    },
    viewport_width: {
      type: Number,
      default: null,
    },
    viewport_height: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for optimal query performance
EventSchema.index({ session_id: 1, timestamp: 1 });
EventSchema.index({ page_url: 1, event_type: 1 });

module.exports = mongoose.model('Event', EventSchema);
