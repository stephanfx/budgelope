import { Injectable } from '@angular/core';
import { DefaultDataService, HttpUrlGenerator, Logger } from '@ngrx/data';
import { AngularFirestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../../app/shared/user.service';
import { Budget } from '../../../app/shared/budget';
import { Observable, of } from 'rxjs';
import { Update } from '@ngrx/entity';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BudgetDataService extends DefaultDataService<Budget> {
  activeBudgetID: string;

  constructor(
    public db: AngularFirestore,
    http: HttpClient,
    httpUrlGenerator: HttpUrlGenerator,
    public logger: Logger,
    private userService: UserService
  ) {
    super('Budget', http, httpUrlGenerator);
    this.userService.getProfile$().subscribe(profile => {
      this.activeBudgetID = profile.activeBudget;
      logger.log('BudgetDataService -> this.activeBudgetID:', this.activeBudgetID);
    });
  }

  getAll(): Observable<Budget[]> {
    return of([] as Budget[]);
  }

  getById(id: string): Observable<Budget> {
    return this.db.doc<Budget>('budgets/' + id).valueChanges();
  }

  getWithQuery(params: any): Observable<Budget[]> {
    return this.db
      .collection<Budget>('budgets/' + this.activeBudgetID, ref => ref.orderBy(params.orderBy))
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data() as Budget;
            const id = a.payload.doc.id;
            return { id, ...data };
          });
        })
      );
  }

  update(budget: Update<Budget>): Observable<Budget> {
    const docRef = 'budgets/' + this.activeBudgetID;
    this.db.doc(docRef).update(budget.changes);
    return of(budget.changes as Budget);
  }
}
