'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bell, Boxes, ClipboardCheck, FileBarChart, LayoutDashboard, LogOut, MapPinned, Menu, Search, Settings, ShieldCheck, Wrench, ArrowLeftRight, ScanLine, X } from 'lucide-react';
import { api } from '@/lib/api';

type Profile = { id: string; name: string; email: string; role: string; permissions: string[] };
type Notification = { id: string; title: string; message: string; createdAt: string; readAt?: string | null };
type NavItem = readonly [string, string, typeof LayoutDashboard, string];

const nav: NavItem[] = [
  ['Ringkasan', '/', LayoutDashboard, 'dashboard.read'],
  ['Daftar Aset', '/aset', Boxes, 'assets.read'],
  ['Peminjaman', '/peminjaman', ArrowLeftRight, 'loans.manage'],
  ['Maintenance', '/maintenance', Wrench, 'maintenance.manage'],
  ['Audit & Scan', '/audit', ClipboardCheck, 'audits.manage'],
  ['Laporan', '/laporan', FileBarChart, 'reports.read'],
  ['Master Data', '/master', MapPinned, 'masters.manage'],
  ['Pengguna & Role', '/pengguna', ShieldCheck, 'users.manage'],
  ['Pengaturan', '/pengaturan', Settings, 'settings.manage'],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [online, setOnline] = useState(true);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<'notifications' | 'menu' | null>(null);

  useEffect(() => {
    api<Profile>('/auth/me').then(setProfile).catch(() => undefined);
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const visibleNav = useMemo(() => profile ? nav.filter((item) => profile.permissions.includes(item[3])) : nav.slice(0, 6), [profile]);
  const workspace = visibleNav.filter((item) => nav.indexOf(item) < 6);
  const administration = visibleNav.filter((item) => nav.indexOf(item) >= 6);
  const unread = notifications.filter((item) => !item.readAt).length;

  async function openNotifications() {
    setPanel(panel === 'notifications' ? null : 'notifications');
    if (panel !== 'notifications') setNotifications(await api<Notification[]>('/notifications').catch(() => []));
  }

  async function markRead(item: Notification) {
    if (!item.readAt) {
      await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
      setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
    }
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/login');
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/aset?q=${encodeURIComponent(value)}`);
  }

  const initials = profile?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'A';
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><div className="brand-mark">A</div><span>assetra</span></Link>
      <div className="nav-label">Ruang kerja</div>
      <nav>{workspace.map(([label, href, Icon]) => <Link key={href} href={href} className={`nav-item ${path === href ? 'active' : ''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      {!!administration.length && <><div className="nav-label">Administrasi</div><nav>{administration.map(([label, href, Icon]) => <Link key={href} href={href} className={`nav-item ${path === href ? 'active' : ''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav></>}
      <button className="sidebar-user" onClick={() => setPanel(panel === 'menu' ? null : 'menu')} style={{ border: 0, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
        <div className="avatar">{initials}</div><div><strong style={{fontSize:11}}>{profile?.name || 'Memuat...'}</strong><div style={{fontSize:9,color:'#9eb3ac',marginTop:3}}>{profile?.role || ''}</div></div>
      </button>
    </aside>
    <main className="main">
      <header className="topbar">
        <form className="search" onSubmit={search}><Search size={15}/><input aria-label="Cari" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari aset, kode, atau serial..." /></form>
        <div className="top-actions">
          <div className="online-pill" style={!online ? { background: '#fce8e6', color: '#a33b32' } : undefined}>{online ? 'Online' : 'Offline'}</div>
          <Link href="/scan" className="icon-button" aria-label="Pindai QR"><ScanLine size={17}/></Link>
          <button className="icon-button" aria-label="Notifikasi" onClick={openNotifications} style={{ position: 'relative' }}><Bell size={17}/>{unread > 0 && <span style={{ position:'absolute', top:2, right:2, width:7, height:7, borderRadius:9, background:'#c55249' }}/>}</button>
          <button className="icon-button" aria-label="Menu" onClick={() => setPanel(panel === 'menu' ? null : 'menu')}><Menu size={17}/></button>
        </div>
      </header>
      {panel && <div className="card" style={{ position:'fixed', zIndex:40, top:62, right:18, width:320, maxHeight:440, overflow:'auto', boxShadow:'0 18px 50px rgba(18,53,47,.18)' }}>
        <button className="icon-button" onClick={() => setPanel(null)} style={{ position:'absolute', right:12, top:12 }}><X size={15}/></button>
        {panel === 'notifications' ? <><div className="card-title">Notifikasi</div>{notifications.length ? notifications.map((item) => <button key={item.id} onClick={() => markRead(item)} style={{ display:'block', width:'100%', textAlign:'left', border:0, borderTop:'1px solid #edf0ef', background:item.readAt?'transparent':'#f7faef', padding:'12px 0', cursor:'pointer' }}><strong style={{fontSize:11}}>{item.title}</strong><div className="subtitle" style={{marginTop:4}}>{item.message}</div></button>) : <p className="subtitle">Belum ada notifikasi.</p>}</> : <><div className="card-title">Akun</div><strong>{profile?.name}</strong><p className="subtitle">{profile?.email}<br/>{profile?.role}</p><button className="button secondary" onClick={logout} style={{marginTop:16}}><LogOut size={14}/>Keluar</button></>}
      </div>}
      {children}
    </main>
    <nav className="mobile-nav">{workspace.slice(0,5).map(([label,href,Icon]) => <Link key={href} href={href} className={`mobile-link ${path === href ? 'active' : ''}`}><Icon size={19}/><span>{label.split(' ')[0]}</span></Link>)}</nav>
  </div>;
}
