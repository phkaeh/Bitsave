import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common'
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HlmCardImports, HlmButtonImports, CommonModule, HlmToasterImports],
  templateUrl: './home.component.html',
})
export class Home implements OnInit {
  
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit() {
    const reason = sessionStorage.getItem('vault_locked_reason');
    if (reason === 'ram_cleared') {
      toast.error('Tresor gesperrt', {
        duration: 5000,
      });
      sessionStorage.removeItem('vault_locked_reason');
    }
  }
  
  isDemoVisible = signal(environment.showDemo);

  onLogin() {
    this.router.navigate(['/login']);
  }

  onSignup() {
    this.router.navigate(['/signup']);
  }

  async onDemoLogin(): Promise<void> {
    const demoData = environment.demo;

    localStorage.setItem('user_email', demoData.email);
    localStorage.setItem('user_firstname', demoData.firstname);
    localStorage.setItem('user_lastname', demoData.lastname);

    this.authService.demoLogin().subscribe({
      next: () => {
        this.router.navigate(['/allitems']); 
      },
      error: (error: HttpErrorResponse) => {
        console.error('Demo-Login Fehler:', error);
      }
    });
  }
}