import { Injectable } from '@angular/core';
import { DefaultDataService, HttpUrlGenerator, Logger } from '@ngrx/data';
import { AngularFirestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { Account } from '../../../app/shared/account';
import { Observable, of } from 'rxjs';
import { UserService } from '../../../app/shared/user.service';
import { map } from 'rxjs/operators';
import { Update } from '@ngrx/entity';

@Injectable({
  providedIn: 'root'
})
export class AccountDataService extends DefaultDataService<Account> {
  activeBudgetID: string;

  constructor(
    public db: AngularFirestore,
    http: HttpClient,
    httpUrlGenerator: HttpUrlGenerator,
    logger: Logger,
    private userService: UserService
  ) {
    super('Account', http, httpUrlGenerator);
    this.userService.getProfile$().subscribe(profile => {
      this.activeBudgetID = profile.activeBudget;
      logger.log('AccountDataService -> this.activeBudgetID:', this.activeBudgetID);
    });
  }

  getAll(): Observable<Account[]> {
    const accountRef = '/budgets/' + this.activeBudgetID + '/accounts';
    return this.db
      .collection<Account>(accountRef)
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data() as Account;
            const id = a.payload.doc.id;
            return {id, ...data};
          });
        })
      );
  }

  getWithQuery(params: any): Observable<Account[]> {
    return this.db
      .collection<Account>('budgets/' + this.activeBudgetID + '/categories', ref =>
        ref.orderBy(params.orderBy)
      )
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data() as Account;
            const id = a.payload.doc.id;
            return { id, ...data };
          });
        })
      );
  }

  update(account: Update<Account>): Observable<Account> {
    const docRef = 'budgets/' + this.activeBudgetID + '/account/' + account.id;
    this.db.doc(docRef).update(account.changes);
    return of(account.changes as Account);
  }
}
