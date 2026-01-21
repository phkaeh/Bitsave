import { Component, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';

@Component({
  selector: 'app-searchbar',
  standalone: true, 
  imports: [FormsModule, HlmInputImports, NgIcon],
  templateUrl: './searchbar.component.html',
  styleUrl: './searchbar.component.css',
  providers: [
    provideIcons({
      lucideSearch,
    }),
  ],
})
export class Searchbar {
  searchQuery = '';
  searchChange = output<string>();

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.searchChange.emit(value);
  }
  
}
