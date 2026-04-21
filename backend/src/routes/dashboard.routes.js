const express = require('express');
const {
  getDashboardOverview,
  getMonthlyReport,
} = require('../controllers/dashboard.controller');

const router = express.Router({ mergeParams: true });

router.get('/overview', getDashboardOverview);
router.get('/monthly', getMonthlyReport);

module.exports = router;

