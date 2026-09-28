import { Routes } from '@angular/router';
import { Login } from './login/login';
import { FormularioCita } from './formulario-cita/formulario-cita';
import { Admin } from './admin/admin';
import { Puzzle1 } from './puzzle1/puzzle1';
import { AmorcitoService } from './services/amorcito-service';
import { Amorcito } from './amorcito/amorcito';
import { Puzzle2 } from './puzzle2/puzzle2';
import { Puzzle3 } from './puzzle3/puzzle3';
import { Puzzle4 } from './puzzle4/puzzle4';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'formulario-cita',
    component: FormularioCita
  },
  {
    path: 'admin',
    component: Admin
  },
  {
    path: 'puzzle/1',
    component: Puzzle1
  },
  {
    path: 'amorcito-service',
    component: AmorcitoService
  },
  {
  path: 'amorcito',
  component: Amorcito
  },
  {
    path: 'puzzle/2',
    component: Puzzle2
  },
  {
    path: 'puzzle/3',
    component: Puzzle3
  },
  {
    path: 'puzzle/4',
    component: Puzzle4
  }
];
