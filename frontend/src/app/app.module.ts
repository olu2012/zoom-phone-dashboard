import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';  // ← Make sure this is imported

import { AppComponent } from './app.component';
import { CallDashboardComponent } from './components/call-dashboard/call-dashboard.component';
import { CallStatsService } from './services/call-stats.service';

@NgModule({
  declarations: [
    AppComponent,
    CallDashboardComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule  // ← Make sure this is here
  ],
  providers: [CallStatsService],
  bootstrap: [AppComponent]
})
export class AppModule { }