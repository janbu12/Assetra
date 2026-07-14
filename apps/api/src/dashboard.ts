import { Controller, Get, Injectable, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from './prisma.service';
import { Permissions, Public } from './auth';

@Injectable()
export class DashboardService {
  constructor(private db: PrismaService) {}
  async summary() {
    const [total, grouped, value, maintenanceCost, byCategory, byLocation] = await Promise.all([
      this.db.asset.count({ where: { deletedAt: null } }),
      this.db.asset.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
      this.db.asset.aggregate({ where: { deletedAt: null }, _sum: { purchasePrice: true } }),
      this.db.maintenanceLog.aggregate({ _sum: { cost: true } }),
      this.db.category.findMany({ where: { deletedAt: null }, select: { name: true, _count: { select: { assets: true } } } }),
      this.db.location.findMany({ where: { deletedAt: null }, select: { name: true, _count: { select: { assets: true } } } }),
    ]);
    return { total, byStatus: grouped.map((x) => ({ status: x.status, count: x._count })), totalValue: value._sum.purchasePrice || 0, maintenanceCost: maintenanceCost._sum.cost || 0, byCategory: byCategory.map((x) => ({ name: x.name, count: x._count.assets })), byLocation: byLocation.map((x) => ({ name: x.name, count: x._count.assets })) };
  }
  async assetExcel(response: Response) {
    const assets = await this.db.asset.findMany({ where: { deletedAt: null }, include: { category: true, location: true, department: true } });
    const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Aset');
    sheet.columns = [{ header: 'Kode', key: 'code', width: 18 }, { header: 'Nama', key: 'name', width: 32 }, { header: 'Kategori', key: 'category', width: 20 }, { header: 'Lokasi', key: 'location', width: 24 }, { header: 'Departemen', key: 'department', width: 20 }, { header: 'Status', key: 'status', width: 18 }, { header: 'Kondisi', key: 'condition', width: 18 }, { header: 'Nilai (IDR)', key: 'value', width: 18 }];
    assets.forEach((asset) => sheet.addRow({ code: asset.code, name: asset.name, category: asset.category.name, location: asset.location.name, department: asset.department?.name, status: asset.status, condition: asset.condition, value: Number(asset.purchasePrice || 0) }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12352F' } };
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); response.setHeader('Content-Disposition', 'attachment; filename=laporan-aset.xlsx');
    await book.xlsx.write(response); response.end();
  }
  async auditPdf(id: string, response: Response) {
    const audit = await this.db.auditSession.findUniqueOrThrow({ where: { id }, include: { results: { include: { asset: true } } } });
    response.setHeader('Content-Type', 'application/pdf'); response.setHeader('Content-Disposition', `attachment; filename=audit-${id}.pdf`);
    const doc = new PDFDocument({ margin: 48 }); doc.pipe(response); doc.fontSize(22).text('Laporan Audit Assetra'); doc.moveDown().fontSize(14).text(audit.name); doc.fontSize(10).fillColor('#64748b').text(`Status: ${audit.status} | Dibuat: ${audit.createdAt.toLocaleDateString('id-ID')}`); doc.moveDown();
    audit.results.forEach((row) => doc.fillColor('#111827').fontSize(10).text(`${row.asset.code} - ${row.asset.name} | ${row.status}${row.note ? ` | ${row.note}` : ''}`)); doc.end();
  }
}

@ApiTags('dashboard-reports')
@Controller()
export class DashboardController {
  constructor(private service: DashboardService) {}
  @Permissions('dashboard.read') @Get('dashboard') summary() { return this.service.summary(); }
  @Permissions('reports.read') @Get('reports/assets.xlsx') excel(@Res() response: Response) { return this.service.assetExcel(response); }
  @Permissions('reports.read') @Get('reports/audits/:id.pdf') pdf(@Param('id') id: string, @Res() response: Response) { return this.service.auditPdf(id, response); }
  @Public() @Get('health') health() { return { status: 'ok', service: 'assetra-api', timestamp: new Date().toISOString() }; }
}
