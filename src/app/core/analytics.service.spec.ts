import { TestBed, inject } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';



describe('AnalyticsServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService]
    });
  });

  it('should ...', inject([AnalyticsService], (service: AnalyticsService) => {
    expect(service).toBeTruthy();
  }));
});
