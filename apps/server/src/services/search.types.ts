export type SearchHit = {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  score: number;
  // Field text with matches wrapped in HL_START/HL_END markers.
  highlight: { name?: string; description?: string };
};
