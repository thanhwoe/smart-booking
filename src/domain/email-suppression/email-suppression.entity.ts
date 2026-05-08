export type SuppressionReason =
  | 'HARD_BOUNCE'
  | 'SOFT_BOUNCE'
  | 'COMPLAINT'
  | 'MANUAL';
export const SuppressionReason = {
  HARD_BOUNCE: 'HARD_BOUNCE',
  SOFT_BOUNCE: 'SOFT_BOUNCE',
  COMPLAINT: 'COMPLAINT',
  MANUAL: 'MANUAL',
} as const;

export type EmailSuppression = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  reason: SuppressionReason;
  source: string;
  notes: string | null;
};
