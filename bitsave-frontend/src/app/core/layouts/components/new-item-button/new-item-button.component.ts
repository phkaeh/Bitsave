import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  lucidePlus, 
  lucideKey, 
  lucideCreditCard, 
  lucideStickyNote, 
  lucideUser,
  lucideShield,
  lucideFolder,
  lucideGrid
} from '@ng-icons/lucide';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';

export enum NewItemType {
  LOGIN = 1,
  CREDIT_CARD = 2,
  NOTE = 3,
  IDENTITY = 4,
  FOLDER = 5,
  COLLECTION = 6
}

@Component({
  selector: 'app-new-item-button',
  standalone: true,
  imports: [CommonModule, NgIcon, HlmDropdownMenuImports],
  providers: [
    provideIcons({ 
      lucidePlus, 
      lucideKey, 
      lucideCreditCard, 
      lucideStickyNote, 
      lucideUser,
      lucideShield,
      lucideFolder,
      lucideGrid
    })
  ],
  templateUrl: './new-item-button.component.html',
  styleUrl: './new-item-button.component.css',
})
export class NewItemButton {
  NewItemType = NewItemType;
  itemTypeSelected = output<NewItemType>();
}
