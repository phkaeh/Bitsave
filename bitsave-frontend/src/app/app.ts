import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { AuthService } from './core/services/auth.service'; 
import { CryptoService } from './core/services/crypto.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HlmToasterImports],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('bitsave');
}