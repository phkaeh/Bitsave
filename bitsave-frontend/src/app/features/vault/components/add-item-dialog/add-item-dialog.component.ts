import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { LoginForm } from '../login-form/login-form.component';
import { NewItemType } from '../../../../core/layouts/components/new-item-button/new-item-button.component';
import { CipherRequest, VaultService } from '../../../../core/services/vault.service';
import { CryptoService } from '../../../../core/services/crypto.service';

@Component({
  selector: 'app-add-item-dialog',
  standalone: true,
  imports: [CommonModule, HlmDialogImports, HlmButtonImports, LoginForm],
  templateUrl: './add-item-dialog.component.html'
})
export class AddItemDialogComponent implements OnInit {
  @ViewChild(LoginForm) loginComponent!: LoginForm;

  private readonly context = injectBrnDialogContext<{ 
    initialType?: NewItemType; 
    editMode?: boolean;
    cipher?: any;
  }>();
  
  private _dialogRef = inject(BrnDialogRef);
  private vaultService = inject(VaultService);
  private cryptoService = inject(CryptoService);

  editMode = this.context.editMode === true; 
  cipher = this.context.cipher || null;
  selectedType: NewItemType | null = null;
  readonly NewItemTypes = NewItemType;

  private labels = {
    [NewItemType.LOGIN]: { create: 'Erstelle einen neuen Login-Eintrag', edit: 'Bearbeite deinen Login-Eintrag' },
    [NewItemType.CREDIT_CARD]: { create: 'Erstelle eine neue Kreditkarte', edit: 'Bearbeite deine Kreditkarte' },
    [NewItemType.NOTE]: { create: 'Erstelle eine neue sichere Notiz', edit: 'Bearbeite deine sichere Notiz' },
    [NewItemType.IDENTITY]: { create: 'Erstelle eine neue Identität', edit: 'Bearbeite deine Identität' },
    [NewItemType.FOLDER]: { create: 'Erstelle einen neuen Ordner', edit: 'Bearbeite deinen Ordner' },
    [NewItemType.COLLECTION]: { create: 'Erstelle eine neue Sammlung', edit: 'Bearbeite deine Sammlung' }
  };

  ngOnInit() {
    if (this.context?.initialType) this.selectedType = this.context.initialType;
  }

  getDialogTitle() {
    return this.editMode ? 'Objekt bearbeiten' : 'Neues Objekt hinzufügen';
  }

  getTypeLabel(): string {
    if (!this.selectedType) return 'Wähle einen Typ aus';
    return this.editMode ? this.labels[this.selectedType].edit : this.labels[this.selectedType].create;
  }

  close() {
    this._dialogRef.close();
  }

  async onSave() {
    if (this.loginComponent.loginForm.invalid) {
      this.loginComponent.loginForm.markAllAsTouched();
      return;
    }

    try {
      const key = await this.cryptoService.getEncryptionKey();
      if (!key) throw new Error("Kein Encryption-Key vorhanden!");

      const request: CipherRequest = {
        type: this.editMode ? this.cipher.type : this.selectedType!,
        data: JSON.stringify(this.loginComponent.loginForm.value),
        favorite: this.editMode ? (this.cipher.favorite ?? false) : false
      };

      const observable = this.editMode 
        ? this.vaultService.updateCipher(this.cipher.id, request, key)
        : this.vaultService.createCipher(request, key);

      observable.subscribe({
        next: (cipher) => this._dialogRef.close({ success: true, cipher }),
        error: (err) => console.error('Fehler:', err)
      });
    } catch (error) {
      console.error('Fehler:', error);
    }
  }
}