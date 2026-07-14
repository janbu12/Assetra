'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, Boxes, ClipboardCheck, FileBarChart, LayoutDashboard, MapPinned, Menu, Search, Settings, ShieldCheck, Wrench, ArrowLeftRight, ScanLine } from 'lucide-react';

const nav = [
  ['Ringkasan', '/', LayoutDashboard], ['Daftar Aset', '/aset', Boxes], ['Peminjaman', '/peminjaman', ArrowLeftRight], ['Maintenance', '/maintenance', Wrench], ['Audit & Scan', '/audit', ClipboardCheck], ['Laporan', '/laporan', FileBarChart], ['Master Data', '/master', MapPinned], ['Pengguna & Role', '/pengguna', ShieldCheck], ['Pengaturan', '/pengaturan', Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><div className="brand-mark">A</div><span>assetra</span></Link><div className="nav-label">Ruang kerja</div>
      <nav>{nav.slice(0,6).map(([label,href,Icon])=><Link key={href} href={href} className={`nav-item ${path===href?'active':''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div className="nav-label">Administrasi</div><nav>{nav.slice(6).map(([label,href,Icon])=><Link key={href} href={href} className={`nav-item ${path===href?'active':''}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-user"><div className="avatar">SA</div><div><strong style={{fontSize:11}}>Super Admin</strong><div style={{fontSize:9,color:'#9eb3ac',marginTop:3}}>admin@assetra.id</div></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="search"><Search size={15}/><input aria-label="Cari" placeholder="Cari aset, kode, atau serial..." /></div><div className="top-actions"><div className="online-pill">Online</div><Link href="/scan" className="icon-button" aria-label="Pindai QR"><ScanLine size={17}/></Link><button className="icon-button" aria-label="Notifikasi"><Bell size={17}/></button><button className="icon-button" aria-label="Menu"><Menu size={17}/></button></div></header>{children}</main>
    <nav className="mobile-nav">{nav.slice(0,5).map(([label,href,Icon])=><Link key={href} href={href} className={`mobile-link ${path===href?'active':''}`}><Icon size={19}/><span>{label.split(' ')[0]}</span></Link>)}</nav>
  </div>;
}
