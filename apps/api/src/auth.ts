import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Post, Req, Res, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { randomBytes } from 'crypto';

export const Public = () => SetMetadata('public', true);
export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async login(dto: LoginDto, response: Response) {
    const user = await this.db.user.findFirst({
      where: { email: dto.email.toLowerCase(), active: true, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) throw new UnauthorizedException('Email atau kata sandi salah');
    const permissions = user.role.permissions.map((item) => item.permission.code);
    const payload = { sub: user.id, role: user.role.name, permissions };
    const access = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' });
    const refresh = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '7d' });
    await this.db.loginSession.create({ data: { userId: user.id, refreshTokenHash: await argon2.hash(refresh), expiresAt: new Date(Date.now() + 604_800_000) } });
    const secure = this.config.get('NODE_ENV') === 'production';
    const csrf = randomBytes(24).toString('hex');
    response.cookie('assetra_access', access, { httpOnly: true, sameSite: 'lax', secure, maxAge: 900_000 });
    response.cookie('assetra_refresh', refresh, { httpOnly: true, sameSite: 'lax', secure, maxAge: 604_800_000 });
    response.cookie('assetra_csrf', csrf, { httpOnly: false, sameSite: 'lax', secure, maxAge: 604_800_000 });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role.name, permissions } };
  }
  async refresh(request: Request, response: Response) {
    const refresh = request.cookies?.assetra_refresh;
    if (!refresh) throw new UnauthorizedException('Refresh token tidak tersedia');
    let payload: any;
    try { payload = await this.jwt.verifyAsync(refresh, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') }); }
    catch { throw new UnauthorizedException('Refresh token tidak valid'); }
    const sessions = await this.db.loginSession.findMany({ where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } } });
    let active = null;
    for (const session of sessions) if (await argon2.verify(session.refreshTokenHash, refresh)) { active = session; break; }
    if (!active) throw new UnauthorizedException('Sesi tidak ditemukan');
    const user = await this.db.user.findFirst({
      where: { id: payload.sub, active: true, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) throw new UnauthorizedException('Akun tidak lagi aktif');
    const nextPayload = {
      sub: user.id,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.code),
    };
    const access = await this.jwt.signAsync(nextPayload, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' });
    const nextRefresh = await this.jwt.signAsync(nextPayload, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '7d' });
    await this.db.$transaction([this.db.loginSession.update({ where: { id: active.id }, data: { revokedAt: new Date() } }), this.db.loginSession.create({ data: { userId: payload.sub, refreshTokenHash: await argon2.hash(nextRefresh), expiresAt: new Date(Date.now() + 604_800_000) } })]);
    const secure = this.config.get('NODE_ENV') === 'production';
    response.cookie('assetra_access', access, { httpOnly: true, sameSite: 'lax', secure, maxAge: 900_000 });
    response.cookie('assetra_refresh', nextRefresh, { httpOnly: true, sameSite: 'lax', secure, maxAge: 604_800_000 });
    return { success: true };
  }

  async profile(userId: string) {
    const user = await this.db.user.findFirstOrThrow({
      where: { id: userId, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } },
        department: { select: { id: true, name: true } },
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.code),
      department: user.department,
    };
  }

  async logout(request: Request, response: Response) {
    const refresh = request.cookies?.assetra_refresh;
    if (refresh) {
      const sessions = await this.db.loginSession.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } } });
      for (const session of sessions) {
        if (await argon2.verify(session.refreshTokenHash, refresh)) {
          await this.db.loginSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
          break;
        }
      }
    }
    response.clearCookie('assetra_access');
    response.clearCookie('assetra_refresh');
    response.clearCookie('assetra_csrf');
    return { success: true };
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private config: ConfigService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.assetra_access || req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Silakan masuk terlebih dahulu');
    try {
      req.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') });
      return true;
    } catch { throw new UnauthorizedException('Sesi telah berakhir'); }
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [context.getHandler(), context.getClass()]) || [];
    if (!required.length) return true;
    const actual: string[] = context.switchToHttp().getRequest().user?.permissions || [];
    if (!required.every((permission) => actual.includes(permission))) throw new ForbiddenException('Anda tidak memiliki izin untuk tindakan ini');
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const token = request.headers['x-csrf-token'];
    if (!token || token !== request.cookies?.assetra_csrf) throw new ForbiddenException('Token keamanan tidak valid');
    return true;
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Public() @Post('login') login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { return this.auth.login(dto, response); }
  @Public() @Post('refresh') refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.auth.refresh(request, response); }
  @Post('logout') logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.auth.logout(request, response); }
  @Get('me') me(@Req() request: any) { return this.auth.profile(request.user.sub); }
}
