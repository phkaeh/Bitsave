import { Routes } from '@angular/router';
import { Signup } from './features/auth/components/signup/signup.component';
import { Login } from './features/auth/components/login/login.component';
import { Home } from './features/components/home/home.component';
import { AuthGuard } from './core/guards/auth.guard';
import { PublicGuard } from './core/guards/public.guard';
import { Verify } from './features/auth/components/verify/verify.component';
import { MainLayout } from './core/layouts/main-layout/main-layout.component';
import { VaultPage} from './features/vault/components/vault-page/vault-page.component';

export const routes: Routes = [
    {path: '',component: Home, canActivate: [PublicGuard], pathMatch: 'full'},
    {path: 'signup', component: Signup, canActivate: [PublicGuard]},
    {path: 'login', component: Login, canActivate: [PublicGuard]},
    {path: '', component: MainLayout, canActivate: [AuthGuard], 
        children: [
            {path: 'allitems', component: VaultPage, canActivate: [AuthGuard]},
            {path: 'favorites', component: VaultPage, canActivate: [AuthGuard], data: { filter: 'favorites' }},
            {path: 'trash', component: VaultPage, canActivate: [AuthGuard], data: { filter: 'trash' }},
        ]},
    {path: 'verify', component: Verify, canActivate: [PublicGuard]},
    { path: '**', redirectTo: '' }
];