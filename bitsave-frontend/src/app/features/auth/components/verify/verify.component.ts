import { Component, signal, WritableSignal, computed, effect } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, HlmCardImports, HlmButtonImports, HlmInputImports],
  styleUrl: './verify.component.css',
})
export class Verify {
  email: WritableSignal<string> = signal('user@example.com'); 
  codeDigits: WritableSignal<string[]> = signal(Array(6).fill(''));
  isSubmitting: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string | null> = signal(null);
  verificationSuccess: WritableSignal<boolean> = signal(false);
  countdown: WritableSignal<number> = signal(0);

  isCodeComplete = computed(() => this.codeDigits().every(d => d.length === 1));
  fullCode = computed(() => this.codeDigits().join(''));

  constructor(private authService: AuthService,
              private router: Router
  ) 
  {
    if (typeof window !== 'undefined' && window.localStorage) {  
      const storedEmail = localStorage.getItem('user_email');
      if (storedEmail) {
        this.email.set(storedEmail);
      }
    }
    
    effect((onCleanup) => {
      const currentCountdown = this.countdown();
      if (currentCountdown > 0) {
        const timer = setTimeout(() => {
          this.countdown.update(v => v - 1);
        }, 1000);
        onCleanup(() => clearTimeout(timer));
      }
    });

    setTimeout(() => this.focusNextInput(0), 100);
    this.startCountdown(60);
  }


  onVerifyCodeSubmit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const enteredCode = this.fullCode();
    
    const userEmail = typeof window !== 'undefined' && window.localStorage 
      ? localStorage.getItem('user_email') ?? '' 
      : '';
    
    this.authService.verify(enteredCode, userEmail).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.verificationSuccess.set(true);
        this.router.navigate(['/allitems']); 
      },
      error: (error) => {
        this.isSubmitting.set(false);
        if(error.status === 400) {
              this.errorMessage.set('Der Code ist ungültig. Bitte versuchen Sie es erneut.');
        }
        else if(error.status === 0) {
            this.errorMessage.set('Der Server ist zurzeit nicht erreichbar.');
        }
        else {
            this.errorMessage.set('Ein unbekannter Fehler ist aufgetreten.');
        }
        this.codeDigits.set(Array(6).fill(''));
        this.focusNextInput(0);
        console.error('Verification error:', error);
      }
    });
  }

  onResendCode(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.codeDigits.set(Array(6).fill(''));

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.startCountdown(60);
      this.focusNextInput(0);
      console.log('Neuer Code gesendet an:', this.email());
    }, 1000);
    
    this.authService.resendCode(this.email()).subscribe({
      next: (response) => {
    }});
  }

  handleCodeInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (!/^\d*$/.test(value)) {
      input.value = '';
      return;
    }
    this.codeDigits.update(digits => {
      const newDigits = [...digits];
      newDigits[index] = value.slice(-1);
      return newDigits;
    });
    if (value && index < 5) this.focusNextInput(index + 1);
  }

  handleCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const data = event.clipboardData?.getData('text').trim().slice(0, 6) || '';
    if (data.length === 6 && /^\d+$/.test(data)) {
      this.codeDigits.set(data.split(''));
      this.focusNextInput(5);
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.getAttribute('data-index') || '-1', 10);
    if (event.key === 'Backspace' && index > 0 && !target.value) {
      this.focusNextInput(index - 1);
    }
  }

  focusNextInput(index: number): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[maxlength="1"]');
    if (inputs[index]) inputs[index].focus();
  }

  startCountdown(seconds: number): void {
    this.countdown.set(seconds);
  }

  resetForm(): void {
    this.email.set('user@example.com');
    this.codeDigits.set(Array(6).fill(''));
    this.isSubmitting.set(false);
    this.errorMessage.set(null);
    this.verificationSuccess.set(false);
    this.countdown.set(0);
    setTimeout(() => this.focusNextInput(0), 10);
    this.startCountdown(30);
  }
}