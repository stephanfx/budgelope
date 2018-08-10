import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import * as firebase from 'firebase';
import * as moment from 'moment';

import { Transaction } from '../shared/transaction';
import { Account } from '../shared/account';
import { Category } from '../shared/category';
import { Payee } from '../shared/payee';
import { Budget } from '../shared/budget';
import { CategoryService } from '../categories/category.service';
import { AccountService } from '../accounts/account.service';
import { BudgetService } from '../budgets/budget.service';

@Injectable()
export class TransactionService {
  transactions: Transaction[];

  constructor(
    private db: AngularFirestore,
    private categoryService: CategoryService,
    private accountService: AccountService,
    private budgetService: BudgetService
  ) {}

  /**
   * Get all transactions with the id of the transactions
   * @param  budgetId Current active budget for the user id
   * @return          the observable for the transactions.
   */
  getTransactions(budgetId: string): Observable<Transaction[]> {
    const transRef = '/budgets/' + budgetId + '/transactions';

    return this.db
      .collection<Transaction>(transRef, ref => ref.orderBy('date', 'desc'))
      .snapshotChanges()
      .pipe(
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data() as Transaction;
            const id = a.payload.doc.id;
            // convert timestamp object from firebase to date object if object
            const dateObj = a.payload.doc.get('date');
            if (typeof dateObj === 'string') {
              data.date = new Date(dateObj);
            } else if (typeof dateObj === 'object') {
              data.date = dateObj.toDate();
            }

            data.id = id;
            return { id, ...data };
          })
        )
      );
  }

  getTransaction(budgetId: string, transactionId: string): Observable<Transaction> {
    const transRef = 'budgets/' + budgetId + '/transactions/' + transactionId;
    return this.db.doc<Transaction>(transRef).valueChanges();
  }

  updateAccount(
    budgetId: string,
    currentTransaction: Transaction,
    currentAccount: Account,
    newAccount: Account
  ) {
    const accountRef = 'budgets/' + budgetId + '/accounts/' + currentTransaction.account.accountId;
    currentAccount.balance -= currentTransaction.amount;
    this.db.doc(accountRef).update(currentAccount);
    currentTransaction.accountDisplayName = newAccount.name;
    currentTransaction.account = {
      accountId: newAccount.id,
      accountName: newAccount.name
    };
    newAccount.balance += currentTransaction.amount;
    this.db.doc('budgets/' + budgetId + '/accounts/' + newAccount.id).update(newAccount);
  }

  updateTransaction(
    transactionId: string,
    transaction: Transaction,
    account: Account,
    category: Category,
    budget: Budget
  ) {}

  createStartingBalance(account: Account, budget: Budget) {}


  calculateAmount(transaction: Transaction): number {
    let amount = 0;
    transaction.categories.forEach(category => {
      const amountIn = +category.in,
            amountOut = +category.out;
      amount = amount + amountIn - amountOut;
    });

    if (amount > 0) {
      transaction.in = amount;
    } else {
      transaction.out = Math.abs(amount);
    };
    return amount;
  }
  /**
   * Creates a new transaction and updates the relevant paths with the correct
   * data sets
   *
   * TODO: This needs to be modelled :P
   *
   * @param  {any}    transaction [description]
   * @param  {string} userId      [description]
   * @param  {string} budgetId    [description]
   * @return {[type]}             [description]
   */
  createTransaction(
    transaction: Transaction,
    account: Account,
    categories: { category: Category; in: number; out: number }[],
    budget: Budget,
    userId: string,
    budgetId: string
  ) {
    const items = this.db.collection<Transaction>('budgets/' + budgetId + '/transactions'),
      shortDate = moment(transaction.date).format('YYYYMM');

    if (!budget.allocations[shortDate]) {
      budget.allocations[shortDate] = {
        expense: 0,
        income: 0
      };
    }

    // ensure value is negative if it is an expense.
    if (transaction.amount > 0) {
      budget.balance += transaction.amount;
      budget.allocations[shortDate].income += transaction.amount;
    } else {
      budget.allocations[shortDate].expense += Math.abs(transaction.amount);
    }

    return new Promise((resolve, reject) => {
      items.add(transaction.toObject).then(
        response => {
          account.balance += transaction.amount;
          categories.forEach(category => {
            this.categoryService.updateCategoryBudget(budgetId, category, shortDate);
          });
          console.log(account);
          this.accountService.updateAccount(account);
          this.budgetService.updateBudget(budget);
          resolve(response);
        },
        error => {
          reject(error);
        }
      );
    });
  }
}
