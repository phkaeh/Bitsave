import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaviconPipe } from '../../../../shared/pipes/favicon-pipe';
import { VaultService } from '../../../../core/services/vault.service';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-vault-list',
  standalone: true,
  imports: [CommonModule, FaviconPipe, HlmScrollAreaImports, NgScrollbarModule],
  templateUrl: './vault-list.component.html',
  styleUrl: './vault-list.component.css',
})
export class VaultList {
  public vaultService = inject(VaultService);

  @Input() ciphers: any[] = []; 
  @Input() title: string = 'Items';
  @Input() activeCipher: any = null; 
  @Output() selectCipher = new EventEmitter<any>();

}