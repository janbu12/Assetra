import { openDB } from 'idb';
export type OfflineScan = { operationId:string; sessionId:string; assetToken:string; scannedAt:string; condition?:string; location?:string; note?:string; syncState:'pending'|'conflict' };
const database = () => openDB('assetra-offline', 1, { upgrade(db) { const store = db.createObjectStore('audit-scans', { keyPath: 'operationId' }); store.createIndex('sessionId', 'sessionId'); } });
export async function queueScan(scan: Omit<OfflineScan,'syncState'>) { return (await database()).put('audit-scans', { ...scan, syncState:'pending' }); }
export async function pendingScans(sessionId:string) { return (await database()).getAllFromIndex('audit-scans','sessionId',sessionId) as Promise<OfflineScan[]>; }
export async function removeScan(operationId:string) { return (await database()).delete('audit-scans',operationId); }
export async function markConflict(scan:OfflineScan) { return (await database()).put('audit-scans',{...scan,syncState:'conflict'}); }
