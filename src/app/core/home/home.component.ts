import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../analytics.service';
import { Observable, Subscription, of, Subject } from 'rxjs';
import * as moment from 'moment';
// import { ObservableMedia, MediaChange } from '@angular/flex-layout';
import { AccountService } from '../../accounts/account.service';
import { Account } from '../../shared/account';
import { takeUntil, map } from 'rxjs/operators';
import { UserService } from '../../../app/shared/user.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  templateUrl: 'home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  items: Observable<any[]>;
  accounts: Observable<Account[]>;
  currentMonth: string;
  sideNavState: any = {};
  watcher: Subscription;
  activeMediaQuery = '';
  theUser = true;
  isHandset$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(results => results.matches));

  unsubscribe = new Subject<any>();

  constructor(
    private _analytics: AnalyticsService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private accountService: AccountService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this._analytics.pageView('/');
    this.currentMonth = moment().format('YYYYMM');
    this.userService
      .getProfile$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(profile => {
        this.accounts = this.accountService.getAll();
      });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  navigateTo(accountId) {
    this.router.navigate(['/app/transactions', { accountId: accountId }]);
  }

  gotoBudget() {
    const shortDate = moment().format('YYYYMM');
    this.router.navigate(['/app/budget/' + shortDate]);
  }
}
