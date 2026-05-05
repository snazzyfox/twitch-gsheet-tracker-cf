export interface DataRow {
  action: string; // Sub, Resub, Gift, Cheer, etc
  level?: number; // sub tier, hype train level
  amount?: number;
  user?: string;
  message?: string;
}
