import { Component, OnInit } from '@angular/core';
import { CallStats, Site } from '../../models/call-stats.model';
import { CallStatsService } from '../../services/call-stats.service';

@Component({
  selector: 'app-call-dashboard',
  templateUrl: './call-dashboard.component.html',
  styleUrls: ['./call-dashboard.component.css']
})
export class CallDashboardComponent implements OnInit {
  callStats: CallStats[] = [];
  sites: Site[] = [];
  selectedSite: string = '';
  selectedDateRange: string = 'today'; // Default to today
  loading = false;
  error: string | null = null;
  dateRange: { from: string; to: string } | null = null;
  currentSite: string = 'All Sites';
  currentTheme: 'roc' | 'tank' = 'roc';

  constructor(private callStatsService: CallStatsService) {
    console.log('CallDashboardComponent initialized');
  }

  ngOnInit(): void {
    console.log('ngOnInit called');
    this.loadSites();
    this.loadCallStats();
  }

  loadSites(): void {
    console.log('Loading sites...');
    this.callStatsService.getSites().subscribe({
      next: (response) => {
        console.log('Sites loaded:', response.sites);
        this.sites = response.sites;
      },
      error: (err) => {
        console.error('Error loading sites:', err);
      }
    });
  }

  loadCallStats(fromDate?: string, toDate?: string, site?: string): void {
    console.log('='.repeat(60));
    console.log('loadCallStats called with params:', { fromDate, toDate, site });
    
    this.loading = true;
    this.error = null;

    // Calculate dates based on selected range if not provided
    if (!fromDate && !toDate) {
      console.log('No dates provided, calculating from selectedDateRange:', this.selectedDateRange);
      const dates = this.getDateRangeForPeriod(this.selectedDateRange);
      fromDate = dates.from;
      toDate = dates.to;
      console.log('Calculated dates:', dates);
    }

    console.log('Final params for API call:', { fromDate, toDate, site });

    this.callStatsService.getCallStats(fromDate, toDate, site).subscribe({
      next: (response) => {
        console.log('API Response received:', response);
        console.log('Number of records:', response.data.length);
        console.log('Date range from response:', response.dateRange);
        
        this.callStats = response.data;
        this.dateRange = response.dateRange;
        this.currentSite = response.site || 'All Sites';
        
        // Determine theme based on selected site
        if (site === 'Tank' || response.siteCode === 'Tank') {
          console.log('Setting theme to: tank');
          this.currentTheme = 'tank';
        } else {
          console.log('Setting theme to: roc');
          this.currentTheme = 'roc';
        }
        
        this.loading = false;
        console.log('Loading complete');
        console.log('='.repeat(60));
      },
      error: (err) => {
        this.error = 'Failed to load call statistics. Please try again.';
        this.loading = false;
        console.error('Error loading call stats:', err);
        console.log('='.repeat(60));
      }
    });
  }

  getDateRangeForPeriod(period: string): { from: string; to: string } {
    console.log('getDateRangeForPeriod called with period:', period);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('Today date:', todayStr);
    
    let result;
    
    switch (period) {
      case 'today':
        result = { from: todayStr, to: todayStr };
        console.log('Calculated TODAY range:', result);
        break;
      
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        const last7Str = last7.toISOString().split('T')[0];
        result = { from: last7Str, to: todayStr };
        console.log('Calculated LAST 7 DAYS range:', result);
        break;
      
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        const last30Str = last30.toISOString().split('T')[0];
        result = { from: last30Str, to: todayStr };
        console.log('Calculated LAST 30 DAYS range:', result);
        break;
      
      default:
        result = { from: todayStr, to: todayStr };
        console.log('DEFAULT range (today):', result);
    }
    
    return result;
  }

  refresh(): void {
    console.log('\n*** REFRESH BUTTON CLICKED ***');
    console.log('Current selectedDateRange:', this.selectedDateRange);
    console.log('Current selectedSite:', this.selectedSite);
    
    const dates = this.getDateRangeForPeriod(this.selectedDateRange);
    this.loadCallStats(dates.from, dates.to, this.selectedSite || undefined);
  }

  onSiteChange(): void {
    console.log('\n*** SITE CHANGED ***');
    console.log('New selected site:', this.selectedSite);
    console.log('Current selectedDateRange:', this.selectedDateRange);

    const dates = this.getDateRangeForPeriod(this.selectedDateRange);
    this.loadCallStats(dates.from, dates.to, this.selectedSite || undefined);
  }

  onDateRangeChange(): void {
    console.log('\n*** DATE RANGE CHANGED ***');
    console.log('Date range changed to:', this.selectedDateRange);
    console.log('Current selectedSite:', this.selectedSite);

    const dates = this.getDateRangeForPeriod(this.selectedDateRange);
    console.log('Will load call stats with dates:', dates);

    this.loadCallStats(dates.from, dates.to, this.selectedSite || undefined);
  }

  hasReachedThreeHours(outboundTimeSeconds: number | undefined): boolean {
    // Only highlight when viewing "Today" data
    if (this.selectedDateRange !== 'today') {
      return false;
    }
    return (outboundTimeSeconds || 0) >= 10800; // 3 hours = 10,800 seconds
  }

  getThemeColor(): string {
    return this.currentTheme === 'tank' ? '#b5d282' : '#e94d1e';
  }

  getThemeColorHover(): string {
    return this.currentTheme === 'tank' ? '#a5c272' : '#d43d0e';
  }
}