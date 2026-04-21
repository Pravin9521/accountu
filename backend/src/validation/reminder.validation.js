const Joi = require('joi');

const manualReminderSchema = Joi.object({
  channel: Joi.string().valid('email', 'sms', 'whatsapp').optional(),
  template: Joi.string().optional(),
  amount: Joi.number().positive().optional(),
});

const orgRunReminderSchema = Joi.object({
  channel: Joi.string().valid('email', 'sms', 'whatsapp').optional(),
});

module.exports = {
  manualReminderSchema,
  orgRunReminderSchema,
};

