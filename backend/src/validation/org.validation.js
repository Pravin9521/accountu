const Joi = require('joi');

const organizationSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  contactPhone: Joi.string().max(30).allow('', null),
  contactEmail: Joi.string().email().allow('', null),
  address: Joi.string().max(300).allow('', null),
  currency: Joi.string().max(10).default('INR'),
  logoUrl: Joi.string().uri().allow('', null),
  settings: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    interest: Joi.object({
      interestType: Joi.string().valid('simple', 'compound').optional(),
      rate: Joi.number().min(0).optional(),
      startAfterDays: Joi.number().integer().min(0).optional(),
      frequency: Joi.string().valid('daily', 'monthly', 'yearly').optional(),
    }).optional(),
    reminder: Joi.object({
      channel: Joi.string().valid('email', 'sms', 'whatsapp').optional(),
      frequencyDays: Joi.number().integer().min(1).optional(),
      template: Joi.string().optional(),
      enabled: Joi.boolean().optional(),
    }).optional(),
  }).optional(),
});

module.exports = {
  organizationSchema,
};

