import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetCondition, AssetStatus, Prisma } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import QRCode from 'qrcode';
import { PrismaService } from './prisma.service';
import { Permissions } from './auth';

export class AssetDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsUUID() categoryId!: string;
  @IsUUID() locationId!: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @IsNumber() purchasePrice?: number;
  @IsOptional() @IsString() purchaseDate?: string;
  @IsOptional() @IsString() warrantyUntil?: string;
}

@ApiTags('assets')
@Permissions('assets.read')
@Controller('assets')
export class AssetController {
  constructor(private service: AssetService) {}
  @Get() list(@Query('q') q?: string, @Query('status') status?: AssetStatus, @Query('page') page = '1') { return this.service.list(q, status, Number(page)); }
  @Get('qr/:token') byQr(@Param('token') token: string) { return this.service.byQr(token); }
  @Get(':id') detail(@Param('id') id: string) { return this.service.detail(id); }
  @Get(':id/qr') qr(@Param('id') id: string) { return this.service.qr(id); }
  @Permissions('assets.write') @Post() create(@Body() dto: AssetDto, @Req() req: any) { return this.service.create(dto, req.user.sub); }
  @Permissions('assets.write') @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<AssetDto>, @Req() req: any) { return this.service.update(id, dto, req.user.sub); }
  @Permissions('assets.write') @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}

@Injectable()
export class AssetService {
  constructor(private db: PrismaService) {}
  private include = { category: true, location: true, department: true, vendor: true, supplier: true, custodian: { select: { id: true, name: true } } } as const;
  async list(q?: string, status?: AssetStatus, page = 1) {
    const where: Prisma.AssetWhereInput = { deletedAt: null, status, OR: q ? [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { serialNumber: { contains: q, mode: 'insensitive' } }] : undefined };
    const [items, total] = await this.db.$transaction([
      this.db.asset.findMany({ where, include: this.include, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * 20, take: 20 }),
      this.db.asset.count({ where }),
    ]);
    return { items, meta: { page, pageSize: 20, total, pageCount: Math.ceil(total / 20) } };
  }
  detail(id: string) { return this.db.asset.findFirstOrThrow({ where: { id, deletedAt: null }, include: { ...this.include, photos: true, movements: { orderBy: { createdAt: 'desc' } }, loans: { orderBy: { loanedAt: 'desc' } }, maintenance: { orderBy: { createdAt: 'desc' } }, auditResults: { include: { session: true }, orderBy: { scannedAt: 'desc' } } } }); }
  byQr(token: string) { return this.db.asset.findFirstOrThrow({ where: { qrToken: token, deletedAt: null }, include: this.include }); }
  async qr(id: string) { const asset = await this.db.asset.findUniqueOrThrow({ where: { id } }); return { token: asset.qrToken, dataUrl: await QRCode.toDataURL(`${process.env.WEB_URL || 'http://localhost:3000'}/scan/${asset.qrToken}`, { width: 512, margin: 2 }) }; }
  create(dto: AssetDto, actorId: string) { return this.db.asset.create({ data: { ...dto, purchasePrice: dto.purchasePrice, purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined, warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined }, include: this.include }).then(async (asset) => { await this.db.systemAuditLog.create({ data: { actorId, action: 'ASSET_CREATED', entityType: 'Asset', entityId: asset.id, after: asset as any } }); return asset; }); }
  async update(id: string, dto: Partial<AssetDto>, actorId: string) {
    const before = await this.db.asset.findUniqueOrThrow({ where: { id } });
    const data: any = { ...dto, purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined, warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined };
    const updated = await this.db.$transaction(async (tx) => {
      const asset = await tx.asset.update({ where: { id }, data, include: this.include });
      if (before.locationId !== asset.locationId || before.status !== asset.status || before.custodianId !== asset.custodianId) await tx.assetMovement.create({ data: { assetId: id, actorId, fromLocationId: before.locationId, toLocationId: asset.locationId, fromStatus: before.status, toStatus: asset.status, fromCustodian: before.custodianId, toCustodian: asset.custodianId } });
      await tx.systemAuditLog.create({ data: { actorId, action: 'ASSET_UPDATED', entityType: 'Asset', entityId: id, before: before as any, after: asset as any } });
      return asset;
    });
    return updated;
  }
  remove(id: string) { return this.db.asset.update({ where: { id }, data: { deletedAt: new Date() } }); }
}
