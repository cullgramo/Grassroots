import type { Sport } from '@/types/fixture';

export const SPORTS: Sport[] = ['Hurling', 'Gaelic Football', 'Camogie', 'Ladies Football'];

export const SPORT_COLORS: Record<Sport, string> = {
  Hurling: '#ea580c',
  'Gaelic Football': '#16a34a',
  Camogie: '#9333ea',
  'Ladies Football': '#db2777',
};

export const SPORT_SHORT: Record<Sport, string> = {
  Hurling: 'Hurling',
  'Gaelic Football': 'Football',
  Camogie: 'Camogie',
  'Ladies Football': 'Ladies Football',
};
