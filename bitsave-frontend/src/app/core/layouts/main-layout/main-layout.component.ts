import { Component, inject } from '@angular/core';
import { Sidebar } from '../components/sidebar/sidebar.component';
import { Searchbar } from '../components/searchbar/searchbar.component';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { RouterOutlet } from '@angular/router';
import { NewItemButton, NewItemType } from '../components/new-item-button/new-item-button.component';
import { VaultService } from '../../services/vault.service';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { AddItemDialogComponent } from '../../../features/vault/components/add-item-dialog/add-item-dialog.component';
import { ThemeToggle } from '../components/theme-toggle/theme-toggle.component';


@Component({
  selector: 'app-main-layout',
  imports: [Sidebar, Searchbar, HlmSidebarImports, RouterOutlet,  NewItemButton, HlmDialogImports, ThemeToggle],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  providers: [],
})
export class MainLayout {

  private readonly _hlmDialogService = inject(HlmDialogService);
  public readonly vaultService = inject(VaultService);

  onSearch(query: string) {
    this.vaultService.searchTerm.set(query);
  }

  onNewItemSelected(type: NewItemType) {
    const dialogRef = this._hlmDialogService.open(AddItemDialogComponent, {
      context: { initialType: type },
      contentClass: 'sm:max-w-[1000px] bg-card text-card-foreground border-border'
    });
  
    dialogRef.closed$.subscribe((result: any) => {
      if (result?.success && result?.cipher) {
        this.vaultService.selectedCipher.set(result.cipher); 
      }
    });
  }
}
