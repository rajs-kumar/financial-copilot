export interface AccountCategory {
  accountType: string;
  parentAccount?: string;
  account: string;
  description?: string;
}

export const getFullChartOfAccounts = async (): Promise<Record<string, AccountCategory>> => {
  // TODO: Implement actual chart of accounts loading
  return {
    "111": { accountType: "Income", parentAccount: "Salary", account: "Base Salary" },
    "112": { accountType: "Income", parentAccount: "Salary", account: "Bonus and commissions" },
    "113": { accountType: "Income", parentAccount: "Salary", account: "Reimbursements" },
    "114": { accountType: "Income", parentAccount: "Salary", account: "Equity compensation" },
    "231": { accountType: "Expense", parentAccount: "Daily Living", account: "Groceries and Food" },
    "232": { accountType: "Expense", parentAccount: "Daily Living", account: "Child Education" },
    "272": { accountType: "Expense", parentAccount: "Leisure", account: "Dining out" },
    "311": { accountType: "Assets", parentAccount: "Bank and Cash", account: "Cash on hand" },
    "312": { accountType: "Assets", parentAccount: "Bank and Cash", account: "Bank account 1" },
    "421": { accountType: "Liabilities", parentAccount: "Accounts Payable", account: "Credit Card 1" }
  };
};

export const findMatchingAccountCategory = (
  description: string,
  amount: number,
  chartOfAccounts: Record<string, AccountCategory>
): string | null => {
  // TODO: Implement actual account matching logic
  return null;
};

// Load and parse the Chart of Accounts
export const loadChartOfAccounts = (): Record<string, AccountCategory> => {
  // In a real application, this might be loaded from a database or file
  // Here we hardcode a subset for demonstration
  const chartOfAccounts: Record<string, AccountCategory> = {
    "111": {
      accountType: "Income",
      parentAccount: "Salary",
      account: "Base Salary",
      description: "M"
    },
    "112": {
      accountType: "Income",
      parentAccount: "Salary",
      account: "Bonus and commissions",
      description: "Y"
    },
    "113": {
      accountType: "Income",
      parentAccount: "Salary",
      account: "Reimbursements",
      description: "Medical, travel, phone, health etc"
    },
    "114": {
      accountType: "Income",
      parentAccount: "Salary",
      account: "Equity compensation",
      description: "RSU/ ESPP / Options / Grants"
    },
    "231": {
      accountType: "Expense",
      parentAccount: "Daily Living",
      account: "Groceries and Food",
      description: "M"
    },
    "232": {
      accountType: "Expense",
      parentAccount: "Daily Living",
      account: "Child Education",
      description: "Y"
    },
    "272": {
      accountType: "Expense",
      parentAccount: "Leisure",
      account: "Dining out",
      description: "M"
    },
    "311": {
      accountType: "Assets",
      parentAccount: "Bank and Cash",
      account: "Cash on hand",
      description: ""
    },
    "312": {
      accountType: "Assets",
      parentAccount: "Bank and Cash",
      account: "Bank account 1",
      description: ""
    },
    "421": {
      accountType: "Liabilities",
      parentAccount: "Accounts Payable",
      account: "Credit Card 1",
      description: ""
    }
    // Additional accounts would be loaded from the CSV file
  };

  return chartOfAccounts;
};

// Validate if an account code exists in the chart of accounts
export const validateAccountCode = (code: string, chartOfAccounts: Record<string, AccountCategory>): boolean => {
  return !!chartOfAccounts[code];
};

// Get account information by code
export const getAccountByCode = (code: string, chartOfAccounts: Record<string, AccountCategory>): AccountCategory | null => {
  return chartOfAccounts[code] || null;
};