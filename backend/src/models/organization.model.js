const mongoose = require('mongoose');
const { USER_ROLES } = require('./user.model');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STAFF,
    },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    settings: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      interest: {
        type: {
          interestType: {
            type: String,
            enum: ['simple', 'compound'],
            default: 'simple',
          },
          rate: {
            type: Number,
            default: 0,
            min: 0,
          },
          startAfterDays: {
            type: Number,
            default: 0,
            min: 0,
          },
          frequency: {
            type: String,
            enum: ['daily', 'monthly', 'yearly'],
            default: 'monthly',
          },
        },
        default: {},
      },
      reminder: {
        type: {
          channel: {
            type: String,
            enum: ['email', 'sms', 'whatsapp'],
            default: 'email',
          },
          frequencyDays: {
            type: Number,
            default: 7,
            min: 1,
          },
          template: {
            type: String,
            default:
              'Hello [Name], this is a friendly reminder that ₹[Amount] is pending in your account with [Business Name]. Please clear dues at your convenience.',
          },
          enabled: {
            type: Boolean,
            default: false,
          },
        },
        default: {},
      },
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = {
  Organization,
};

