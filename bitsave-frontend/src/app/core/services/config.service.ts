import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private configData: any;

  private readonly demoDefaults = {
    firstname: 'Demo',
    lastname: 'User',
    email: 'demo@portfolio.com'
  };

  async loadConfig() {
  try {
    const data = await firstValueFrom(this.http.get('/assets/config.json'));
    this.configData = data;
  } catch (err) {
      this.configData = {
        apiUrl: environment.apiUrl,
        apiKey: environment.apiKey,
        showDemo: environment.showDemo
      };
    }
  }

  get apiUrl(): string { return this.configData?.apiUrl; }
  get apiKey(): string { return this.configData?.apiKey; }
  get isDemoMode(): boolean { 
    return this.configData?.showDemo === 'true' || this.configData?.showDemo === true; 
  }
  
  get demoUser() {
    return this.demoDefaults;
  }
}