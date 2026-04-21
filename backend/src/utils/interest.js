const MS_PER_DAY = 24 * 60 * 60 * 1000;

const diffInDays = (start, end) => {
  const s = new Date(start).setHours(0, 0, 0, 0);
  const e = new Date(end).setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((e - s) / MS_PER_DAY));
};

const computeOutstandingBalance = (openingBalance, transactions) => {
  let balance = openingBalance || 0;

  transactions.forEach((tx) => {
    if (tx.type === 'credit') {
      balance += tx.amount;
    } else if (tx.type === 'debit') {
      balance -= tx.amount;
    }
  });

  return balance;
};

const calculateSimpleInterest = (principal, ratePercent, days) => {
  if (principal <= 0 || ratePercent <= 0 || days <= 0) {
    return 0;
  }

  const years = days / 365;
  const rate = ratePercent / 100;

  return principal * rate * years;
};

const calculateCompoundInterest = (principal, ratePercent, days, frequency) => {
  if (principal <= 0 || ratePercent <= 0 || days <= 0) {
    return 0;
  }

  const years = days / 365;
  const rate = ratePercent / 100;

  let n = 1;
  if (frequency === 'daily') {
    n = 365;
  } else if (frequency === 'monthly') {
    n = 12;
  } else {
    n = 1;
  }

  const amountWithInterest = principal * Math.pow(1 + rate / n, n * years);

  return amountWithInterest - principal;
};

const getInterestSummaryForCustomer = ({
  openingBalance = 0,
  transactions = [],
  interestSettings = {},
  asOf = new Date(),
}) => {
  const {
    interestType = 'simple',
    rate = 0,
    startAfterDays = 0,
    frequency = 'monthly',
  } = interestSettings || {};

  const outstandingBalance = computeOutstandingBalance(openingBalance, transactions);
  const principal = Math.max(0, outstandingBalance);

  if (principal <= 0 || rate <= 0) {
    return {
      outstandingBalance,
      interestAccrued: 0,
      totalDue: outstandingBalance,
    };
  }

  if (!transactions.length) {
    return {
      outstandingBalance,
      interestAccrued: 0,
      totalDue: outstandingBalance,
    };
  }

  const firstTxDate = transactions[0].transactionDate || transactions[0].createdAt || new Date();

  const startDate = new Date(firstTxDate.getTime() + (startAfterDays || 0) * MS_PER_DAY);

  if (startDate > asOf) {
    return {
      outstandingBalance,
      interestAccrued: 0,
      totalDue: outstandingBalance,
    };
  }

  const days = diffInDays(startDate, asOf);

  let interestAccrued = 0;

  if (interestType === 'compound') {
    interestAccrued = calculateCompoundInterest(principal, rate, days, frequency);
  } else {
    interestAccrued = calculateSimpleInterest(principal, rate, days);
  }

  const totalDue = principal + interestAccrued;

  return {
    outstandingBalance,
    interestAccrued,
    totalDue,
    meta: {
      principal,
      ratePercent: rate,
      interestType,
      days,
      frequency,
      startDate,
      asOf,
    },
  };
};

module.exports = {
  computeOutstandingBalance,
  calculateSimpleInterest,
  calculateCompoundInterest,
  getInterestSummaryForCustomer,
};

