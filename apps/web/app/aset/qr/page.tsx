'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

type QrAsset = {id:string;code:string;name:string;dataUrl:string};
export default function BulkQrPage() {
  const [rows,setRows]=useState<QrAsset[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{api<QrAsset[]>('/assets/qr-bulk').then(setRows).catch((cause)=>setError(cause instanceof Error?cause.message:'QR gagal dimuat'))},[]);
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">Inventaris</div><h1 className="page-title">QR Code aset</h1><p className="subtitle">Cetak label QR unik untuk seluruh aset aktif.</p></div><button className="button" onClick={()=>window.print()}><Printer size={15}/>Cetak semua</button></div>{error&&<div className="card">{error}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>{rows.map((row)=><div className="card" key={row.id} style={{textAlign:'center',padding:16}}><img src={row.dataUrl} alt={`QR ${row.code}`} style={{width:'100%',maxWidth:180}}/><strong style={{display:'block',fontSize:12}}>{row.code}</strong><span className="asset-code">{row.name}</span></div>)}</div></div></AppShell>;
}
