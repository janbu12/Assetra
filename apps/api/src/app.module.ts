import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthController, AuthService, CsrfGuard, PermissionGuard, SessionGuard } from './auth';
import { AssetController, AssetService } from './assets';
import { MasterController, MasterService } from './masters';
import { OperationsController, OperationsService } from './operations';
import { DashboardController, DashboardService } from './dashboard';
import { AdminController, AdminService } from './admin';
import { StorageController, StorageService } from './storage';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({ global: true })],
  controllers: [AuthController, AssetController, MasterController, OperationsController, DashboardController, AdminController, StorageController],
  providers: [
    PrismaService,
    AuthService,
    AssetService,
    MasterService,
    OperationsService,
    DashboardService,
    AdminService,
    StorageService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
