const mongoose = require('mongoose');

const REMINDER_STATUS = {
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  FAILED: 'failed',
};

const reminderSchema = new mongoose.Schema(
  {
    org: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      default: 'email',
    },
    message: {
      type: String,
      required: true,
    },
    dueAmount: {
      type: Number,
      required: true,
    },
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(REMINDER_STATUS),
      default: REMINDER_STATUS.SCHEDULED,
    },
    isManual: {
      type: Boolean,
      default: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ org: 1, customer: 1, status: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = {
  Reminder,
  REMINDER_STATUS,
};

