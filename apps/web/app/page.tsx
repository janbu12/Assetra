'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Boxes, CircleDollarSign, MapPin, PackageCheck, Wrench } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

type Dashboard = {total:number;totalValue:string|number;maintenanceCost:string|number;activeMaintenance:number;departmentCount:number;byCategory:{name:string;count:number}[];byLocation:{name:string;count:number}[];attention:{id:string;code:string;name:string;status:string;condition:string;warrantyUntil?:string;location:{name:string}}[];recentMovements:{id:string;createdAt:string;reason?:string;asset:{id:string;code:string;name:string}}[]};
const empty:Dashboard={total:0,totalValue:0,maintenanceCost:0,activeMaintenance:0,departmentCount:0,byCategory:[],byLocation:[],attention:[],recentMovements:[]};

export default function DashboardPage(){
  const [data,setData]=useState(empty); const [error,setError]=useState('');
  useEffect(()=>{api<Dashboard>('/dashboard').then(setData).catch((cause)=>setError(cause instanceof Error?cause.message:'Dashboard gagal dimuat'))},[]);
  const max=Math.max(1,...data.byCategory.map(item=>item.count));
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">{new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(new Date())}</div><h1 className="page-title">Ringkasan aset</h1><p className="subtitle">Data operasional langsung dari inventaris Assetra.</p></div><Link href="/aset/baru" className="button"><Boxes size={16}/><span>Tambah aset</span></Link></div>
    {error&&<div className="card" style={{color:'#b84b44'}}>{error}</div>}
    <section className="stats-grid"><Stat icon={<PackageCheck size={17}/>} label="Total aset" value={data.total.toLocaleString('id-ID')} trend="Aset aktif terdaftar"/><Stat icon={<CircleDollarSign size={17}/>} label="Nilai aset" value={compactCurrency(data.totalValue)} trend="Nilai pembelian tercatat"/><Stat icon={<Wrench size={17}/>} label="Maintenance" value={String(data.activeMaintenance)} trend={`${compactCurrency(data.maintenanceCost)} total biaya`}/><Stat icon={<MapPin size={17}/>} label="Lokasi aktif" value={String(data.byLocation.length)} trend={`${data.departmentCount} departemen`}/></section>
    <section className="dashboard-grid"><div className="card"><div className="card-title"><span>Distribusi kategori</span><Link href="/laporan" className="button secondary">Lihat laporan <ArrowUpRight size={13}/></Link></div><div className="bar-chart">{data.byCategory.slice(0,8).map((item,i)=><div className="bar-wrap" key={item.name}><div className={`bar ${i===0?'highlight':''}`} style={{height:`${Math.max(8,item.count/max*100)}%`}}/><span>{item.name}</span></div>)}</div>{!data.byCategory.length&&<p className="subtitle">Belum ada data kategori.</p>}</div>
      <div className="card"><div className="card-title"><span>Aktivitas terbaru</span><span style={{color:'#74817c',fontSize:10}}>Terkini</span></div>{data.recentMovements.map(row=><div className="activity" key={row.id}><div className="activity-dot"><PackageCheck size={14}/></div><div><Link href={`/aset/${row.asset.id}`}><strong>{row.reason||'Aset diperbarui'}</strong></Link><span>{row.asset.code} • {row.asset.name}<br/>{new Date(row.createdAt).toLocaleString('id-ID')}</span></div></div>)}{!data.recentMovements.length&&<p className="subtitle">Belum ada aktivitas.</p>}</div></section>
    <section style={{marginTop:16}} className="table-card"><div className="table-tools"><div className="card-title" style={{margin:0}}>Perlu perhatian</div><Link href="/aset?status=MAINTENANCE" className="button secondary">Lihat semua</Link></div><table><thead><tr><th>Aset</th><th>Lokasi</th><th>Kondisi</th><th>Garansi</th><th>Status</th></tr></thead><tbody>{data.attention.map(row=><tr key={row.id}><td><Link href={`/aset/${row.id}`} className="asset-name">{row.name}</Link><span className="asset-code">{row.code}</span></td><td>{row.location.name}</td><td>{row.condition}</td><td>{row.warrantyUntil?new Date(row.warrantyUntil).toLocaleDateString('id-ID'):'-'}</td><td><span className="badge warning">{row.status}</span></td></tr>)}</tbody></table>{!data.attention.length&&<div className="empty-illustration">Tidak ada aset yang perlu perhatian segera.</div>}</section>
  </div></AppShell>;
}
function Stat({icon,label,value,trend}:{icon:React.ReactNode,label:string,value:string,trend:string}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><div className="stat-value">{value}</div><div className="trend">{trend}</div></div>}
function compactCurrency(value:string|number){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',notation:'compact',maximumFractionDigits:1}).format(Number(value||0))}
