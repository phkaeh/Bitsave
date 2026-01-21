import { Component, effect, EventEmitter, input, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaviconPipe } from '../../../../shared/pipes/favicon-pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { toast } from 'ngx-sonner';
import { lucideEye, lucideEyeOff, lucideExternalLink, lucideStar, lucideStarOff, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';

@Component({
  selector: 'app-vault-detail',
  imports: [CommonModule, FaviconPipe, HlmButtonImports, ClipboardModule, HlmIcon, HlmToasterImports, NgIcon],
  providers: [
    provideIcons({ lucideEye, lucideEyeOff, lucideExternalLink, lucideStar, lucideStarOff, lucidePencil, lucideTrash2 })
  ],
  templateUrl: './vault-detail.component.html',
  styleUrl: './vault-detail.component.css',
})
export class VaultDetail {

  cipher = input<any | null>(null);

  @Output() favoriteToggled = new EventEmitter<any>();
  @Output() editRequested = new EventEmitter<any>();
  @Output() deleteRequested = new EventEmitter<any>();

  copied = signal(false);
  showPassword = signal(false);

  onCopied(label: String) {
    this.copied.set(true);
    toast.success(`${label} kopiert`);
    setTimeout(() => this.copied.set(false), 2000);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onEdit() {
    if (this.cipher()) {
      this.editRequested.emit(this.cipher());
    }
  }

  toggleFavorite() {
    if (this.cipher()) {
      this.favoriteToggled.emit(this.cipher());
    }
  }

  onDelete() {
    const current = this.cipher();
    if (current && confirm(`"${current.data.title}" in den Papierkorb verschieben?`)) {
      this.deleteRequested.emit(current);
    }
  }

  handleWebsiteClick(event: Event) {
    const url = this.cipher()?.data?.website;
    
    event.preventDefault();
    
    if (url && this.isValidUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Ungültige oder fehlende URL');
    }
  }

  private isValidUrl(url: string): boolean {
    if (!url || url.trim() === '') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

}