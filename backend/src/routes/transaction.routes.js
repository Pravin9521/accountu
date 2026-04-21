const express = require('express');
const {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transaction.controller');

const router = express.Router({ mergeParams: true });

router.post('/', createTransaction);
router.get('/', listTransactions);
router.put('/:transactionId', updateTransaction);
router.delete('/:transactionId', deleteTransaction);

module.exports = router;

