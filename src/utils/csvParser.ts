import fs from 'fs';
import csvParser from 'csv-parser';
import { getFullChartOfAccounts, findMatchingAccountCategory } from './chartOfAccounts';

export interface CSVTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  accountCode?: string;
  [key: string]: any; // For additional fields
}

export const parseCSVFile = (filePath: string): Promise<CSVTransaction[]> => {
  return new Promise(async (resolve, reject) => {
    const results: CSVTransaction[] = [];
    const chartOfAccounts = await getFullChartOfAccounts();

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        // Try to parse the csv row into our expected format
        try {
          const transaction: CSVTransaction = {
            date: data.date || data.Date || data.DATE || data.transaction_date || '',
            description: data.description || data.Description || data.DESC || data.narrative || '',
            amount: parseFloat(data.amount || data.Amount || data.AMOUNT || '0'),
            type: parseTransactionType(data)
          };

          // Only include valid transactions
          if (transaction.date && transaction.description && !isNaN(transaction.amount)) {
            // Try to categorize the transaction
            const accountCode = findMatchingAccountCategory(
              transaction.description, 
              transaction.amount,
              chartOfAccounts
            );
            
            if (accountCode) {
              transaction.accountCode = accountCode;
            }
            
            results.push(transaction);
          }
        } catch (error) {
          console.error('Error parsing CSV row:', error, data);
          // Continue processing remaining rows
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const parseTransactionType = (data: any): 'debit' | 'credit' => {
  // Different banks use different formats
  if (data.type && typeof data.type === 'string') {
    const type = data.type.toLowerCase();
    if (type === 'debit' || type === 'dr' || type === 'd') return 'debit';
    if (type === 'credit' || type === 'cr' || type === 'c') return 'credit';
  }
  
  // Try to infer from amount
  // Some CSVs use negative values for debits
  if (data.amount && parseFloat(data.amount) < 0) {
    return 'debit';
  }
  
  // If there's a separate debit and credit column
  if (data.debit && parseFloat(data.debit) > 0) {
    return 'debit';
  }
  
  if (data.credit && parseFloat(data.credit) > 0) {
    return 'credit';
  }
  
  // Default
  return 'debit';
};