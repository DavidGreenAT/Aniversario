import { Component, OnInit, inject } from '@angular/core';
import { User } from '../models/user';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login implements OnInit {

  private router = inject(Router);

  ngOnInit(): void {
  }

  validarUsuario(usuario: string, contrasenia: string): void {
    const user: User = {
      idUser: 1,
      usuario: 'amorcito',
      contrasenia: '28092025'
    };

    if (usuario === user.usuario && contrasenia === user.contrasenia) {
      this.router.navigate(['/formulario-cita']);
    } else {
      alert('Usuario o contraseña incorrectos');
    }
  }

}
