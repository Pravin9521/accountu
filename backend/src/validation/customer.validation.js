const Joi = require('joi');

const customerCreateSchema = Joi.object({
  name: Joi.string().min(1).max(150).required(),
  phone: Joi.string().max(30).allow('', null),
  email: Joi.string().email().allow('', null),
  notes: Joi.string().max(500).allow('', null),
  category: Joi.string().max(100).allow('', null),
  openingBalance: Joi.number().optional(),
});

const customerUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(150).optional(),
  phone: Joi.string().max(30).allow('', null),
  email: Joi.string().email().allow('', null),
  notes: Joi.string().max(500).allow('', null),
  category: Joi.string().max(100).allow('', null),
});

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
};

