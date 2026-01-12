import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const usuario = await this.usuariosService.findByEmail(email);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const { passwordHash, ...result } = usuario;
    return result;
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.validateUser(loginDto.email, loginDto.password);

    // Actualizar último login
    await this.usuariosService.updateLastLogin(usuario.id);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
    };

    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombreCompleto,
        rol: usuario.rol,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: number) {
    const usuario = await this.usuariosService.findOne(userId);
    const { passwordHash, ...result } = usuario;
    return result;
  }
}
