import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { DataSource } from '@angular/cdk/collections';
import { Transaction, ITransactionID } from '../shared/transaction';
import { TransactionService, IFilter } from './transaction.service';
import { BudgetService } from '../budgets/budget.service';
import { UserService } from '../shared/user.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { IAccount } from '../../app/shared/account';
import { ImportComponent } from './import/import.component';
import { AuthService } from '../../app/shared/auth.service';
import { takeUntil, take } from 'rxjs/operators';
import { AccountComponent } from '../../app/accounts/account/account.component';
import { TransactionComponent } from './transaction/transaction.component';

@Component({
  templateUrl: 'transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  unsubscribe: Subject<any> = new Subject<any>();

  title = 'Transactions';
  userId: string;
  budgetId: string;
  accountId: string;
  account: IAccount;
  categoryId: string;
  displayedColumns = ['date', 'account', 'payee', 'category', 'out', 'in', 'cleared', 'matched'];
  dataSource: TransactionDataSource;
  newTransaction: Transaction;
  showCleared = false;
  showTransaction = false;

  selectedTransaction: Transaction;
  loading$: Observable<boolean>;

  constructor(
    private transService: TransactionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private db: AngularFirestore,
    public dialog: MatDialog
  ) {
    this.loading$ = this.transService.loading$;
  }

  ngOnInit() {

    this.db
      .doc<any>('users/' + this.authService.currentUserId)
      .valueChanges()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(profileRead => {
        this.budgetId = profileRead.activeBudget;
        this.accountId = null;
        this.dataSource = new TransactionDataSource(this.transService, profileRead.activeBudget);
        this.route.paramMap.pipe(takeUntil(this.unsubscribe)).subscribe(params => {
          if (params.get('accountId')) {
            this.accountId = params.get('accountId');
            this.db
              .doc<IAccount>('budgets/' + this.budgetId + '/accounts/' + this.accountId)
              .valueChanges()
              .pipe(takeUntil(this.unsubscribe))
              .subscribe(account => {
                this.account = account;
              });
          }
          if (params.get('categoryId')) {
            this.categoryId = params.get('categoryId');
          }
          if (params.get('id')) {
            this.showTransaction = true;
          }
          this.dataSource.loadTransactions(this.accountId, this.showCleared, this.categoryId);
        });
      });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  openTransactionModal() {
    const dialogRef = this.dialog.open(TransactionComponent, {
      data: { accountId: this.accountId, budgetId: this.budgetId }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Transaction Result', result);
    });
  }

  openDialog() {
    const dialogRef = this.dialog.open(ImportComponent, {
      data: { accountId: this.accountId, budgetId: this.budgetId, accountName: this.account.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog Result', result);
    });
  }

  openAccountDialog() {
    const dialogRef = this.dialog.open(AccountComponent, {
      data: { accountId: this.accountId, budgetId: this.budgetId, accountName: this.account.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Account Dialog Result', result);
    });
  }

  onZeroStartingBalanceClick() {
    this.transService.createStartingBalance(this.accountId, this.budgetId, 0);
  }

  onFilterClearedToggle() {
    this.dataSource.loadTransactions(this.accountId, this.showCleared);
  }

  toggleCleared(transaction: ITransactionID) {
    transaction.cleared = !transaction.cleared;
    this.transService.updateClearedStatus(this.budgetId, transaction);
  }

  selectedRow(row) {
    this.selectedTransaction = row;
    this.router.navigate(['/app/transactions', row.id]);
  }
}

export class TransactionDataSource extends DataSource<any> {
  private transactionsSubject = new BehaviorSubject<any>([]);

  constructor(private transService: TransactionService, private budgetId: string) {
    super();
  }

  connect() {
    return this.transactionsSubject.asObservable();
  }

  disconnect() {
    this.transactionsSubject.complete();
  }

  loadTransactions(accountId: string, showCleared: boolean, categoryId?: string) {
    const filter: any = {
      accountId: accountId,
      categoryId: categoryId,
      cleared: showCleared,
      budgetId: this.budgetId
    };
    if (categoryId) {
      filter.cleared = true;
    }
    this.transService.getWithQuery(filter).subscribe(transactions => {
      this.transactionsSubject.next(transactions);
    });
  }
}
