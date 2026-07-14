import { BadRequestException, Body, Controller, Get, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetCondition, AuditResultStatus, AuditStatus, MaintenanceStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PrismaService } from './prisma.service';
import { classifyAudit, statusAfterReturn } from './business-rules';
import { Permissions } from './auth';

export class LoanDto { @IsUUID() assetId!: string; @IsString() borrowerName!: string; @IsOptional() @IsUUID() departmentId?: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsString() notes?: string; }
export class MaintenanceDto { @IsUUID() assetId!: string; @IsString() complaint!: string; @IsOptional() @IsString() action?: string; @IsOptional() @IsString() technician?: string; @IsOptional() @IsNumber() cost?: number; }
export class AuditSessionDto { @IsString() name!: string; @IsOptional() @IsUUID() locationId?: string; @IsOptional() @IsUUID() departmentId?: string; }
export class AuditScanDto {
  @IsString() operationId!: string;
  @IsString() assetToken!: string;
  @IsDateString() scannedAt!: string;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() note?: string;
}
export class AuditSyncDto { @IsArray() operations!: AuditScanDto[]; }

@Injectable()
export class OperationsService {
  constructor(private db: PrismaService) {}
  async createLoan(dto: LoanDto, actorId: string) {
    const asset = await this.db.asset.findUniqueOrThrow({ where: { id: dto.assetId } });
    if (asset.status !== 'AVAILABLE') throw new BadRequestException('Aset tidak tersedia untuk dipinjam');
    return this.db.$transaction(async (tx) => {
      const loan = await tx.assetLoan.create({ data: { ...dto, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, createdById: actorId } });
      await tx.asset.update({ where: { id: dto.assetId }, data: { status: 'IN_USE' } });
      await tx.assetMovement.create({ data: { assetId: dto.assetId, actorId, fromStatus: asset.status, toStatus: 'IN_USE', reason: `Dipinjam oleh ${dto.borrowerName}` } });
      return loan;
    });
  }
  async returnLoan(id: string, actorId: string) {
    const loan = await this.db.assetLoan.findUniqueOrThrow({ where: { id }, include: { asset: true } });
    if (loan.status !== 'ACTIVE') throw new BadRequestException('Peminjaman sudah ditutup');
    const next = statusAfterReturn(loan.asset.condition);
    return this.db.$transaction(async (tx) => {
      const updated = await tx.assetLoan.update({ where: { id }, data: { status: 'RETURNED', returnedAt: new Date() } });
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: next } });
      await tx.assetMovement.create({ data: { assetId: loan.assetId, actorId, fromStatus: loan.asset.status, toStatus: next, reason: 'Aset dikembalikan' } });
      return updated;
    });
  }
  listLoans() { return this.db.assetLoan.findMany({ include: { asset: true }, orderBy: { loanedAt: 'desc' } }); }
  async createMaintenance(dto: MaintenanceDto, actorId: string) { const asset=await this.db.asset.findUniqueOrThrow({where:{id:dto.assetId}}); if(['LOST','DISPOSED'].includes(asset.status)) throw new BadRequestException('Aset tidak dapat masuk maintenance'); return this.db.$transaction(async (tx) => { const log = await tx.maintenanceLog.create({ data: { ...dto, createdById: actorId } }); await tx.asset.update({ where: { id: dto.assetId }, data: { status: 'MAINTENANCE' } }); await tx.assetMovement.create({data:{assetId:dto.assetId,actorId,fromStatus:asset.status,toStatus:'MAINTENANCE',reason:`Maintenance dibuka: ${dto.complaint}`}}); return log; }); }
  async updateMaintenance(id: string, status: MaintenanceStatus, actorId: string, action?: string) {
    const current=await this.db.maintenanceLog.findUniqueOrThrow({where:{id},include:{asset:true}});const transitions:Record<string,MaintenanceStatus[]>={OPEN:['IN_PROGRESS','COMPLETED','CANCELLED'],IN_PROGRESS:['COMPLETED','CANCELLED']};if(current.status!==status&&!transitions[current.status]?.includes(status)) throw new BadRequestException('Transisi status maintenance tidak valid');
    return this.db.$transaction(async tx=>{const log=await tx.maintenanceLog.update({where:{id},data:{status,action,completedAt:status==='COMPLETED'?new Date():undefined},include:{asset:true}});if(['COMPLETED','CANCELLED'].includes(status)){const next=log.asset.condition==='GOOD'?'AVAILABLE':'MAINTENANCE';await tx.asset.update({where:{id:log.assetId},data:{status:next}});await tx.assetMovement.create({data:{assetId:log.assetId,actorId,fromStatus:log.asset.status,toStatus:next,reason:`Maintenance ${status.toLowerCase()}`}})}return log});
  }
  listMaintenance() { return this.db.maintenanceLog.findMany({ include: { asset: true }, orderBy: { createdAt: 'desc' } }); }
  createAudit(dto: AuditSessionDto, actorId: string) { return this.db.auditSession.create({ data: { ...dto, createdById: actorId } }); }
  async startAudit(id: string) {
    const session = await this.db.auditSession.findUniqueOrThrow({ where: { id } });
    if (session.status !== 'DRAFT') throw new BadRequestException('Sesi audit bukan draft');
    const assets = await this.db.asset.findMany({ where: { deletedAt: null, locationId: session.locationId || undefined, departmentId: session.departmentId || undefined } });
    return this.db.$transaction(async (tx) => {
      if (assets.length) await tx.auditResult.createMany({ data: assets.map((asset) => ({ sessionId: id, assetId: asset.id, status: 'NOT_FOUND' })) });
      return tx.auditSession.update({ where: { id }, data: { status: 'ACTIVE', startedAt: new Date() } });
    });
  }
  async scan(id: string, dto: AuditScanDto, actorId: string) {
    const existing = await this.db.auditEvent.findUnique({ where: { operationId: dto.operationId } });
    if (existing) return { status: 'duplicate', operationId: dto.operationId };
    const session = await this.db.auditSession.findUniqueOrThrow({ where: { id } });
    if (session.status !== 'ACTIVE') return { status: 'conflict', operationId: dto.operationId, reason: 'SESSION_CLOSED' };
    const asset = await this.db.asset.findFirst({ where: { OR: [{ qrToken: dto.assetToken }, { code: dto.assetToken }], deletedAt: null }, include: { location: true } });
    if (!asset) return { status: 'conflict', operationId: dto.operationId, reason: 'ASSET_NOT_FOUND' };
    const observedStatus: AuditResultStatus = classifyAudit(dto.condition, dto.location, asset.location.name);
    await this.db.$transaction(async (tx) => {
      await tx.auditEvent.create({ data: { operationId: dto.operationId, sessionId: id, assetId: asset.id, scannedById: actorId, clientScannedAt: new Date(dto.scannedAt), payload: dto as any } });
      const current = await tx.auditResult.findUnique({ where: { sessionId_assetId: { sessionId: id, assetId: asset.id } } });
      const scannedAt = new Date(dto.scannedAt);
      if (!current) await tx.auditResult.create({ data: { sessionId: id, assetId: asset.id, status: observedStatus, observedLocation: dto.location, observedCondition: dto.condition, note: dto.note, scannedAt, scannedById: actorId } });
      else if (!current.scannedAt || scannedAt >= current.scannedAt) await tx.auditResult.update({ where: { sessionId_assetId: { sessionId: id, assetId: asset.id } }, data: { status: observedStatus, observedLocation: dto.location, observedCondition: dto.condition, note: dto.note, scannedAt, scannedById: actorId } });
    });
    return { status: 'accepted', operationId: dto.operationId, assetId: asset.id, result: observedStatus };
  }
  async sync(id: string, operations: AuditScanDto[], actorId: string) { const results = []; for (const operation of operations.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt))) results.push(await this.scan(id, operation, actorId)); return { results }; }
  async completeAudit(id: string) { const session = await this.db.auditSession.findUniqueOrThrow({ where: { id } }); if (session.status !== 'ACTIVE') throw new BadRequestException('Hanya sesi aktif yang dapat diselesaikan'); return this.db.auditSession.update({ where: { id }, data: { status: AuditStatus.COMPLETED, completedAt: new Date() }, include: { results: true } }); }
  async listAudits() { const rows=await this.db.auditSession.findMany({ include: { _count: { select: { results: true, events: true } } }, orderBy: { createdAt: 'desc' } }); const [locations,departments]=await Promise.all([this.db.location.findMany({select:{id:true,name:true}}),this.db.department.findMany({select:{id:true,name:true}})]);return rows.map(row=>({...row,location:locations.find(item=>item.id===row.locationId),department:departments.find(item=>item.id===row.departmentId)})); }
  async auditDetail(id: string) { const row=await this.db.auditSession.findUniqueOrThrow({ where: { id }, include: { results: { include: { asset: { include: { location: true, category: true } } }, orderBy: { status: 'asc' } }, events: { orderBy: { clientScannedAt: 'desc' } } } });const [location,department]=await Promise.all([row.locationId?this.db.location.findUnique({where:{id:row.locationId},select:{id:true,name:true}}):null,row.departmentId?this.db.department.findUnique({where:{id:row.departmentId},select:{id:true,name:true}}):null]);return {...row,location,department}; }
}

