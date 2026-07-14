import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const db = new PrismaClient();
const permissions = ['dashboard.read', 'assets.read', 'assets.write', 'masters.manage', 'loans.manage', 'maintenance.manage', 'audits.manage', 'reports.read', 'users.manage', 'settings.manage'];
const roleMap: Record<string, string[]> = {
  'Super Admin': permissions,
  'Admin Aset': permissions.filter((p) => !['settings.manage'].includes(p)),
  'Staff IT/GA': ['dashboard.read', 'assets.read', 'assets.write', 'loans.manage', 'maintenance.manage', 'audits.manage'],
  Auditor: ['assets.read', 'audits.manage', 'reports.read'],
  Manager: ['dashboard.read', 'assets.read', 'reports.read'],
};

async function main() {
  const permissionRows = new Map<string, string>();
  for (const code of permissions) {
    const item = await db.permission.upsert({ where: { code }, update: {}, create: { code, description: code.replace('.', ' ') } });
    permissionRows.set(code, item.id);
  }
  const roles = new Map<string, string>();
  for (const [name, codes] of Object.entries(roleMap)) {
    const role = await db.role.upsert({ where: { name }, update: {}, create: { name } }); roles.set(name, role.id);
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: codes.map((code) => ({ roleId: role.id, permissionId: permissionRows.get(code)! })) });
  }
  const department = await db.department.upsert({ where: { code: 'IT' }, update: {}, create: { code: 'IT', name: 'Teknologi Informasi' } });
  const operations = await db.department.upsert({ where: { code: 'OPS' }, update: {}, create: { code: 'OPS', name: 'Operasional' } });
  const hq = await db.location.upsert({ where: { code: 'HQ' }, update: {}, create: { code: 'HQ', name: 'Kantor Pusat', address: 'Jakarta' } });
  const warehouse = await db.location.upsert({ where: { code: 'WH' }, update: {}, create: { code: 'WH', name: 'Gudang Utama', address: 'Jakarta' } });
  const laptop = await db.category.upsert({ where: { code: 'LPT' }, update: {}, create: { code: 'LPT', name: 'Laptop' } });
  const printer = await db.category.upsert({ where: { code: 'PRN' }, update: {}, create: { code: 'PRN', name: 'Printer' } });
  const vendor = await db.vendor.upsert({ where: { name: 'PT Teknologi Nusantara' }, update: {}, create: { name: 'PT Teknologi Nusantara', email: 'sales@example.id' } });
  const supplier = await db.supplier.upsert({ where: { name: 'CV Sarana Kantor' }, update: {}, create: { name: 'CV Sarana Kantor' } });
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@assetra.id';
  await db.user.upsert({ where: { email }, update: {}, create: { email, name: 'Super Admin', passwordHash: await argon2.hash(process.env.SUPER_ADMIN_PASSWORD || 'Assetra123!'), roleId: roles.get('Super Admin')!, departmentId: department.id } });
  const assets = [
    { code: 'AST-2026-001', name: 'MacBook Pro 14', serialNumber: 'MBP-DEMO-001', categoryId: laptop.id, locationId: hq.id, departmentId: department.id, vendorId: vendor.id, supplierId: supplier.id, purchasePrice: 32999000, warrantyUntil: new Date('2027-06-01') },
    { code: 'AST-2026-002', name: 'ThinkPad X1 Carbon', serialNumber: 'TP-DEMO-002', categoryId: laptop.id, locationId: hq.id, departmentId: operations.id, vendorId: vendor.id, purchasePrice: 24999000, status: 'IN_USE' as const },
    { code: 'AST-2026-003', name: 'Printer LaserJet Pro', serialNumber: 'PR-DEMO-003', categoryId: printer.id, locationId: warehouse.id, departmentId: operations.id, supplierId: supplier.id, purchasePrice: 6899000, status: 'MAINTENANCE' as const, condition: 'NEEDS_REPAIR' as const },
  ];
  for (const asset of assets) await db.asset.upsert({ where: { code: asset.code }, update: {}, create: asset });
}

main().finally(() => db.$disconnect());
