import { Component, signal, effect } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';

@Component({
  selector: 'app-theme-toggle',
  imports: [  NgIcon, HlmButtonImports],
  providers: [
    provideIcons({ lucideMoon, lucideSun})
  ],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.css',
})
export class ThemeToggle {
  isDarkMode = signal(false);

  constructor() {
    
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode.set(savedTheme === 'dark' || (!savedTheme && prefersDark));

    effect(() => {
      if (this.isDarkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  toggleTheme(): void {
    this.isDarkMode.update(current => !current);
    localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
  }
}