@ApiTags('operations')
@Controller()
export class OperationsController {
  constructor(private service: OperationsService) {}
  @Permissions('loans.manage') @Get('loans') loans() { return this.service.listLoans(); }
  @Permissions('loans.manage') @Post('loans') loan(@Body() dto: LoanDto, @Req() req: any) { return this.service.createLoan(dto, req.user.sub); }
  @Permissions('loans.manage') @Post('loans/:id/return') returnLoan(@Param('id') id: string, @Req() req: any) { return this.service.returnLoan(id, req.user.sub); }
  @Permissions('maintenance.manage') @Get('maintenance') maintenance() { return this.service.listMaintenance(); }
  @Permissions('maintenance.manage') @Post('maintenance') createMaintenance(@Body() dto: MaintenanceDto, @Req() req: any) { return this.service.createMaintenance(dto, req.user.sub); }
  @Permissions('maintenance.manage') @Patch('maintenance/:id') updateMaintenance(@Param('id') id: string, @Body('status') status: MaintenanceStatus, @Req() req: any, @Body('action') action?: string) { return this.service.updateMaintenance(id, status, req.user.sub, action); }
  @Permissions('audits.manage') @Get('audits') audits() { return this.service.listAudits(); }
  @Permissions('audits.manage') @Get('audits/:id') audit(@Param('id') id: string) { return this.service.auditDetail(id); }
  @Permissions('audits.manage') @Post('audits') createAudit(@Body() dto: AuditSessionDto, @Req() req: any) { return this.service.createAudit(dto, req.user.sub); }
  @Permissions('audits.manage') @Post('audits/:id/start') startAudit(@Param('id') id: string) { return this.service.startAudit(id); }
  @Permissions('audits.manage') @Post('audits/:id/scan') scan(@Param('id') id: string, @Body() dto: AuditScanDto, @Req() req: any) { return this.service.scan(id, dto, req.user.sub); }
  @Permissions('audits.manage') @Post('audits/:id/sync') sync(@Param('id') id: string, @Body() dto: AuditSyncDto, @Req() req: any) { return this.service.sync(id, dto.operations, req.user.sub); }
  @Permissions('audits.manage') @Post('audits/:id/complete') complete(@Param('id') id: string) { return this.service.completeAudit(id); }
}
