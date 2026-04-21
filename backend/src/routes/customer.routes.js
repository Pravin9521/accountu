const express = require('express');
const {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');

const router = express.Router({ mergeParams: true });

router.post('/', createCustomer);
router.get('/', listCustomers);
router.get('/:customerId', getCustomerById);
router.put('/:customerId', updateCustomer);
router.delete('/:customerId', deleteCustomer);

module.exports = router;

