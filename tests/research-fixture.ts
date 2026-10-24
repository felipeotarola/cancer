import type { ResearchTask } from '../shared/research.ts';
// Synthetic fixture. No private upstream repository content is bundled in the app or tests.
export const researchFixture: ResearchTask = {
  id: 'rtk_01K8A000000000000000000001', title: 'Kontrollera syntetiska forskningsdata',
  question: 'Stämmer summeringen med de tre syntetiska värdena?', programme: 'Test av reproducerbarhet',
  intended_user: 'Testgranskare', priority: 10, rationale: 'Kontrollera hela flödet med syntetiska data.',
  method: 'Summera 2, 3 och 5. Förväntat resultat är 10.', acceptance: ['Summan är 10.'],
  stop_conditions: ['Hämta inga externa data.'], inputs: [{ path: 'research/inputs/synthetic.json', sha256: 'a'.repeat(64) }],
  estimated_hours: 1, dependencies: [], data_mode: 'synthetic', source_slugs: [], blockers: [],
  evidence_level: 'E0', external_review: 'pending', events: [],
};
