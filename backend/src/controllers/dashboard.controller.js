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

const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const customers = await Customer.find({ org: org._id });
    const transactions = await Transaction.find({ org: org._id });

    let totalReceivable = 0;
    let totalPayable = 0;
    let totalInterestAccrued = 0;

    const customerMap = new Map();
    customers.forEach((c) => {
      customerMap.set(String(c._id), c);
    });

    const txByCustomer = new Map();
    transactions.forEach((tx) => {
      const key = String(tx.customer);
      if (!txByCustomer.has(key)) {
        txByCustomer.set(key, []);
      }
      txByCustomer.get(key).push(tx);
    });

    txByCustomer.forEach((custTxs, customerId) => {
      const customer = customerMap.get(customerId);
      if (!customer) return;

      const summary = getInterestSummaryForCustomer({
        openingBalance: customer.openingBalance,
        transactions: custTxs,
        interestSettings: org.settings?.interest || {},
        asOf: new Date(),
      });

      const balance = summary.outstandingBalance;
      if (balance > 0) {
        totalReceivable += balance;
      } else if (balance < 0) {
        totalPayable += Math.abs(balance);
      }

      totalInterestAccrued += summary.interestAccrued || 0;
    });

    const recentTransactions = await Transaction.find({ org: org._id })
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(10)
      .populate('customer', 'name phone email');

    return res.json({
      totals: {
        receivable: totalReceivable,
        payable: totalPayable,
        interestAccrued: totalInterestAccrued,
        currency: org.currency,
      },
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx._id,
        customer: tx.customer
          ? {
              id: tx.customer._id,
              name: tx.customer.name,
              phone: tx.customer.phone,
              email: tx.customer.email,
            }
          : null,
        type: tx.type,
        amount: tx.amount,
        note: tx.note,
        transactionDate: tx.transactionDate,
        createdAt: tx.createdAt,
      })),
    });
  } catch (err) {
    console.error('[DASHBOARD] getDashboardOverview error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const pipeline = [
      {
        $match: {
          org: org._id,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
          },
          totalCredit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0],
            },
          },
          totalDebit: {
            $sum: {
              $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ];

    const results = await Transaction.aggregate(pipeline);

    const monthly = results.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      totalCredit: row.totalCredit,
      totalDebit: row.totalDebit,
      net: row.totalCredit - row.totalDebit,
      count: row.count,
    }));

    return res.json({
      currency: org.currency,
      monthly,
    });
  } catch (err) {
    console.error('[DASHBOARD] getMonthlyReport error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboardOverview,
  getMonthlyReport,
};

