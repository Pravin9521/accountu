const mongoose = require('mongoose');
const { Organization } = require('../models/organization.model');
const { Customer } = require('../models/customer.model');
const { Transaction } = require('../models/transaction.model');
const { transactionCreateSchema } = require('../validation/transaction.validation');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureOrgAccess = async (userId, orgId) => {
  if (!userId || !orgId || !isValidObjectId(userId) || !isValidObjectId(orgId)) {
    return null;
  }

  const org = await Organization.findOne({
    _id: orgId,
    $or: [{ owner: userId }, { 'members.user': userId }],
  });

  return org;
};

const sanitizeTransaction = (tx) => ({
  id: tx._id,
  org: tx.org,
  customer: tx.customer,
  type: tx.type,
  amount: tx.amount,
  note: tx.note,
  transactionDate: tx.transactionDate,
  createdAt: tx.createdAt,
  updatedAt: tx.updatedAt,
});

const createTransaction = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const { error, value } = transactionCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { customerId, type, amount, note, transactionDate } = value;

    if (!isValidObjectId(customerId)) {
      return res.status(400).json({ message: 'Invalid customer id' });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      org: org._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found for this organization' });
    }

    const tx = await Transaction.create({
      org: org._id,
      customer: customer._id,
      type,
      amount,
      note,
      transactionDate: transactionDate || new Date(),
    });

    return res.status(201).json(sanitizeTransaction(tx));
  } catch (err) {
    console.error('[TX] createTransaction error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listTransactions = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;
    const { customerId, page = 1, limit = 20, from, to } = req.query;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { org: org._id };

    if (customerId && isValidObjectId(customerId)) {
      query.customer = customerId;
    }

    if (from || to) {
      query.transactionDate = {};
      if (from) {
        query.transactionDate.$gte = new Date(from);
      }
      if (to) {
        query.transactionDate.$lte = new Date(to);
      }
    }

    const [items, total] = await Promise.all([
      Transaction.find(query)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    return res.json({
      items: items.map(sanitizeTransaction),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (err) {
    console.error('[TX] listTransactions error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId, transactionId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }

    const allowedFields = ['type', 'amount', 'note', 'transactionDate'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const tx = await Transaction.findOneAndUpdate(
      { _id: transactionId, org: org._id },
      { $set: updates },
      { new: true }
    );

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json(sanitizeTransaction(tx));
  } catch (err) {
    console.error('[TX] updateTransaction error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId, transactionId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }

    const tx = await Transaction.findOneAndDelete({
      _id: transactionId,
      org: org._id,
    });

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error('[TX] deleteTransaction error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
};

