import { Category } from './category';
import { Account } from './account';
import { IImportedTransaction } from '../../app/transactions/import/importedTransaction';

export interface ITransaction {
  account: { accountId: string; accountName: string };
  amount: number;
  categories: {
    [s: string]: {
      categoryName: string;
      in: number;
      out: number;
    };
  };
  cleared: boolean;
  date: Date;
  memo: string;
  payee: string;
  type: string;
  matched?: IImportedTransaction
}

export interface ITransactionID extends ITransaction {
  id: string;
  accountDisplayName: string;
  categoryDisplayName: string;
  in: number;
  out: number;
}

export class Transaction implements ITransaction {
  id?: string;
  categories: {
    [s: string]: {
      categoryName: string;
      in: number;
      out: number;
    };
  }; // object with category id for keys
  categoryDisplayName: string;
  account: { accountId: string; accountName: string } = { accountId: '', accountName: '' };
  accountDisplayName: string;
  transferAccount: { accountId: string; accountName: string } = null;
  transferAccountDisplayName: string = null;
  transferAmount = 0;
  payeeId: string = null;
  payee: string = null;
  amount = 0;
  in: number;
  out: number;
  date: Date;
  memo = '';
  type: string; // income or expense
  cleared: boolean;
  transfer = false;
  matched: IImportedTransaction;

  constructor(transactionData?: any) {
    if (transactionData) {
      if (transactionData.account) {
        this.account = {
          accountId: transactionData.account.id,
          accountName: transactionData.account.name
        };
        this.accountDisplayName = transactionData.account.accountName;
      }

      if (transactionData.categories && transactionData.categories.length > 1) {
        this.categoryDisplayName = 'Split';
      } else if (transactionData.categories && transactionData.categories[0].category) {
        this.categoryDisplayName = transactionData.categories[0].category.name;
      }

      if (transactionData.categories && transactionData.categories.length > 0) {
        const newCategories: {
          [s: string]: {
            categoryName: string;
            in: number;
            out: number;
          };
        } = {};

        transactionData.categories.forEach(item => {
          // it should have an id specified for later use
          if (item.category && item.category.id) {
            newCategories[item.category.id] = {
              categoryName: item.category.name,
              in: item.in,
              out: item.out
            };
          }
        });
        this.categories = newCategories;
      }
      if (transactionData.transferAccount) {
        this.transferAccount = transactionData.transferAccount;
      }
      this.memo = transactionData.memo ? transactionData.memo : '';
      this.transferAmount = transactionData.transferAmount ? transactionData.transferAmount : 0;
      this.transfer = transactionData.transfer ? transactionData.transfer : false;
      this.payeeId = transactionData.payeeId ? transactionData.payeeId : null;
      this.payee = transactionData.payee ? transactionData.payee : null;
      this.amount = transactionData.amount ? transactionData.amount : null;
      this.in = transactionData.in ? transactionData.in : null;
      this.out = transactionData.out ? transactionData.out : null;
      this.type = transactionData.type ? transactionData.type : null;
      this.cleared = transactionData.cleared ? true : false;
      this.date = transactionData.date ? transactionData.date : null;
    }
  }

  // get toObject(): any {
  //   return {
  //     categories: this.categories,
  //     categoryDisplayName: this.categoryDisplayName,
  //     account: this.account,
  //     accountDisplayName: this.accountDisplayName,
  //     transferAccount: this.transferAccount,
  //     transferAccountDisplayName: this.transferAccountDisplayName,
  //     transferAmount: this.transferAmount,
  //     payeeId: this.payeeId,
  //     payee: this.payee,
  //     amount: this.amount,
  //     in: this.in,
  //     out: this.out,
  //     date: this.date,
  //     type: this.type, // income or expense
  //     cleared: this.cleared,
  //     transfer: this.transfer
  //   };
  // }
}

export enum TransactionTypes {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}
