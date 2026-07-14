'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { AssetForm, AssetFormValue } from '@/components/asset-form';
import { api } from '@/lib/api';

export default function NewAssetPage() {
  const router = useRouter();
  async function create(value: AssetFormValue) {
    const asset = await api<{id:string}>('/assets', { method: 'POST', body: JSON.stringify(value) });
    router.push(`/aset/${asset.id}`);
  }
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">Inventaris</div><h1 className="page-title">Tambah aset</h1><p className="subtitle">Daftarkan identitas, penempatan, nilai, dan kondisi awal aset.</p></div></div><AssetForm onSubmit={create}/></div></AppShell>;
}
