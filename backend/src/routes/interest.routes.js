const express = require('express');
const { getCustomerInterestSummary } = require('../controllers/interest.controller');

const router = express.Router({ mergeParams: true });

router.get('/summary', getCustomerInterestSummary);

module.exports = router;

