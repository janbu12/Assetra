'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, ScanLine } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

type Result = { id:string; status:string; observedLocation?:string; observedCondition?:string; asset:{id:string;code:string;name:string;condition:string;location:{name:string};category:{name:string}} };
type Audit = { id:string; name:string; status:string; location?:{name:string}; department?:{name:string}; results:Result[] };

export default function AuditDetailPage(){
  const {id}=useParams<{id:string}>(); const [audit,setAudit]=useState<Audit|null>(null); const [error,setError]=useState('');
  useEffect(()=>{api<Audit>(`/audits/${id}`).then(setAudit).catch(cause=>setError(cause instanceof Error?cause.message:'Audit tidak ditemukan'))},[id]);
  if(!audit)return <AppShell><div className="content"><div className="card">{error||'Memuat audit...'}</div></div></AppShell>;
  const counts=audit.results.reduce<Record<string,number>>((all,row)=>({...all,[row.status]:(all[row.status]||0)+1}),{});
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">{audit.status}</div><h1 className="page-title">{audit.name}</h1><p className="subtitle">{audit.location?.name||'Semua lokasi'} • {audit.department?.name||'Semua departemen'}</p></div><div style={{display:'flex',gap:8}}>{audit.status==='ACTIVE'&&<Link href={`/scan?session=${id}`} className="button lime"><ScanLine size={14}/>Lanjut scan</Link>}<a href={`/api/v1/reports/audits/${id}.pdf`} className="button secondary"><Download size={14}/>PDF</a><a href={`/api/v1/reports/audits/${id}.xlsx`} className="button secondary"><Download size={14}/>Excel</a></div></div>
    <section className="stats-grid"><Stat label="Ditemukan" value={counts.FOUND||0}/><Stat label="Tidak ditemukan" value={counts.NOT_FOUND||0}/><Stat label="Rusak" value={counts.DAMAGED||0}/><Stat label="Beda lokasi" value={counts.LOCATION_MISMATCH||0}/></section>
    <div className="table-card" style={{marginTop:16}}><table><thead><tr><th>Aset</th><th>Kategori</th><th>Lokasi terdaftar</th><th>Observasi</th><th>Kondisi</th><th>Hasil</th></tr></thead><tbody>{audit.results.map(row=><tr key={row.id}><td><Link href={`/aset/${row.asset.id}`} className="asset-name">{row.asset.name}</Link><span className="asset-code">{row.asset.code}</span></td><td>{row.asset.category.name}</td><td>{row.asset.location.name}</td><td>{row.observedLocation||'-'}</td><td>{row.observedCondition||row.asset.condition}</td><td><span className={`badge ${row.status!=='FOUND'?'warning':''}`}>{row.status}</span></td></tr>)}</tbody></table></div>
  </div></AppShell>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="stat-card"><div className="stat-top"><span>{label}</span></div><div className="stat-value">{value}</div></div>}
