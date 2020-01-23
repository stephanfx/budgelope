import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Budget } from '../../shared/budget';
import { BudgetService } from '../budget.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthService } from '../../../app/shared/auth.service';

@Component({
  selector: 'app-budget-form',
  templateUrl: 'budget.component.html',
})
export class BudgetComponent implements OnInit {
  budgetName: string;
  userId: string;

  constructor(
    private router: Router,
    private budgetService: BudgetService,
    private auth: AuthService,
    private db: AngularFirestore
  ) {  }

  ngOnInit() {
      this.userId = this.auth.currentUserId;
      // get active budget TODO: move to service :P
      const subscription = this.db
        .doc<any>('users/' + this.auth.currentUserId)
        .valueChanges()
        .subscribe(profile => {
        });
  }

  saveBudget() {
    const budget = new Budget();
    budget.name = this.budgetName;

    this.budgetService.createBudget(budget, this.userId);
  }

  cancel() {
    this.router.navigate(['/budgets']);
  }
}
