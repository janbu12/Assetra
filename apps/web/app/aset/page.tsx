'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Eye, Filter, Plus, QrCode, Search } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

type Reference = {id:string;name:string};
type Asset = {id:string;name:string;code:string;serialNumber?:string;status:string;condition:string;category:{name:string};location:{name:string};department?:{name:string}};
type Result = {items:Asset[];meta:{page:number;pageSize:number;total:number;pageCount:number}};
const statusLabel:Record<string,string>={AVAILABLE:'Tersedia',IN_USE:'Digunakan',MAINTENANCE:'Maintenance',LOST:'Hilang',DISPOSED:'Dihapuskan'};
const conditionLabel:Record<string,string>={GOOD:'Baik',DAMAGED:'Rusak',NEEDS_REPAIR:'Perlu perbaikan',UNKNOWN:'Belum diperiksa'};

export default function AssetsPage(){
  const [q,setQ]=useState(''); const [status,setStatus]=useState(''); const [categoryId,setCategory]=useState(''); const [locationId,setLocation]=useState(''); const [page,setPage]=useState(1);
  const [result,setResult]=useState<Result>({items:[],meta:{page:1,pageSize:20,total:0,pageCount:1}}); const [refs,setRefs]=useState<{categories:Reference[];locations:Reference[]}>({categories:[],locations:[]}); const [error,setError]=useState('');
  useEffect(()=>{const params=new URLSearchParams(window.location.search);setQ(params.get('q')||'');setStatus(params.get('status')||'');Promise.all([api<Reference[]>('/masters/categories'),api<Reference[]>('/masters/locations')]).then(([categories,locations])=>setRefs({categories,locations})).catch(()=>undefined)},[]);
  useEffect(()=>{const timer=setTimeout(()=>{const params=new URLSearchParams({page:String(page)});if(q)params.set('q',q);if(status)params.set('status',status);if(categoryId)params.set('categoryId',categoryId);if(locationId)params.set('locationId',locationId);api<Result>(`/assets?${params}`).then((data)=>{setResult(data);setError('')}).catch((cause)=>setError(cause instanceof Error?cause.message:'Aset gagal dimuat'))},250);return()=>clearTimeout(timer)},[q,status,categoryId,locationId,page]);
  function reset(){setQ('');setStatus('');setCategory('');setLocation('');setPage(1)}
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">Inventaris</div><h1 className="page-title">Daftar aset</h1><p className="subtitle">Kelola {result.meta.total.toLocaleString('id-ID')} aset terdaftar di seluruh lokasi.</p></div><Link href="/aset/baru" className="button"><Plus size={16}/><span>Tambah aset</span></Link></div>
    <div className="table-card"><div className="table-tools" style={{alignItems:'flex-end'}}><div style={{display:'flex',gap:9,flexWrap:'wrap'}}><div><label className="asset-code">Pencarian</label><div className="search" style={{width:260}}><Search size={14}/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Kode, nama, atau serial..."/></div></div><FilterSelect label="Status" value={status} onChange={setStatus} options={Object.entries(statusLabel)}/><FilterSelect label="Kategori" value={categoryId} onChange={setCategory} options={refs.categories.map(row=>[row.id,row.name])}/><FilterSelect label="Lokasi" value={locationId} onChange={setLocation} options={refs.locations.map(row=>[row.id,row.name])}/><button className="button secondary" onClick={reset}><Filter size={14}/>Reset</button></div><div style={{display:'flex',gap:8}}><Link className="button secondary" href="/aset/qr"><QrCode size={14}/>QR bulk</Link><a className="button secondary" href="/api/v1/reports/assets.xlsx"><Download size={14}/>Excel</a></div></div>
      {error&&<p style={{padding:'0 20px',color:'#b84b44'}}>{error}</p>}<table><thead><tr><th>Aset</th><th>Kategori</th><th>Lokasi</th><th>Departemen</th><th>Kondisi</th><th>Status</th><th></th></tr></thead><tbody>{result.items.map(a=><tr key={a.id}><td><Link href={`/aset/${a.id}`} className="asset-name">{a.name}</Link><span className="asset-code">{a.code} • {a.serialNumber||'-'}</span></td><td>{a.category.name}</td><td>{a.location.name}</td><td>{a.department?.name||'-'}</td><td>{conditionLabel[a.condition]||a.condition}</td><td><span className={`badge ${a.status==='MAINTENANCE'?'warning':''}`}>{statusLabel[a.status]||a.status}</span></td><td><Link href={`/aset/${a.id}`} className="icon-button" style={{width:30,height:30}} aria-label={`Buka ${a.name}`}><Eye size={14}/></Link></td></tr>)}</tbody></table>
      {!result.items.length&&!error&&<div className="empty-illustration">Tidak ada aset yang sesuai dengan filter.</div>}<div className="table-tools"><span className="subtitle">Halaman {result.meta.page} dari {Math.max(1,result.meta.pageCount)}</span><div style={{display:'flex',gap:8}}><button className="button secondary" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Sebelumnya</button><button className="button secondary" disabled={page>=result.meta.pageCount} onClick={()=>setPage(value=>value+1)}>Berikutnya</button></div></div>
    </div></div></AppShell>;
}

function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[][]}){return <div><label className="asset-code">{label}</label><select value={value} onChange={event=>onChange(event.target.value)} style={{display:'block',height:40,border:'1px solid var(--line)',borderRadius:11,padding:'0 10px',background:'white'}}><option value="">Semua</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>}
