import { TestBed, async } from '@angular/core/testing';
import { TransactionService } from './transaction.service';
import { CategoryService } from '../categories/category.service';
import { AngularFirestore } from 'angularfire2/firestore';
import { Account } from '../shared/account';
import { Category } from '../shared/category';
import { Budget } from '../shared/budget';
import { Transaction } from '../shared/transaction';
import { Observable, of } from 'rxjs';
import { AccountService } from '../accounts/account.service';
import { resolve } from 'path';

describe('Transaction Service to be thing', () => {
  let service: TransactionService;
  let dbMock, categoryServiceMock, accountServiceMock, budgetServiceMock, account, category, budget, transaction;

  beforeEach(() => {
    account = new Account();
    category = new Category();
    budget = new Budget();
    transaction = new Transaction();

    dbMock = jasmine.createSpyObj('AngularFirestore', ['collection', 'doc']);
    dbMock.doc.and.returnValue({
      valueChanges: () => {}
    });
    dbMock.collection.and.returnValue({
      doc: function() {
        return {
          valueChanges: () => {
            return of({});
          },
          update: () => {
            return {
              then: () => {}
            };
          }
        };
      },
      add: () => {
        return { then: (success, failure) => { success(); } };
      }
    });
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['updateCategoryBudget']);
    accountServiceMock = jasmine.createSpyObj('AccountService', ['updateAccount']);
    budgetServiceMock = jasmine.createSpyObj('BudgetService', ['updateBudget']);
    TestBed.configureTestingModule({
      providers: [
        TransactionService,
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: AngularFirestore, useValue: dbMock }
      ]
    });

    service = new TransactionService(dbMock, categoryServiceMock, accountServiceMock, budgetServiceMock);
  });

  it('should register as a service', () => {
    const subscription = service.getTransaction('string', 'string2');
    expect(dbMock.doc).toHaveBeenCalledWith('budgets/string/transactions/string2');
  });

  it('should create a transaction with the correct values', (done: DoneFn) => {
    account.name = 'test';
    account.balance = 0;

    const resultAccount = new Account();
    resultAccount.name = 'test';
    resultAccount.balance = 5;

    const resultBudget = new Budget();
    resultBudget.allocations = {
      201801: {
        expense: 0,
        income: 5
      }
    };
    resultBudget.balance = 5;

    const categories = [
      {
        category: category,
        in: 0,
        out: 100
      }
    ];
    transaction.amount = 5;
    transaction.in = 5;
    transaction.date = new Date('2018-01-01');

    budget.allocations = {};
    budget.balance = 0;

    service
      .createTransaction(transaction, account, categories, budget, 'CurrentUser', 'CurrentBudget')
      .then(
        response => {
          expect(budgetServiceMock.updateBudget).toHaveBeenCalledWith(resultBudget);
          expect(accountServiceMock.updateAccount).toHaveBeenCalledWith(resultAccount);
          done();
        },
        error => {
          expect(error).toBe('Error thrown');
          console.log('ERROR:', error);
          done();
        }
      );

    // expect(transaction.amount).toBe(5);
  });
});
