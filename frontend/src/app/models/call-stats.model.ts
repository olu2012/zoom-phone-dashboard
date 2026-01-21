export interface CallStats {
  user: string;
  site?: string;
  totalCalls: number;
  outbound: number;
  totalCallTime: string;
  totalCallTimeSeconds?: number;
  totalOutboundCallTime: string;
  totalOutboundCallTimeSeconds?: number;
}

export interface CallStatsResponse {
  success: boolean;
  data: CallStats[];
  dateRange: {
    from: string;
    to: string;
  };
  site?: string;
  siteCode?: string;  // Add this
}

export interface Site {
  code: string;
  name: string;
}

export interface SitesResponse {
  success: boolean;
  sites: Site[];
}