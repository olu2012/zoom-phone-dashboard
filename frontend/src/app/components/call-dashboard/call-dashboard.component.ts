import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CallStats, Site } from '../../models/call-stats.model';
import { CallStatsService } from '../../services/call-stats.service';

@Component({
  selector: 'app-call-dashboard',
  templateUrl: './call-dashboard.component.html',
  styleUrls: ['./call-dashboard.component.css']
})
export class CallDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private refreshInterval: any;
  private autoScrollInterval: any;
  private scrollDirection: 'down' | 'up' = 'down';
  private isScrollPaused = false;
  private scrollSpeed = 1; // pixels per interval
  private scrollIntervalMs = 60; // milliseconds between scroll steps

  callStats: CallStats[] = [];
  sites: Site[] = [];
  selectedSite: string = '';
  selectedDateRange: string = 'today'; // Default to today
  loading = false;
  error: string | null = null;
  dateRange: { from: string; to: string } | null = null;
  currentSite: string = 'All Sites';
  currentTheme: 'roc' | 'tank' = 'roc';
  lastRefreshedTime: string | null = null; // 1. Add this property

  // Configurable list of names to hide from the dashboard
  hiddenNames: string[] = [
    'Austin Main Line',
    'Germany Main Line',
    'London Main Line',
    'Luke Coggins Dedicated Line',
    'Manchester Main Line',
    'Ntwrx RDG Main Line',
    'NY Main Line',
    'OLS LA Main Line',
    'Reading Back Office Main Line',
    'Reading Engineering Main Line',
    'Reading IR Main Line',
    'Reading Tech Main Line',
    'Red King Sales Support',
    'San Diego Main Line',
    'Tank Main Line',
    'Tank Sales Support',
    'Tech Support',
    'Test',
    'Test - Bullhorn App Call Queue',
    'Test - Bullhorn App Call Queue 2',
    'Test - Bullhorn App Call Queue 3',
    'Test - Bullhorn App Call Queue 4',
    'USA Sales Support'
  ];

  // Getter to filter out hidden names from callStats
  get filteredCallStats(): CallStats[] {
    return this.callStats.filter(stat => !this.hiddenNames.includes(stat.user));
  }

  constructor(private callStatsService: CallStatsService) {
    console.log('CallDashboardComponent initialized');
  }

  ngOnInit(): void {
    console.log('ngOnInit called');
    this.loadSites();
    this.loadCallStats();

    // Auto-refresh every 3 minutes (180,000 ms)
    this.refreshInterval = setInterval(() => {
      console.log('Auto-refreshing data...');
      this.refresh();
    }, 180000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.stopAutoScroll();
  }

  ngAfterViewInit(): void {
    // Start auto-scroll after a short delay to ensure content is rendered
    setTimeout(() => this.startAutoScroll(), 1000);
  }

  startAutoScroll(): void {
    if (this.autoScrollInterval) {
      return; // Already running
    }

    this.autoScrollInterval = setInterval(() => {
      if (this.isScrollPaused || !this.scrollContainer) {
        return;
      }

      const container = this.scrollContainer.nativeElement;
      const maxScroll = container.scrollHeight - container.clientHeight;

      if (maxScroll <= 0) {
        return; // No scrolling needed
      }

      if (this.scrollDirection === 'down') {
        container.scrollTop += this.scrollSpeed;
        if (container.scrollTop >= maxScroll) {
          this.scrollDirection = 'up';
        }
      } else {
        container.scrollTop -= this.scrollSpeed;
        if (container.scrollTop <= 0) {
          this.scrollDirection = 'down';
        }
      }
    }, this.scrollIntervalMs);
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  pauseScroll(): void {
    this.isScrollPaused = true;
  }

  resumeScroll(): void {
    this.isScrollPaused = false;
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
        // 2. Set the current time when data is received
      const now = new Date();
      this.lastRefreshedTime = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit' 
      });
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