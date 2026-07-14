import { Body, Controller, Get, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';
import { Permissions } from './auth';

export class UserDto { @IsEmail() email!: string; @IsString() name!: string; @IsString() @MinLength(8) password!: string; @IsUUID() roleId!: string; @IsOptional() @IsUUID() departmentId?: string; }
export class UpdateUserDto { @IsOptional() @IsString() name?:string; @IsOptional() @IsUUID() roleId?:string; @IsOptional() @IsUUID() departmentId?:string; @IsOptional() @IsBoolean() active?:boolean; @IsOptional() @IsString() @MinLength(8) password?:string; }
export class SettingsDto { @IsString() organizationName!:string; @IsString() timezone!:string; @IsString() currency!:string; @IsBoolean() warrantyNotifications!:boolean; }

@Injectable()
export class AdminService {
  constructor(private db: PrismaService) {}
  users() { return this.db.user.findMany({ where: { deletedAt: null }, include: { role: true, department: true }, orderBy: { name: 'asc' } }); }
  roles() { return this.db.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } }); }
  async createUser(dto: UserDto) { const { password, ...data } = dto; return this.db.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await argon2.hash(password) }, include: { role: true } }); }
  async updateUser(id:string,dto:UpdateUserDto,actorId:string){if(id===actorId&&dto.active===false)throw new Error('Akun sendiri tidak dapat dinonaktifkan');const {password,...data}=dto;const user=await this.db.user.update({where:{id},data:{...data,...(password?{passwordHash:await argon2.hash(password)}:{})},include:{role:true,department:true}});if(dto.active===false)await this.db.loginSession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});await this.db.systemAuditLog.create({data:{actorId,action:'USER_UPDATED',entityType:'User',entityId:id,after:{name:user.name,role:user.role.name,active:user.active}}});return user;}
  async notifications(userId: string) {
    const since = new Date(Date.now() - 86_400_000);
    const [assets, maintenance, recent, settings] = await Promise.all([
      this.db.asset.findMany({ where: { deletedAt: null, warrantyUntil: { gte: new Date(), lte: new Date(Date.now() + 30 * 86_400_000) } }, select: { code: true, name: true, warrantyUntil: true } }),
      this.db.maintenanceLog.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, include: { asset: { select: { code: true, name: true } } }, take: 10 }),
      this.db.notification.findMany({ where: { userId, createdAt: { gte: since } }, select: { type: true, message: true } }),
      this.db.systemSetting.findUnique({ where: { id: 'organization' } }),
    ]);
    const creates = [];
    if (settings?.warrantyNotifications !== false) for (const asset of assets) { const message = `Garansi ${asset.code} berakhir ${asset.warrantyUntil?.toLocaleDateString('id-ID')}`; if (!recent.some((row) => row.type === 'WARRANTY' && row.message === message)) creates.push(this.db.notification.create({ data: { userId, type: 'WARRANTY', title: 'Garansi segera berakhir', message } })); }
    for (const row of maintenance) { const message = `${row.asset.code} - ${row.asset.name} masih berstatus ${row.status}`; if (!recent.some((item) => item.type === 'MAINTENANCE' && item.message === message)) creates.push(this.db.notification.create({ data: { userId, type: 'MAINTENANCE', title: 'Maintenance perlu tindakan', message } })); }
    if (creates.length) await this.db.$transaction(creates);
    return this.db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  readNotification(id: string, userId: string) { return this.db.notification.update({ where: { id, userId }, data: { readAt: new Date() } }); }
  settings() { return this.db.systemSetting.upsert({ where: { id: 'organization' }, update: {}, create: { id: 'organization' } }); }
  updateSettings(dto:SettingsDto,actorId:string) { return this.db.$transaction(async tx=>{const settings=await tx.systemSetting.upsert({where:{id:'organization'},update:dto,create:{id:'organization',...dto}});await tx.systemAuditLog.create({data:{actorId,action:'SETTINGS_UPDATED',entityType:'SystemSetting',entityId:'organization',after:settings as any}});return settings}); }
}

@ApiTags('administration')
@Controller()
export class AdminController {
  constructor(private service: AdminService) {}
  @Permissions('users.manage') @Get('users') users() { return this.service.users(); }
  @Permissions('users.manage') @Post('users') create(@Body() dto: UserDto) { return this.service.createUser(dto); }
  @Permissions('users.manage') @Patch('users/:id') update(@Param('id') id:string,@Body() dto:UpdateUserDto,@Req() req:any){return this.service.updateUser(id,dto,req.user.sub);}
  @Permissions('users.manage') @Get('roles') roles() { return this.service.roles(); }
  @Get('notifications') notifications(@Req() req: any) { return this.service.notifications(req.user.sub); }
  @Patch('notifications/:id/read') read(@Param('id') id: string, @Req() req: any) { return this.service.readNotification(id, req.user.sub); }
  @Permissions('settings.manage') @Get('settings') settings(){return this.service.settings();}
  @Permissions('settings.manage') @Patch('settings') updateSettings(@Body() dto:SettingsDto,@Req() req:any){return this.service.updateSettings(dto,req.user.sub);}
}
