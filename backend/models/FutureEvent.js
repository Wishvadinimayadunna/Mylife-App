// ============================================
// Future Event Model
// ============================================

const mongoose = require('mongoose');

const futureEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Birthday', 'Anniversary', 'Wedding', 'Party', 'Vacation', 'Interview', 'Meeting', 'Other'],
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  eventTime: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  notes: {
    type: String
  },
  reminderOptions: {
    type: [String],
    enum: ['1_week_before', '1_day_before', 'same_day'],
    default: []
  },
  sendReminderToSpouse: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  isRecurringYearly: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
futureEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
futureEventSchema.index({ userId: 1, eventDate: 1 });

module.exports = mongoose.model('FutureEvent', futureEventSchema);
