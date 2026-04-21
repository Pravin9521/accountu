const mongoose = require('mongoose');
const { Organization } = require('../models/organization.model');
const { Customer } = require('../models/customer.model');
const { Transaction } = require('../models/transaction.model');
const { getInterestSummaryForCustomer } = require('../utils/interest');

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

const getCustomerInterestSummary = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId, customerId } = req.params;
    const { asOf } = req.query;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    if (!isValidObjectId(customerId)) {
      return res.status(400).json({ message: 'Invalid customer id' });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      org: org._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const transactions = await Transaction.find({
      org: org._id,
      customer: customer._id,
    }).sort({ transactionDate: 1, createdAt: 1 });

    const asOfDate = asOf ? new Date(asOf) : new Date();

    const summary = getInterestSummaryForCustomer({
      openingBalance: customer.openingBalance,
      transactions,
      interestSettings: org.settings?.interest || {},
      asOf: asOfDate,
    });

    return res.json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      organization: {
        id: org._id,
        name: org.name,
        currency: org.currency,
      },
      interestSettings: org.settings?.interest || {},
      summary,
    });
  } catch (err) {
    console.error('[INTEREST] getCustomerInterestSummary error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getCustomerInterestSummary,
};

