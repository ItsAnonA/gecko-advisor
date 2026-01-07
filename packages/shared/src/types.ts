export type ScoreLabel =
  | 'Low Privacy Risk'
  | 'Moderate Privacy Risk'
  | 'High Privacy Risk'
  | 'Critical Privacy Risk'
  | 'Critical Security Risk';

export interface ScoreExplanation {
  evidenceId: string;
  points: number; // negative numbers for deductions
  reason: string;
}

export interface ScoreResult {
  score: number;
  label: ScoreLabel;
  explanations: ScoreExplanation[];
}
