import { Injectable } from '@angular/core';
import { DefaultDataService, HttpUrlGenerator, Logger } from '@ngrx/data';
import { AngularFirestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../../app/shared/user.service';
import { Profile } from '../../../app/shared/profile';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Update } from '@ngrx/entity';

@Injectable({
  providedIn: 'root'
})
export class UserDataService extends DefaultDataService<Profile> {
  activeBudgetID: string;

  constructor(
    public db: AngularFirestore,
    http: HttpClient,
    httpUrlGenerator: HttpUrlGenerator,
    logger: Logger,
    private userService: UserService
  ) {
    super('Profile', http, httpUrlGenerator);
    this.userService.getProfile$().subscribe(profile => {
      this.activeBudgetID = profile.activeBudget;
      logger.log('ProfileDataService -> this.activeBudgetID:', this.activeBudgetID);
    });
  }

  getAll(): Observable<Profile[]> {
    return of([] as Profile[]);
  }

  getWithQuery(params: any): Observable<Profile[]> {
    return this.db
      .collection<Profile>('users/' + this.activeBudgetID, ref => ref.orderBy(params.orderBy))
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data() as Profile;
            const id = a.payload.doc.id;
            return { id, ...data };
          });
        })
      );
  }

  update(profile: Update<Profile>): Observable<Profile> {
    const docRef = 'users/' + this.activeBudgetID;
    this.db.doc(docRef).update(profile.changes);
    return of(profile.changes as Profile);
  }
}
