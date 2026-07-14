import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'Assetra — Manajemen Aset',short_name:'Assetra',description:'Kelola, audit, dan rawat aset perusahaan.',start_url:'/',display:'standalone',background_color:'#f5f7f4',theme_color:'#12352f',icons:[{src:'/icon',sizes:'512x512',type:'image/png'}]}}
