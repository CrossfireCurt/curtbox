// Curated game-show content. The old generic demographic seed is retired.
// Source records and editorial standards: docs/SURVEY_SOURCES.md.
import {cultureSeedQuestions} from './cultureSeed.js';
import {expandedCultureSeedQuestions} from './expandedCultureSeed.js';

// Preserve published IDs, source versions and admin edits on upgrade.
export const seedQuestions = [...cultureSeedQuestions, ...expandedCultureSeedQuestions];
