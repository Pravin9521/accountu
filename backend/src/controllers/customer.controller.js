const mongoose = require('mongoose');
const { Organization } = require('../models/organization.model');
const { Customer } = require('../models/customer.model');
const { customerCreateSchema, customerUpdateSchema } = require('../validation/customer.validation');

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

const sanitizeCustomer = (customer) => ({
  id: customer._id,
  org: customer.org,
  name: customer.name,
  phone: customer.phone,
  email: customer.email,
  notes: customer.notes,
  category: customer.category,
  openingBalance: customer.openingBalance,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const { error, value } = customerCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const customer = await Customer.create({
      ...value,
      org: org._id,
    });

    return res.status(201).json(sanitizeCustomer(customer));
  } catch (err) {
    console.error('[CUSTOMER] createCustomer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listCustomers = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { orgId } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    const org = await ensureOrgAccess(userId, orgId);
    if (!org) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { org: org._id };

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Customer.countDocuments(query),
    ]);

    return res.json({
      items: items.map(sanitizeCustomer),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (err) {
    console.error('[CUSTOMER] listCustomers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getCustomerById = async (req, res) => {
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

    return res.json(sanitizeCustomer(customer));
  } catch (err) {
    console.error('[CUSTOMER] getCustomerById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateCustomer = async (req, res) => {
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

    const { error, value } = customerUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, org: org._id },
      { $set: value },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(sanitizeCustomer(customer));
  } catch (err) {
    console.error('[CUSTOMER] updateCustomer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteCustomer = async (req, res) => {
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

    const customer = await Customer.findOneAndDelete({
      _id: customerId,
      org: org._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('[CUSTOMER] deleteCustomer error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};

