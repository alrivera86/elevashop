import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

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
}
