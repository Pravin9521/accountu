const mongoose = require('mongoose');
const { Organization } = require('../models/organization.model');
const { User } = require('../models/user.model');
const { organizationSchema } = require('../validation/org.validation');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeOrganization = (org) => ({
  id: org._id,
  name: org.name,
  contactPhone: org.contactPhone,
  contactEmail: org.contactEmail,
  address: org.address,
  currency: org.currency,
  logoUrl: org.logoUrl,
  owner: org.owner,
  settings: org.settings,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,
});

const sanitizeMember = (org, member) => ({
  organizationId: org._id,
  userId: member.user,
  role: member.role,
});

const createOrganization = async (req, res) => {
  try {
    const { error, value } = organizationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const userId = req.user?.sub;
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const org = await Organization.create({
      ...value,
      owner: userId,
      members: [{ user: userId, role: 'admin' }],
    });

    return res.status(201).json(sanitizeOrganization(org));
  } catch (err) {
    console.error('[ORG] createOrganization error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyOrganizations = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const orgs = await Organization.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).sort({ createdAt: -1 });

    return res.json(orgs.map(sanitizeOrganization));
  } catch (err) {
    console.error('[ORG] getMyOrganizations error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid organization id' });
    }

    const org = await Organization.findOne({
      _id: id,
      $or: [{ owner: userId }, { 'members.user': userId }],
    });

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.json(sanitizeOrganization(org));
  } catch (err) {
    console.error('[ORG] getOrganizationById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid organization id' });
    }

    const { error, value } = organizationSchema.validate(req.body, {
      presence: 'optional',
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const org = await Organization.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: value },
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ message: 'Organization not found or access denied' });
    }

    return res.json(sanitizeOrganization(org));
  } catch (err) {
    console.error('[ORG] updateOrganization error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listMembers = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid organization id' });
    }

    const org = await Organization.findOne({
      _id: id,
      $or: [{ owner: userId }, { 'members.user': userId }],
    });

    if (!org) {
      return res.status(404).json({ message: 'Organization not found or access denied' });
    }

    const members = org.members.map((m) => sanitizeMember(org, m));

    return res.json({
      owner: {
        organizationId: org._id,
        userId: org.owner,
        role: 'admin',
      },
      members,
    });
  } catch (err) {
    console.error('[ORG] listMembers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const addMember = async (req, res) => {
  try {
    const ownerId = req.user?.sub;
    const { id } = req.params;
    const { email, role } = req.body;

    if (!ownerId || !isValidObjectId(ownerId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid organization id' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Member email is required' });
    }

    const org = await Organization.findOne({ _id: id, owner: ownerId });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found or access denied' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with given email not found' });
    }

    if (String(user._id) === String(org.owner)) {
      return res.status(400).json({ message: 'Owner is already an admin member' });
    }

    const alreadyMember = org.members.some(
      (m) => String(m.user) === String(user._id)
    );
    if (alreadyMember) {
      return res.status(409).json({ message: 'User is already a member' });
    }

    const memberRole = role === 'admin' ? 'admin' : 'staff';

    org.members.push({ user: user._id, role: memberRole });
    await org.save();

    const members = org.members.map((m) => sanitizeMember(org, m));

    return res.status(201).json({
      owner: {
        organizationId: org._id,
        userId: org.owner,
        role: 'admin',
      },
      members,
    });
  } catch (err) {
    console.error('[ORG] addMember error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const ownerId = req.user?.sub;
    const { id, memberId } = req.params;

    if (!ownerId || !isValidObjectId(ownerId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isValidObjectId(id) || !isValidObjectId(memberId)) {
      return res.status(400).json({ message: 'Invalid organization id or member id' });
    }

    const org = await Organization.findOne({ _id: id, owner: ownerId });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found or access denied' });
    }

    if (String(memberId) === String(org.owner)) {
      return res.status(400).json({ message: 'Cannot remove organization owner' });
    }

    const originalLength = org.members.length;
    org.members = org.members.filter(
      (m) => String(m.user) !== String(memberId)
    );

    if (org.members.length === originalLength) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await org.save();

    const members = org.members.map((m) => sanitizeMember(org, m));

    return res.json({
      owner: {
        organizationId: org._id,
        userId: org.owner,
        role: 'admin',
      },
      members,
    });
  } catch (err) {
    console.error('[ORG] removeMember error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  updateOrganization,
  listMembers,
  addMember,
  removeMember,
};
