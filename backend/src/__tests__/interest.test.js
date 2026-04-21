const {
  computeOutstandingBalance,
  calculateSimpleInterest,
  calculateCompoundInterest,
  getInterestSummaryForCustomer,
} = require('../utils/interest');

describe('interest utilities', () => {
  test('computeOutstandingBalance handles credit and debit correctly', () => {
    const balance = computeOutstandingBalance(0, [
      { type: 'credit', amount: 100 },
      { type: 'debit', amount: 30 },
      { type: 'credit', amount: 20 },
    ]);
    expect(balance).toBe(90);
  });

  test('calculateSimpleInterest returns zero for non-positive values', () => {
    expect(calculateSimpleInterest(0, 10, 365)).toBe(0);
    expect(calculateSimpleInterest(100, 0, 365)).toBe(0);
    expect(calculateSimpleInterest(100, 10, 0)).toBe(0);
  });

  test('calculateSimpleInterest calculates approximate yearly interest', () => {
    const interest = calculateSimpleInterest(1000, 10, 365);
    expect(interest).toBeGreaterThan(99);
    expect(interest).toBeLessThan(101);
  });

  test('calculateCompoundInterest returns zero for non-positive values', () => {
    expect(calculateCompoundInterest(0, 10, 365, 'monthly')).toBe(0);
    expect(calculateCompoundInterest(100, 0, 365, 'monthly')).toBe(0);
  });

  test('getInterestSummaryForCustomer returns zero interest when rate is zero', () => {
    const summary = getInterestSummaryForCustomer({
      openingBalance: 1000,
      transactions: [],
      interestSettings: { rate: 0 },
      asOf: new Date(),
    });
    expect(summary.interestAccrued).toBe(0);
    expect(summary.totalDue).toBe(summary.outstandingBalance);
  });
});

