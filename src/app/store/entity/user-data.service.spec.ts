import { TestBed } from '@angular/core/testing';

import { UserDataService } from './user-data.service';
import { of } from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { HttpUrlGenerator, Logger } from '@ngrx/data';
import { UserService } from '../../../app/shared/user.service';

describe('UserDataService', () => {

  let afsMock;
  let httpMock;
  let httpGenMock;
  let loggerMock;
  let userMock;

  beforeEach(() => {
    afsMock = jasmine.createSpyObj('AngularFirestore', ['collection']);
    httpMock = jasmine.createSpyObj('HttpClient', ['get']);
    httpGenMock = jasmine.createSpyObj('HttpUrlGenerator', ['entityResource', 'collectionResource']);
    loggerMock = jasmine.createSpyObj('Logger', ['log']);
    userMock = jasmine.createSpyObj('UserService', ['getProfile$']);
    userMock.getProfile$.and.returnValue( of({
      activeBudget: '67890'
    }));

    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFirestore, useValue: afsMock },
        { provide: HttpClient, useValue: httpMock },
        { provide: HttpUrlGenerator, useValue: httpGenMock },
        { provide: Logger, useValue: loggerMock },
        { provide: UserService, useValue: userMock }
      ]
    });
  });

  it('should be created', () => {
    const service: UserDataService = TestBed.get(UserDataService);
    expect(service).toBeTruthy();
  });
});
