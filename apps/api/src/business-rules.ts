import { AssetCondition, AssetStatus, AuditResultStatus } from '@prisma/client';
export function statusAfterReturn(condition: AssetCondition): AssetStatus { return condition === 'GOOD' ? 'AVAILABLE' : 'MAINTENANCE'; }
export function classifyAudit(condition: AssetCondition | undefined, observedLocation: string | undefined, expectedLocation: string): AuditResultStatus {
  if (condition === 'DAMAGED' || condition === 'NEEDS_REPAIR') return 'DAMAGED';
  if (observedLocation && observedLocation !== expectedLocation) return 'LOCATION_MISMATCH';
  return 'FOUND';
}
