const express = require('express');
const {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  updateOrganization,
  listMembers,
  addMember,
  removeMember,
} = require('../controllers/org.controller');

const router = express.Router();

router.post('/', createOrganization);
router.get('/', getMyOrganizations);
router.get('/:id', getOrganizationById);
router.put('/:id', updateOrganization);

router.get('/:id/members', listMembers);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

module.exports = router;

