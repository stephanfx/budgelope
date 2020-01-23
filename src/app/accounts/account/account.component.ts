import { Component, OnInit, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { AccountService } from '../account.service';
import { Account } from '../../shared/account';
import { TransactionService } from '../../../app/transactions/transaction.service';
import { AuthService } from '../../../app/shared/auth.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: 'account.component.html'
})
export class AccountComponent implements OnInit {
  thisUser: string;

  accName: string;
  accStartingBalance: number;

  account: Account;
  accountId: any;
  accountType: string;
  budgetId: string;

  constructor(
    private accountService: AccountService,
    public dialogRef: MatDialogRef<AccountComponent>,
    private db: AngularFirestore,
    private transactionService: TransactionService,
    private auth: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.db
      .doc<any>('users/' + this.auth.currentUserId)
      .valueChanges()
      .subscribe(profile => {
        this.budgetId = profile.activeBudget;

        if (this.data.accountId !== 'add') {
          const accRef = 'budgets/' + this.data.budgetId + '/accounts/' + this.data.accountId;
          this.db
            .doc<Account>(accRef)
            .valueChanges()
            .subscribe(account => {
              this.account = account;
              this.accStartingBalance = account.balance;
            });
        } else {
          this.account = new Account();
        }
      });
  }

  onSaveAccount() {
    if (this.accountId !== 'add') {
      this.editAccount();
    } else {
      this.createAccount();
    }
  }

  editAccount() {
    const accountRef = 'budgets/' + this.budgetId + '/accounts/' + this.data.accountId;

    // starting balance was changed create a starting balance
    if (this.account.balance !== this.accStartingBalance) {
      // console.log(this.account, this.accStartingBalance);
      this.transactionService.createStartingBalance(this.data.accountId, this.budgetId, this.account.balance);
    } else {
      this.db.doc<Account>(accountRef).update(this.account);
    }
  }

  createAccount() {
    this.accountService.createAccount(this.budgetId, this.account).then(docRef => {
      this.transactionService.createStartingBalance(docRef.id, this.budgetId, this.account.balance);
    });
  }

  onCancel() {
    this.dialogRef.close('Pizza!');
  }
}
