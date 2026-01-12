import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('usuarios')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Listar roles disponibles' })
  getRoles() {
    return this.usuariosService.getRoles();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadisticas de usuarios' })
  getStats() {
    return this.usuariosService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }

  @Patch(':id/reactivar')
  @ApiOperation({ summary: 'Reactivar usuario' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.reactivate(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset de password' })
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword?: string },
  ) {
    return this.usuariosService.resetPassword(id, body.newPassword);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Cambiar password del usuario' })
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usuariosService.changePassword(id, body.currentPassword, body.newPassword);
  }
}
