import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw, lucideCopy, lucideCheck } from '@ng-icons/lucide';

@Component({
  selector: 'app-password-generator-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmDialogImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmCheckboxImports,
    NgIcon
  ],
  providers: [provideIcons({ lucideRefreshCw, lucideCopy, lucideCheck })],
  templateUrl: './password-generator-dialog.component.html',
  styleUrl: './password-generator-dialog.component.css',
})
export class PasswordGeneratorDialog {
  private _dialogRef = inject(BrnDialogRef);

  length = 16;
  includeUppercase = true;
  includeLowercase = true;
  includeNumbers = true;
  includeSpecial = true;
  minNumbers = 1;
  minSpecial = 1;

  copied = signal(false);
  generatedPassword = signal('');

  constructor() {
    this.regeneratePassword();
  }

  onMinNumbersBlur() {
    const max = this.length - this.minSpecial;
    if (this.minNumbers > max) {
      this.minNumbers = max;
    }
    if (this.minNumbers < 0) {
      this.minNumbers = 0;
    }
    this.regeneratePassword();
  }

  onMinSpecialBlur() {
    const max = this.length - this.minNumbers;
    if (this.minSpecial > max) {
      this.minSpecial = max;
    }
    if (this.minSpecial < 0) {
      this.minSpecial = 0;
    }
    this.regeneratePassword();
  }

  regeneratePassword() {
    this.generatedPassword.set(this.generatePassword());
  }

  generatePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    if (this.includeUppercase) chars += uppercase;
    if (this.includeLowercase) chars += lowercase;
    if (this.includeNumbers) chars += numbers;
    if (this.includeSpecial) chars += special;

    if (!chars) return '';

    let password = '';
    
    for (let i = 0; i < this.minNumbers && this.includeNumbers; i++) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }

    for (let i = 0; i < this.minSpecial && this.includeSpecial; i++) {
      password += special[Math.floor(Math.random() * special.length)];
    }

    while (password.length < this.length) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  async copyToClipboard() {
    await navigator.clipboard.writeText(this.generatedPassword());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  selectPassword() {
    this._dialogRef.close(this.generatedPassword());
  }

  close() {
    this._dialogRef.close();
  }
}