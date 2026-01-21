import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule} from '@angular/router'; 
import { AuthService } from '../../../services/auth.service';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideChevronDown, lucideSettings, lucideLogOut, lucideInbox, lucideStar, lucideTrash2 } from '@ng-icons/lucide';


@Component({
  selector: 'app-sidebar',
  standalone: true, 
  imports: [
    CommonModule, 
    RouterModule,
    HlmSidebarImports,
    HlmDropdownMenuImports,
    NgIcon,
    HlmIcon,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideSettings,
      lucideLogOut,
      lucideInbox,
      lucideStar,
      lucideTrash2
    }),
  ],
  templateUrl: './sidebar.component.html',
})
export class Sidebar {

  username = signal("Test User");

  constructor(private authService: AuthService) {
    this.username.set(localStorage.getItem('user_firstname') + " " + localStorage.getItem('user_lastname') );
  }

  logout(): void {
    this.authService.logout();
  }
}