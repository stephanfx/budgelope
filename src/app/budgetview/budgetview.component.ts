import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription, combineLatest, Observable, Subject } from 'rxjs';
import * as moment from 'moment';

import { Category } from '../shared/category';
import { Budget } from '../shared/budget';
import { BudgetService } from '../budgets/budget.service';
import { UserService } from '../shared/user.service';
import { CategoryService } from '../categories/category.service';
import { AuthService } from 'app/shared/auth.service';
import { TransactionTypes } from 'app/shared/transaction';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-budgetview',
  templateUrl: './budgetview.component.html',
  styleUrls: ['./budgetview.component.scss'],
})
export class BudgetviewComponent implements OnInit, OnDestroy {
  subscriptions = new Subscription();
  categories: any[];
  userId: string;
  activeBudget: Budget;

  selectedMonth: any = moment();
  displayMonth: any;
  nextMonth: any = moment().add(1, 'months');
  prevMonth: any = moment().subtract(1, 'months');
  monthDisplay: Date;
  originalValue: number;
  currentCategory: Category;

  categories$: Observable<Category[]>;

  sortList: any;

  isHeader = false;

  totalIncome = 0;
  totalExpense = 0;
  totalBudgeted = 0;
  totalAvailable = 0;

  budgetList: any[];
  unsubscribe = new Subject<boolean>();
  loading$: any;

