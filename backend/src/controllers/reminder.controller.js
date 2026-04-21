const mongoose = require('mongoose');
const { Organization } = require('../models/organization.model');
const { Customer } = require('../models/customer.model');
const { Transaction } = require('../models/transaction.model');
const { Reminder, REMINDER_STATUS } = require('../models/reminder.model');
const { getInterestSummaryForCustomer } = require('../utils/interest');
const { buildReminderMessage, sendReminderMessage } = require('../utils/reminder');
const {
  manualReminderSchema,
  orgRunReminderSchema,
} = require('../validation/reminder.validation');

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
const createScheduledReminder = async (req, res) => {

 try{

   const userId = req.user?.sub;

   const { orgId, customerId } = req.params;

   const org = await ensureOrgAccess(userId, orgId);

   if (!org) {
     return res.status(403).json({
       message: "Access denied to organization"
     });
   }

   const {
     message,
     dueAmount,
     reminderDate,
     repeat,
     channel
   } = req.body;

   const reminder = await Reminder.create({

    org: org._id,
    customer: customerId,
    message,
    dueAmount,
    reminderDate,
    repeat,
    nextRun: reminderDate,
    channel,
    status: REMINDER_STATUS.SCHEDULED,
    isManual: false
   });

  res.status(201).json(reminder);
  }catch(err){
     console.error("createScheduledReminder error", err);
     res.status(500).json({
     message: "failed to create reminder"
   });
 }
};
const sendManualReminder = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId, customerId } = req.params;

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

    const { error, value } = manualReminderSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const transactions = await Transaction.find({
      org: org._id,
      customer: customer._id,
    }).sort({ transactionDate: 1, createdAt: 1 });

    const summary = getInterestSummaryForCustomer({
      openingBalance: customer.openingBalance,
      transactions,
      interestSettings: org.settings?.interest || {},
      asOf: new Date(),
    });

    const dueAmount = value.amount != null ? value.amount : summary.totalDue;

    const reminderSettings = org.settings?.reminder || {};
    const channel = value.channel || reminderSettings.channel || 'email';
    const template =
      value.template || reminderSettings.template ||
      'Hello [Name], this is a friendly reminder that ₹[Amount] is pending in your account with [Business Name]. Please clear dues at your convenience.';

    const message = buildReminderMessage(template, {
      name: customer.name,
      amount: dueAmount,
      businessName: org.name,
    });

    const to = customer.phone || customer.email || '';

    const sendResult = await sendReminderMessage({
      channel,
      to,
      message,
    });

    const reminder = await Reminder.create({
      org: org._id,
      customer: customer._id,
      channel,
      message,
      dueAmount,
      isManual: true,
      scheduledAt: new Date(),
      sentAt: sendResult.success ? new Date() : null,
      status: sendResult.success ? REMINDER_STATUS.SENT : REMINDER_STATUS.FAILED,
      error: sendResult.success ? undefined : 'Failed to send',
    });

    return res.status(201).json({
      reminderId: reminder._id,
      status: reminder.status,
      channel,
      message,
      dueAmount,
    });
  } catch (err) {
    console.error('[REMINDER] sendManualReminder error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const runOrgReminders = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const { error, value } = orgRunReminderSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const reminderSettings = org.settings?.reminder || {};
    if (!reminderSettings.enabled) {
      return res.json({ message: 'Automatic reminders are disabled for this organization' });
    }

    const channel = value.channel || reminderSettings.channel || 'email';
    const template =
      reminderSettings.template ||
      'Hello [Name], this is a friendly reminder that ₹[Amount] is pending in your account with [Business Name]. Please clear dues at your convenience.';

    const customers = await Customer.find({ org: org._id });

    let sentCount = 0;

    for (const customer of customers) {
      const transactions = await Transaction.find({
        org: org._id,
        customer: customer._id,
      }).sort({ transactionDate: 1, createdAt: 1 });

      const summary = getInterestSummaryForCustomer({
        openingBalance: customer.openingBalance,
        transactions,
        interestSettings: org.settings?.interest || {},
        asOf: new Date(),
      });

      if (summary.totalDue <= 0) {
        // Skip customers with no dues
        continue;
      }

      const message = buildReminderMessage(template, {
        name: customer.name,
        amount: summary.totalDue,
        businessName: org.name,
      });

      const to = customer.phone || customer.email || '';

      const sendResult = await sendReminderMessage({
        channel,
        to,
        message,
      });

      await Reminder.create({
        org: org._id,
        customer: customer._id,
        channel,
        message,
        dueAmount: summary.totalDue,
        isManual: false,
        scheduledAt: new Date(),
        sentAt: sendResult.success ? new Date() : null,
        status: sendResult.success ? REMINDER_STATUS.SENT : REMINDER_STATUS.FAILED,
        error: sendResult.success ? undefined : 'Failed to send',
      });

      if (sendResult.success) {
        sentCount += 1;
      }
    }

    return res.json({
      message: 'Automatic reminders run completed',
      sentCount,
      channel,
    });
  } catch (err) {
    console.error('[REMINDER] runOrgReminders error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listOrgReminders = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { org: org._id };

    const [items, total] = await Promise.all([
      Reminder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Reminder.countDocuments(query),
    ]);

    return res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (err) {
    console.error('[REMINDER] listOrgReminders error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  sendManualReminder,
  runOrgReminders,
  listOrgReminders,
  createScheduledReminder
};

