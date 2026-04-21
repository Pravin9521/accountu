const Joi = require('joi');

const transactionCreateSchema = Joi.object({
  customerId: Joi.string().required(),
  type: Joi.string().valid('credit', 'debit').required(),
  amount: Joi.number().positive().required(),
  note: Joi.string().max(500).allow('', null),
  transactionDate: Joi.date().optional(),
});

module.exports = {
  transactionCreateSchema,
};

