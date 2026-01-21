import { Component, inject, signal } from '@angular/core';
import { FormsModule} from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { AuthService, AuthResponse } from '../../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';


@Component({
  selector: 'app-signup',
  imports: [FormsModule, CommonModule, HlmCardImports, HlmButtonImports, HlmInputImports, HlmLabelImports], 
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],

})
export class Signup {
  
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user = {
    firstname: '',
    lastname: '',
    email: '',
    password: '',
  };
  
  loginFailed = signal(false);
  errorMessage = signal<string | null>(null);
  
  async onSubmit(form: any): Promise<void> {
    if (form.valid) {
      this.loginFailed.set(false);
      this.errorMessage.set(null);

      localStorage.setItem('user_email', this.user.email);
      localStorage.setItem('user_firstname', this.user.firstname);
      localStorage.setItem('user_lastname', this.user.lastname);

      this.authService.signup(this.user).subscribe({
        next: (response: AuthResponse) => {
          this.router.navigate(['/verify'],);
        }, error: (error: HttpErrorResponse) => {
          this.loginFailed.set(true);
          if(error.status === 0) {
            this.errorMessage.set( 'Der Server ist zurzeit nicht erreichbar.');
          }
          else if(error.status === 409) {
            // Email already exists
            this.errorMessage.set('Ein Fehler ist aufgetreten.');
          } else {
            this.errorMessage.set('Ein unbekannter Fehler ist aufgetreten.');
          }
          form.control.setErrors({ 'loginFailed': true });
          throw error;
        }
      })
    }
  }
}