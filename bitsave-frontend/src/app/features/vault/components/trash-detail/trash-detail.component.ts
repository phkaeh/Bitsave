import { Component, EventEmitter, input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaviconPipe } from '../../../../shared/pipes/favicon-pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { lucideUndo2, lucideTrash2 } from '@ng-icons/lucide';

@Component({
  selector: 'app-trash-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FaviconPipe, 
    HlmButtonImports, 
    HlmIcon, 
    HlmToasterImports, 
    NgIcon
  ],
  providers: [
    provideIcons({ lucideUndo2, lucideTrash2 })
  ],
  templateUrl: './trash-detail.component.html',
  styleUrl: './trash-detail.component.css',
})
export class TrashDetail {
  cipher = input<any | null>(null);
  
  @Output() restoreRequested = new EventEmitter<any>();
  @Output() permanentDeleteRequested = new EventEmitter<any>();


  onRestore() {
    const current = this.cipher();
    if (current) {
      this.restoreRequested.emit(current);
    }
  }

  onPermanentDelete() {
    const current = this.cipher();
    if (current && confirm(`"${current.data.title}" endgültig löschen? Dies kann nicht rückgängig gemacht werden!`)) {
      this.permanentDeleteRequested.emit(current);
    }
  }
}