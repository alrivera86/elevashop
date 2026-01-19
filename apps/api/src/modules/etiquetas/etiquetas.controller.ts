import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EtiquetasService } from './etiquetas.service';
import {
  CreateEtiquetaDto,
  UpdateEtiquetaDto,
  AsignarEtiquetaDto,
  AsignarEtiquetasMasivoDto,
} from './dto/create-etiqueta.dto';

@ApiTags('Etiquetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('etiquetas')
export class EtiquetasController {
  constructor(private readonly etiquetasService: EtiquetasService) {}

  // ============ CRUD ETIQUETAS ============

  @Get()
  @ApiOperation({ summary: 'Listar todas las etiquetas activas' })
  @ApiResponse({ status: 200, description: 'Lista de etiquetas' })
  findAll() {
    return this.etiquetasService.findAll();
  }

  @Get('todas')
  @ApiOperation({ summary: 'Listar todas las etiquetas (incluyendo inactivas)' })
  findAllIncludingInactive() {
    return this.etiquetasService.findAllIncludingInactive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener etiqueta por ID con sus clientes' })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada' })
  @ApiResponse({ status: 404, description: 'Etiqueta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.etiquetasService.findOne(id);
  }

  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'Obtener etiqueta por código' })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.etiquetasService.findByCodigo(codigo);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva etiqueta' })
  @ApiResponse({ status: 201, description: 'Etiqueta creada' })
  @ApiResponse({ status: 409, description: 'Ya existe una etiqueta con ese código' })
  create(@Body() dto: CreateEtiquetaDto) {
    return this.etiquetasService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar etiqueta' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEtiquetaDto) {
    return this.etiquetasService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar etiqueta' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.etiquetasService.remove(id);
  }

  // ============ ASIGNACIÓN DE ETIQUETAS ============

  @Post('asignar')
  @ApiOperation({ summary: 'Asignar etiqueta a un cliente' })
  asignarEtiqueta(@Body() dto: AsignarEtiquetaDto) {
    return this.etiquetasService.asignarEtiqueta(dto);
  }

  @Delete('cliente/:clienteId/etiqueta/:etiquetaId')
  @ApiOperation({ summary: 'Quitar etiqueta de un cliente' })
  quitarEtiqueta(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('etiquetaId', ParseIntPipe) etiquetaId: number,
  ) {
    return this.etiquetasService.quitarEtiqueta(clienteId, etiquetaId);
  }

  @Post('asignar-masivo')
  @ApiOperation({ summary: 'Asignar etiqueta a múltiples clientes' })
  asignarMasivo(@Body() dto: AsignarEtiquetasMasivoDto) {
    return this.etiquetasService.asignarMasivo(dto);
  }

  @Delete('quitar-masivo')
  @ApiOperation({ summary: 'Quitar etiqueta de múltiples clientes' })
  quitarMasivo(
    @Body() body: { clienteIds: number[]; etiquetaId: number },
  ) {
    return this.etiquetasService.quitarMasivo(body.clienteIds, body.etiquetaId);
  }

  // ============ CONSULTAS ============

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Obtener etiquetas de un cliente' })
  getEtiquetasCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.etiquetasService.getEtiquetasCliente(clienteId);
  }

  @Get('cliente/:clienteId/nivel-acceso')
  @ApiOperation({ summary: 'Obtener nivel de acceso del cliente para el bot' })
  getNivelAcceso(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.etiquetasService.getNivelAccesoCliente(clienteId);
  }

  @Get('clientes-por-codigo/:codigo')
  @ApiOperation({ summary: 'Obtener todos los clientes con una etiqueta específica' })
  getClientesPorEtiqueta(@Param('codigo') codigo: string) {
    return this.etiquetasService.getClientesPorEtiqueta(codigo);
  }
}
