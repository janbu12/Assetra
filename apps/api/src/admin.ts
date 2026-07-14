import { Body, Controller, Get, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';
import { Permissions } from './auth';

export class UserDto { @IsEmail() email!: string; @IsString() name!: string; @IsString() @MinLength(8) password!: string; @IsUUID() roleId!: string; @IsOptional() @IsUUID() departmentId?: string; }

@Injectable()
export class AdminService {
  constructor(private db: PrismaService) {}
  users() { return this.db.user.findMany({ where: { deletedAt: null }, include: { role: true, department: true }, orderBy: { name: 'asc' } }); }
  roles() { return this.db.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } }); }
  async createUser(dto: UserDto) { const { password, ...data } = dto; return this.db.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await argon2.hash(password) }, include: { role: true } }); }
  notifications(userId: string) { return this.db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  readNotification(id: string, userId: string) { return this.db.notification.update({ where: { id, userId }, data: { readAt: new Date() } }); }
}

@ApiTags('administration')
@Controller()
export class AdminController {
  constructor(private service: AdminService) {}
  @Permissions('users.manage') @Get('users') users() { return this.service.users(); }
  @Permissions('users.manage') @Post('users') create(@Body() dto: UserDto) { return this.service.createUser(dto); }
  @Permissions('users.manage') @Get('roles') roles() { return this.service.roles(); }
  @Get('notifications') notifications(@Req() req: any) { return this.service.notifications(req.user.sub); }
  @Patch('notifications/:id/read') read(@Param('id') id: string, @Req() req: any) { return this.service.readNotification(id, req.user.sub); }
}
