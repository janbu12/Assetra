'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

type Settings={organizationName:string;timezone:string;currency:string;warrantyNotifications:boolean};
const defaults:Settings={organizationName:'',timezone:'Asia/Jakarta',currency:'IDR',warrantyNotifications:true};

export default function SettingsPage(){
  const [value,setValue]=useState(defaults); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{api<Settings>('/settings').then(setValue).catch(cause=>setMessage(cause instanceof Error?cause.message:'Pengaturan gagal dimuat'))},[]);
  async function submit(event:FormEvent){
    event.preventDefault(); setBusy(true); setMessage('');
    try { const payload={organizationName:value.organizationName,timezone:value.timezone,currency:value.currency,warrantyNotifications:value.warrantyNotifications}; setValue(await api<Settings>('/settings',{method:'PATCH',body:JSON.stringify(payload)})); setMessage('Pengaturan tersimpan di server.'); }
    catch(cause){setMessage(cause instanceof Error?cause.message:'Pengaturan gagal disimpan')}
    finally{setBusy(false)}
  }
  return <AppShell><div className="content"><div className="heading-row"><div><div className="eyebrow">Sistem</div><h1 className="page-title">Pengaturan</h1><p className="subtitle">Preferensi organisasi dan notifikasi operasional.</p></div></div><form className="card" style={{maxWidth:720}} onSubmit={submit}><div className="card-title">Profil organisasi</div><div className="field"><label>Nama organisasi</label><input value={value.organizationName} onChange={event=>setValue({...value,organizationName:event.target.value})} required/></div><div className="field"><label>Zona waktu</label><select value={value.timezone} onChange={event=>setValue({...value,timezone:event.target.value})}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></div><div className="field"><label>Mata uang</label><select value={value.currency} onChange={event=>setValue({...value,currency:event.target.value})}><option value="IDR">IDR — Rupiah Indonesia</option></select></div><div className="field"><label><input type="checkbox" checked={value.warrantyNotifications} onChange={event=>setValue({...value,warrantyNotifications:event.target.checked})} style={{width:'auto',marginRight:8}}/>Aktifkan notifikasi garansi dalam aplikasi</label></div><button className="button" disabled={busy}><Save size={15}/>{busy?'Menyimpan...':'Simpan pengaturan'}</button>{message&&<span className="trend" style={{marginLeft:12}}>{message}</span>}</form></div></AppShell>;
}
