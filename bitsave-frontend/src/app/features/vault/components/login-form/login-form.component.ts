import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideWand2 } from '@ng-icons/lucide';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { FaviconPipe } from '../../../../shared/pipes/favicon-pipe';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { PasswordGeneratorDialog } from '../password-generator-dialog/password-generator-dialog.component';


@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmInputImports, HlmLabelImports, NgIcon, ReactiveFormsModule, HlmIcon, FaviconPipe],
  providers: [
    provideIcons({ lucideEye, lucideEyeOff, lucideWand2})
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css',
})
export class LoginForm {
  @Input() cipher: any = null;
  @Input() editMode = false;

  private fb = inject(FormBuilder);
  private dialogService = inject(HlmDialogService);

  showPasswordInForm = signal(false); 

  loginForm = this.fb.group({
    title: ['Log-in', Validators.required], 
    username: ['', Validators.required],
    password: ['', Validators.required],
    website: [''],
    notes: ['']
  });

  ngOnInit() {
    if (this.editMode && this.cipher) {
      this.loginForm.patchValue({
        title: this.cipher.data.title || 'Log-in',
        username: this.cipher.data.username || '',
        password: this.cipher.data.password || '',
        website: this.cipher.data.website || '',
        notes: this.cipher.data.notes || ''
      });
    }
  }

  openPasswordGenerator() {
    const dialogRef = this.dialogService.open(PasswordGeneratorDialog, {
      contentClass: 'sm:max-w-[500px] border-border'
    });

    dialogRef.closed$.subscribe((password: string | undefined) => {
      if (password) {
        this.loginForm.patchValue({ password });
      }
    });
  }

  togglePasswordVisibility() { 
    this.showPasswordInForm.update(v => !v);
  }
  
  getFormData() {
    return this.loginForm.value;
  }

  isValid() {
    return this.loginForm.valid;
  }
}