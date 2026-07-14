'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';

type Reference = { id: string; name: string; code?: string };
export type AssetFormValue = {
  code: string; name: string; serialNumber?: string; description?: string;
  categoryId: string; locationId: string; departmentId?: string; vendorId?: string; supplierId?: string; custodianId?: string;
  status?: string; condition?: string; purchasePrice?: number; purchaseDate?: string; warrantyUntil?: string;
};

const empty: AssetFormValue = { code: '', name: '', serialNumber: '', description: '', categoryId: '', locationId: '', departmentId: '', vendorId: '', supplierId: '', custodianId: '', status: 'AVAILABLE', condition: 'GOOD', purchasePrice: 0, purchaseDate: '', warrantyUntil: '' };

export function AssetForm({ initial, submitLabel = 'Simpan aset', onSubmit }: { initial?: Partial<AssetFormValue>; submitLabel?: string; onSubmit: (value: AssetFormValue) => Promise<void> }) {
  const [value, setValue] = useState<AssetFormValue>({ ...empty, ...initial });
  const [refs, setRefs] = useState<Record<string, Reference[]>>({ categories: [], locations: [], departments: [], vendors: [], suppliers: [], custodians: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Reference[]>('/masters/categories'), api<Reference[]>('/masters/locations'), api<Reference[]>('/masters/departments'),
      api<Reference[]>('/masters/vendors'), api<Reference[]>('/masters/suppliers'), api<Reference[]>('/assets/custodians'),
    ]).then(([categories, locations, departments, vendors, suppliers, custodians]) => {
      setRefs({ categories, locations, departments, vendors, suppliers, custodians });
      setValue((current) => ({ ...current, categoryId: current.categoryId || categories[0]?.id || '', locationId: current.locationId || locations[0]?.id || '' }));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Referensi aset gagal dimuat'));
  }, []);

  function set<K extends keyof AssetFormValue>(key: K, next: AssetFormValue[K]) { setValue((current) => ({ ...current, [key]: next })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const payload = Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== undefined)) as AssetFormValue;
    try { await onSubmit(payload); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Aset gagal disimpan'); } finally { setBusy(false); }
  }
  const reference = (label: string, key: keyof AssetFormValue, rows: Reference[], required = false) => <div className="field"><label>{label}</label><select value={String(value[key] || '')} onChange={(event) => set(key, event.target.value as never)} required={required}><option value="">{required ? `Pilih ${label.toLowerCase()}` : 'Tidak ditetapkan'}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.code ? `${row.code} — ` : ''}{row.name}</option>)}</select></div>;

  return <form className="card" onSubmit={submit} style={{maxWidth:920}}>
    <div className="card-title">Informasi aset</div>
    <div className="dashboard-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
      <div>
        <div className="field"><label>Kode aset</label><input value={value.code} onChange={(event) => set('code', event.target.value.toUpperCase())} required/></div>
        <div className="field"><label>Nama aset</label><input value={value.name} onChange={(event) => set('name', event.target.value)} required/></div>
        <div className="field"><label>Nomor serial</label><input value={value.serialNumber || ''} onChange={(event) => set('serialNumber', event.target.value)}/></div>
        <div className="field"><label>Deskripsi</label><textarea value={value.description || ''} onChange={(event) => set('description', event.target.value)} rows={4}/></div>
        {reference('Kategori', 'categoryId', refs.categories, true)}
        {reference('Lokasi', 'locationId', refs.locations, true)}
      </div>
      <div>
        {reference('Departemen', 'departmentId', refs.departments)}
        {reference('Penanggung jawab', 'custodianId', refs.custodians)}
        {reference('Vendor', 'vendorId', refs.vendors)}
        {reference('Supplier', 'supplierId', refs.suppliers)}
        <div className="field"><label>Status</label><select value={value.status} onChange={(event) => set('status', event.target.value)}>{['AVAILABLE','IN_USE','MAINTENANCE','LOST','DISPOSED'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label>Kondisi</label><select value={value.condition} onChange={(event) => set('condition', event.target.value)}>{['GOOD','DAMAGED','NEEDS_REPAIR','UNKNOWN'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label>Harga pembelian (IDR)</label><input type="number" min="0" value={value.purchasePrice || 0} onChange={(event) => set('purchasePrice', Number(event.target.value))}/></div>
        <div className="field"><label>Tanggal pembelian</label><input type="date" value={value.purchaseDate || ''} onChange={(event) => set('purchaseDate', event.target.value)}/></div>
        <div className="field"><label>Garansi sampai</label><input type="date" value={value.warrantyUntil || ''} onChange={(event) => set('warrantyUntil', event.target.value)}/></div>
      </div>
    </div>
    {error && <p style={{color:'#b84b44',fontSize:11}}>{error}</p>}
    <button className="button" disabled={busy}><Save size={15}/>{busy ? 'Menyimpan...' : submitLabel}</button>
  </form>;
}
