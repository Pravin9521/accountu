const express = require('express');

const {
  sendManualReminder,
  runOrgReminders,
  listOrgReminders,
  createScheduledReminder
} = require('../controllers/reminder.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });


/*
 send reminder immediately
*/
router.post(
  '/customers/:customerId/reminders/send',
  authMiddleware,
  sendManualReminder
);


/*
 run automatic reminders for all customers
*/
router.post(
  '/reminders/run',
  authMiddleware,
  runOrgReminders
);


/*
 list reminders
*/
router.get(
  '/reminders',
  authMiddleware,
  listOrgReminders
);


/*
 create scheduled reminder (date + repeat)
*/
router.post(
  '/customers/:customerId/reminders',
  authMiddleware,
  createScheduledReminder
);


module.exports = router;