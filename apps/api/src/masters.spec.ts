import { MasterService } from './masters';

describe('MasterService', () => {
  it.each([
    ['categories', 'category'],
    ['locations', 'location'],
    ['departments', 'department'],
    ['vendors', 'vendor'],
    ['suppliers', 'supplier'],
  ] as const)('memetakan endpoint %s ke model Prisma %s', async (type, model) => {
    const findMany = jest.fn().mockResolvedValue([]);
    const database = { [model]: { findMany } };
    await new MasterService(database as never).list(type);
    expect(findMany).toHaveBeenCalledWith({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  });
});
