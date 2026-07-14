import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { Permissions } from './auth';

type MasterType = 'categories' | 'locations' | 'departments' | 'vendors' | 'suppliers';
const allowed = new Set<MasterType>(['categories', 'locations', 'departments', 'vendors', 'suppliers']);

export class MasterDto {
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
export class MasterService {
  constructor(private db: PrismaService) {}
  private model(type: MasterType): any {
    if (!allowed.has(type)) throw new Error('Master data tidak dikenal');
    const models: Record<MasterType, string> = {
      categories: 'category',
      locations: 'location',
      departments: 'department',
      vendors: 'vendor',
      suppliers: 'supplier',
    };
    return (this.db as any)[models[type]];
  }
  list(type: MasterType) { return this.model(type).findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }); }
  create(type: MasterType, data: MasterDto) { return this.model(type).create({ data }); }
  update(type: MasterType, id: string, data: Partial<MasterDto>) { return this.model(type).update({ where: { id }, data }); }
  remove(type: MasterType, id: string) { return this.model(type).update({ where: { id }, data: { deletedAt: new Date() } }); }
}

@ApiTags('master-data')
@Permissions('masters.manage')
@Controller('masters')
export class MasterController {
  constructor(private service: MasterService) {}
  @Get(':type') list(@Param('type') type: MasterType) { return this.service.list(type); }
  @Post(':type') create(@Param('type') type: MasterType, @Body() dto: MasterDto) { return this.service.create(type, dto); }
  @Patch(':type/:id') update(@Param('type') type: MasterType, @Param('id') id: string, @Body() dto: Partial<MasterDto>) { return this.service.update(type, id, dto); }
  @Delete(':type/:id') remove(@Param('type') type: MasterType, @Param('id') id: string) { return this.service.remove(type, id); }
}
