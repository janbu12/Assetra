import { classifyAudit, statusAfterReturn } from './business-rules';
describe('aturan operasional Assetra', () => {
  it('mengembalikan aset baik menjadi tersedia', () => expect(statusAfterReturn('GOOD')).toBe('AVAILABLE'));
  it('mengirim aset rusak ke maintenance', () => expect(statusAfterReturn('DAMAGED')).toBe('MAINTENANCE'));
  it('menandai perbedaan lokasi saat audit', () => expect(classifyAudit('GOOD','Gudang','Kantor')).toBe('LOCATION_MISMATCH'));
  it('memprioritaskan temuan rusak', () => expect(classifyAudit('NEEDS_REPAIR','Gudang','Kantor')).toBe('DAMAGED'));
});