  constructor(
    private db: AngularFirestore,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private userService: UserService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // if the month is specified, use that, else use the current month
    this.route.paramMap.subscribe((params) => {
      this.checkMonthParam(params.get('month'));
      this.userId = this.auth.currentUserId;
      // get active budget TODO: move to service :P
      this.db
        .doc<any>('users/' + this.auth.currentUserId)
        .valueChanges()
        .pipe(takeUntil(this.unsubscribe))
        .subscribe((profile) => {
          this.loadAvailableBudgets(profile);
          this.loadActiveBudget(profile.activeBudget);
        });

      this.categories$ = this.categoryService.entities$.pipe(
        map((categories) => {
          return this.checkAllocations(categories, this.selectedMonth).filter(
            (category) => category.type === TransactionTypes.EXPENSE
          );
        })
      );
      this.loading$ = this.categoryService.loading$;
      if (
        this.activeBudget &&
        !this.activeBudget.allocations[this.selectedMonth]
      ) {
        const allocations = {
          [this.selectedMonth]: {
            income: 0,
            expense: 0,
          },
        };
        this.activeBudget = { ...this.activeBudget, allocations };
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadAvailableBudgets(profile) {
    this.budgetList = [];
    for (const i in profile.availableBudgets) {
      if (profile.availableBudgets.hasOwnProperty(i)) {
        const budget = {
          id: i,
          name: profile.availableBudgets[i].name,
        };
        this.budgetList.push(budget);
      }
    }
  }

  /**
   * Loads the active budget from the budget service and sets the property
   * on the component
   */
  loadActiveBudget(budgetId: string): void {
    const subscription = this.budgetService.getByKey(budgetId).pipe(takeUntil(this.unsubscribe)).subscribe(
      (budget) => {
        // set the current allocation for the selected month if there is none
        if (!budget.allocations[this.selectedMonth]) {
          budget.allocations[this.selectedMonth] = {
            income: 0,
            expense: 0,
          };
        }

        this.loadCategories(budgetId);
        this.activeBudget = { id: budgetId, ...budget };
        // this.activeBudget.id = budgetId;
      },
      (error) => {
        this.router.navigate(['app/budget-create']);
      }
    );
    this.subscriptions.add(subscription);
  }

  /**
   * Loads the categories to be used ond sets it as property on the component
   * @param budgetId string
   */
  loadCategories(budgetId: string): void {
    const subscription = this.categoryService
      .getWithQuery({ budgetId: budgetId, orderBy: 'sortingOrder' })
      .subscribe((list) => {
        // filter list
        list = list.filter(
          (category) => category.type === TransactionTypes.EXPENSE
        );
        list = this.checkAllocations(list, this.selectedMonth);
        // this.sortList = [...list];
      });
    this.subscriptions.add(subscription);
  }

  /**
   * Checks the month parameter and sets the selected month and the display month
   * on the component
   * @param monthParam string The parameter passed into the component
   */
  checkMonthParam(monthParam: string) {
    // check for null and object
    if (monthParam) {
      const month = +monthParam.substr(-2, 2);
      const year = +monthParam.substr(0, 4);

      this.selectedMonth = monthParam;
      this.nextMonth = moment()
        .year(year)
        .month(month - 1)
        .add(1, 'months');
      this.prevMonth = moment()
        .year(year)
        .month(month - 1)
        .subtract(1, 'months');
      this.displayMonth = moment(this.selectedMonth + '01').format('MMMM YYYY');
    } else {
      this.selectedMonth = moment().format('YYYYMM');
      this.displayMonth = moment(this.selectedMonth + '01').format('MMMM YYYY');
    }
  }

  onBudgetActivate(id: string) {
    this.db.doc<any>('users/' + this.userId).update({ activeBudget: id });
  }

  onFreshStart() {
    this.budgetService.freshStart(this.activeBudget.id, this.userId);
  }

  onNewBudget() {
    this.router.navigate(['/app/budget-create']);
  }

  onRecalculate() {
    console.log('recalculating...');

    const data = combineLatest([
      this.db
        .collection('budgets/' + this.activeBudget.id + '/transactions')
        .valueChanges(),
      this.db
        .collection('budgets/' + this.activeBudget.id + '/categories')
        .valueChanges(),
    ]);

    data.subscribe(
      (records) => {
        console.log('Records: ', records);
        const transactions = records[0];
        const categories = records[1];

        const NetValue = transactions.reduce(
          (a: number, b: { amount: number }) => {
            a += Number(b.amount);
            return a;
          },
          0
        );
        const totalBudget = transactions.reduce(
          (
            a: { inc: number; exp: number },
            b: { amount: number; transfer: boolean }
          ): { inc: number; exp: number } => {
            if (b.transfer) {
              return a;
            }
            const amount = Number(b.amount);
            if (amount > 0) {
              a.inc += amount;
            } else {
              a.exp += amount;
            }
            return a;
          },
          { inc: 0, exp: 0 }
        );
        console.log(
          'TotalBudget: ',
          totalBudget,
          ' -- ',
          'Calculated Nett: ',
          NetValue
        );

        const plannedTotal: any = categories.reduce(
          (a: number, b: { allocations: any }) => {
            for (const key in b.allocations) {
              if (b.allocations.hasOwnProperty(key)) {
                const alloc = b.allocations[key];
                a += alloc.planned;
              }
            }
            return a;
          },
          0
        );
        console.log('PlannedTotal:', plannedTotal);
        console.log('Current: ', totalBudget['inc'] - totalBudget['exp']);
        console.log(
          'Actual Available Budget: ',
          totalBudget['inc'] - plannedTotal
        );
      },
      (err) => console.log('Err:', err),
      () => console.log('Completed!')
    );
  }

  updateCategoryOrder(categories: Category[], budgetId: string): void {
    const ref = 'budgets/' + budgetId + '/categories/';
    categories.forEach(function (category, index) {
      const newOrder = ('000' + (index + 1).toString()).slice(-3);
      // check to see if it is neccessary to update the category
      if (category.sortingOrder !== newOrder) {
        category.sortingOrder = newOrder;
        this.db.doc(ref + category.id).update(category);
      }
    }, this);
  }

  checkAllocations(categories: Category[], month: string): Category[] {
    return categories.map((category) => {
      if (!category.allocations) {
        category = { ...category, allocations: {} };
      }

      if (category.allocations && !category.allocations[month]) {
        const allocations = {
          ...category.allocations,
          [month]: { planned: 0, actual: 0 },
        };
        category = { ...category, allocations };
      }
      return category;
    });
  }

  onNextMonth() {
    this.router.navigate(['/app/budget', this.nextMonth.format('YYYYMM')]);
  }

  onPrevMonth() {
    this.router.navigate(['/app/budget', this.prevMonth.format('YYYYMM')]);
  }
  checkIsHeader(item) {
    return item.parent === '';
  }

  loadAccounts(budgetId: string) {
    const accRef = 'accounts/' + budgetId;
    // this.accounts = this.db.list(accRef);
  }

  trackCategory(index, category: Category) {
    return category ? category.id : undefined;
  }

  focus(category) {
    this.originalValue = category.allocations[this.selectedMonth].planned;
    this.currentCategory = category;
  }

  update(category, $event) {
    const currentAllocation = category.allocations[this.selectedMonth];
    const newAllocation = { ...currentAllocation, planned: $event };
    const allocations = {
      ...category.allocations,
      [this.selectedMonth]: newAllocation,
    };
    this.currentCategory = { ...category, allocations };
  }

  blur(category) {
    const currentPlanned = +category.allocations[this.selectedMonth].planned;
    const previousPlanned = +this.currentCategory.allocations[
      this.selectedMonth
    ].planned;

    if (
      typeof currentPlanned !== 'undefined' &&
      previousPlanned !== currentPlanned
    ) {
      let itemBalance = 0;
      if (isNaN(category.balance)) {
        category = { ...category, balance: 0 };
      }
      itemBalance = category.balance - currentPlanned + previousPlanned;
      category = { ...this.currentCategory, balance: itemBalance };

      // update the budget available balance
      if (isNaN(this.activeBudget.balance)) {
        this.activeBudget = { ...this.activeBudget, balance: 0 };
      }
      let budgetBalance =
        +this.activeBudget.balance - previousPlanned + currentPlanned;
      this.activeBudget = { ...this.activeBudget, balance: budgetBalance };
      if (!isNaN(category.balance) && !isNaN(this.activeBudget.balance)) {
        this.categoryService.update(category);
        this.budgetService.update(this.activeBudget);
      }
    }
  }
}
