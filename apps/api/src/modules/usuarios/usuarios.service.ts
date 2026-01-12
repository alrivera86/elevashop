import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  // Obtener todos los roles disponibles
  async getRoles() {
    return this.prisma.rol.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    return this.prisma.usuario.create({
      data: {
        email: createUsuarioDto.email,
        passwordHash: hashedPassword,
        nombreCompleto: createUsuarioDto.nombreCompleto,
        rolId: createUsuarioDto.rolId,
      },
      include: { rol: true },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      include: { rol: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);

    const data: any = { ...updateUsuarioDto };

    if (updateUsuarioDto.password) {
      data.passwordHash = await bcrypt.hash(updateUsuarioDto.password, 10);
      delete data.password;
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      include: { rol: true },
    });
  }

  async updateLastLogin(id: number) {
    return this.prisma.usuario.update({
      where: { id },
      data: { ultimoLogin: new Date() },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Reactivar usuario
  async reactivate(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
      include: { rol: true },
    });
  }

  // Reset de password (genera una nueva password temporal)
  async resetPassword(id: number, newPassword?: string) {
    await this.findOne(id);

    // Si no se proporciona password, generar una temporal
    const password = newPassword || this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return {
      message: 'Password actualizada exitosamente',
      temporaryPassword: newPassword ? undefined : password,
    };
  }

  // Cambiar password del usuario actual
  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, usuario.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('La password actual es incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password cambiada exitosamente' };
  }

  // Generar password temporal
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Estadisticas de usuarios
  async getStats() {
    const [total, activos, inactivos, porRol] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.count({ where: { activo: true } }),
      this.prisma.usuario.count({ where: { activo: false } }),
      this.prisma.usuario.groupBy({
        by: ['rolId'],
        _count: true,
      }),
    ]);

    const roles = await this.prisma.rol.findMany();
    const rolesMap = new Map(roles.map(r => [r.id, r.nombre]));

    return {
      total,
      activos,
      inactivos,
      porRol: porRol.map(r => ({
        rol: rolesMap.get(r.rolId) || 'Desconocido',
        cantidad: r._count,
      })),
    };
  }
}
