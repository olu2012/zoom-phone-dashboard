import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CallStatsResponse, SitesResponse } from '../models/call-stats.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CallStatsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCallStats(fromDate?: string, toDate?: string, site?: string): Observable<CallStatsResponse> {
    let params = new HttpParams();
    
    if (fromDate) {
      params = params.set('from', fromDate);
    }
    if (toDate) {
      params = params.set('to', toDate);
    }
    if (site) {
      params = params.set('site', site);
    }

    return this.http.get<CallStatsResponse>(`${this.apiUrl}/call-stats`, { params });
  }

  getSites(fromDate?: string, toDate?: string): Observable<SitesResponse> {
    let params = new HttpParams();
    
    if (fromDate) {
      params = params.set('from', fromDate);
    }
    if (toDate) {
      params = params.set('to', toDate);
    }

    return this.http.get<SitesResponse>(`${this.apiUrl}/sites`, { params });
  }
}