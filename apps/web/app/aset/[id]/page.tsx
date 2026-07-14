'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Edit3, ImagePlus, MapPin, Package, Printer, QrCode, Trash2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { AssetForm, AssetFormValue } from '@/components/asset-form';
import { api } from '@/lib/api';

type Asset = AssetFormValue & {
  id: string; status: string; condition: string; purchasePrice?: string | number; createdAt: string; updatedAt: string;
  category: {name:string}; location: {name:string}; department?: {name:string}; vendor?: {name:string}; supplier?: {name:string}; custodian?: {name:string};
  photos: {id:string; caption?:string}[];
  movements: {id:string; createdAt:string; reason?:string; fromStatus?:string; toStatus?:string}[];
  loans: {id:string; borrowerName:string; status:string; loanedAt:string}[];
  maintenance: {id:string; complaint:string; status:string; createdAt:string}[];
};

export default function AssetDetailPage() {
  const { id } = useParams<{id:string}>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [qr, setQr] = useState<{dataUrl:string;token:string} | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const load = () => api<Asset>(`/assets/${id}`).then(setAsset).catch((cause) => setError(cause instanceof Error ? cause.message : 'Aset tidak ditemukan'));
  useEffect(() => { load(); }, [id]);

  async function update(value: AssetFormValue) { await api(`/assets/${id}`, { method:'PATCH', body:JSON.stringify(value) }); setEditing(false); await load(); }
  async function remove() { if (confirm('Arsipkan aset ini? Data transaksi dan riwayat tetap disimpan.')) { await api(`/assets/${id}`, {method:'DELETE'}); router.push('/aset'); } }
  async function showQr() { setQr(await api(`/assets/${id}/qr`)); }
  async function upload(file?: File) {
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    try { await api(`/assets/${id}/photos`, { method:'POST', body:form }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Foto gagal diunggah'); }
  }

  if (error && !asset) return <AppShell><div className="content"><div className="card empty-illustration">{error}</div></div></AppShell>;
  if (!asset) return <AppShell><div className="content"><div className="card">Memuat aset...</div></div></AppShell>;
  const initial: AssetFormValue = { ...asset, purchasePrice:Number(asset.purchasePrice || 0), purchaseDate:asset.purchaseDate?.slice(0,10), warrantyUntil:asset.warrantyUntil?.slice(0,10) };
  return <AppShell><div className="content">
    <div className="heading-row"><div><div className="eyebrow">{asset.code}</div><h1 className="page-title">{asset.name}</h1><p className="subtitle">Diperbarui {new Date(asset.updatedAt).toLocaleString('id-ID')}</p></div><div style={{display:'flex',gap:8}}><button className="button secondary" onClick={showQr}><QrCode size={15}/>QR Code</button><button className="button" onClick={() => setEditing(!editing)}><Edit3 size={15}/>{editing?'Batal':'Edit aset'}</button><button className="icon-button" onClick={remove} aria-label="Arsipkan aset"><Trash2 size={15}/></button></div></div>
    {editing ? <AssetForm initial={initial} submitLabel="Simpan perubahan" onSubmit={update}/> : <>
      <div className="dashboard-grid">
        <div className="card"><div className="card-title">Informasi aset</div><Info icon={<Package size={16}/>} label="Kategori" value={asset.category.name}/><Info icon={<MapPin size={16}/>} label="Lokasi" value={asset.location.name}/><Info icon={<UserRound size={16}/>} label="Penanggung jawab" value={asset.custodian?.name || asset.department?.name || 'Belum ditetapkan'}/><Info icon={<Package size={16}/>} label="Nomor serial" value={asset.serialNumber || '-'}/><Info icon={<Package size={16}/>} label="Nilai pembelian" value={Number(asset.purchasePrice || 0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0})}/></div>
        <div className="card"><div className="card-title">Status</div><div className="stat-value">{asset.status}</div><span className="badge" style={{marginTop:10}}>{asset.condition}</span><p className="subtitle" style={{marginTop:16}}>{asset.description || 'Belum ada deskripsi.'}</p><label className="button secondary" style={{marginTop:18,cursor:'pointer'}}><ImagePlus size={14}/>Unggah foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => upload(event.target.files?.[0])}/></label></div>
      </div>
      {!!asset.photos.length && <div className="card" style={{marginTop:16}}><div className="card-title">Foto aset</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>{asset.photos.map((photo) => <img key={photo.id} src={`/api/v1/assets/${asset.id}/photos/${photo.id}`} alt={photo.caption || asset.name} style={{width:'100%',height:150,objectFit:'cover',borderRadius:12}}/>)}</div></div>}
      <div className="table-card" style={{marginTop:16}}><div className="table-tools"><div className="card-title" style={{margin:0}}>Riwayat immutable</div></div><table><thead><tr><th>Waktu</th><th>Perubahan</th><th>Dari</th><th>Menjadi</th></tr></thead><tbody>{asset.movements.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('id-ID')}</td><td>{row.reason || 'Pembaruan aset'}</td><td>{row.fromStatus || '-'}</td><td>{row.toStatus || '-'}</td></tr>)}</tbody></table>{!asset.movements.length && <div className="empty-illustration">Belum ada perpindahan atau perubahan status.</div>}</div>
    </>}
    {qr && <div className="card" style={{position:'fixed',zIndex:50,inset:'10% auto auto 50%',transform:'translateX(-50%)',width:360,textAlign:'center',boxShadow:'0 24px 80px rgba(18,53,47,.25)'}}><div className="card-title">QR {asset.code}</div><img src={qr.dataUrl} alt={`QR ${asset.code}`} style={{width:280,maxWidth:'100%'}}/><div style={{display:'flex',justifyContent:'center',gap:8}}><a className="button secondary" href={qr.dataUrl} download={`QR-${asset.code}.png`}><Download size={14}/>Unduh</a><button className="button secondary" onClick={() => window.print()}><Printer size={14}/>Cetak</button><button className="button" onClick={() => setQr(null)}>Tutup</button></div></div>}
  </div></AppShell>;
}

function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="activity-item">{icon}<div><span className="asset-code">{label}</span><div className="asset-name">{value}</div></div></div>; }
