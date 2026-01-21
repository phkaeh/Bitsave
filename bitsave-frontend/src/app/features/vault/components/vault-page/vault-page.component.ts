import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { VaultService } from '../../../../core/services/vault.service';
import { CryptoService } from '../../../../core/services/crypto.service';
import { VaultList } from '../vault-list/vault-list.component';
import { VaultDetail } from '../vault-detail/vault-detail.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { AddItemDialogComponent } from '../add-item-dialog/add-item-dialog.component';
import { TrashDetail } from '../trash-detail/trash-detail.component';

@Component({
  selector: 'app-vault-page',
  standalone: true,
  imports: [CommonModule, VaultList, VaultDetail, TrashDetail],
  templateUrl: 'vault-page.component.html'
})
export class VaultPage implements OnInit {
  vaultService = inject(VaultService);
  private cryptoService = inject(CryptoService);
  private route = inject(ActivatedRoute);
  private readonly _hlmDialogService = inject(HlmDialogService);

  pageTitle = computed(() => {
    switch(this.vaultService.currentFilter()) {
      case 'favorites': return 'Favoriten';
      case 'trash': return 'Papierkorb';
      default: return 'Alle Objekte';
    }
  });

  isTrashPage = computed(() => this.vaultService.currentFilter() === 'trash');

  selectedCipherWithLatestData = computed(() => {
    const selected = this.vaultService.selectedCipher();
    if (!selected) return null;
    
    const allCiphers = this.vaultService.ciphers();
    return allCiphers.find(c => c.id === selected.id) || selected;
  });

  async ngOnInit() {
    this.route.data.subscribe(data => {
      const filter = data['filter'] || 'all';
      this.vaultService.currentFilter.set(filter);
      this.vaultService.selectedCipher.set(null);
    });

    const key = await this.cryptoService.getEncryptionKey();
    if (!key) throw new Error("Kein Encryption-Key vorhanden!");
    this.vaultService.getAllCiphers(key).subscribe();
  }

  onSelect(cipher: any) {
    this.vaultService.selectedCipher.set(cipher);
  }

  async onFavoriteToggled(cipher: any) {
    const key = await this.cryptoService.getEncryptionKey();
    if (!key) throw new Error("Kein Encryption-Key vorhanden!");
    
    cipher.favorite = !cipher.favorite;
    this.vaultService.updateCipher(cipher.id, {
      type: cipher.type,
      favorite: cipher.favorite,
      data: JSON.stringify(cipher.data)
    }, key).subscribe();
  }

  onEdit(cipher: any) {
    this._hlmDialogService.open(AddItemDialogComponent, {
      context: { editMode: true, cipher, initialType: cipher.type },
      contentClass: 'sm:max-w-[1000px] bg-card text-card-foreground border-border'
    });
  }

  onDelete(cipher: any) {
    this.vaultService.deleteCipher(cipher.id).subscribe();
  }

  onRestore(cipher: any) {
    this.vaultService.restoreCipher(cipher.id).subscribe();
  }

  onPermanentDelete(cipher: any) {
    this.vaultService.permanentDeleteCipher(cipher.id).subscribe();
  }
}