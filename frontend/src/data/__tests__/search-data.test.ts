import { describe, it, expect } from 'vitest';
import { searchF1, webSearch } from '../search-data';

describe('F1 Fuzzy Search (searchF1)', () => {
  it('should return empty array for empty query', () => {
    expect(searchF1('')).toEqual([]);
    expect(searchF1('   ')).toEqual([]);
  });

  it('should find exact matches for drivers', () => {
    const results = searchF1('Max Verstappen');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Max Verstappen');
  });

  it('should find exact matches for teams', () => {
    const results = searchF1('McLaren');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('McLaren');
  });

  it('should handle fuzzy matches (typos) correctly', () => {
    // Deliberate typo: 'verstapen' instead of 'verstappen'
    const results1 = searchF1('verstapen');
    expect(results1.length).toBeGreaterThan(0);
    expect(results1[0].name).toBe('Max Verstappen');

    // Deliberate typo: 'ferari' instead of 'ferrari'
    const results2 = searchF1('ferari');
    expect(results2.length).toBeGreaterThan(0);
    expect(results2.some(r => r.name === 'Charles Leclerc' || r.name === 'Ferrari')).toBe(true);
  });

  it('should translate and find Thai queries', () => {
    // 'แม็กซ์' -> 'max'
    const results = searchF1('แม็กซ์');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Max Verstappen');
  });

  it('should limit results to 6 items', () => {
    // 'a' will match many items
    const results = searchF1('a');
    expect(results.length).toBeLessThanOrEqual(6);
  });
});

describe('Web Search Real-time Mock (webSearch)', () => {
  it('should format interview titles correctly without appending multiple years', () => {
    const { results } = webSearch('Max Verstappen 2023');
    const interview = results.find(r => r.tags?.includes('Interview'));
    expect(interview).toBeDefined();
    // It should extract name "Max Verstappen" and year "2023"
    expect(interview?.title).toBe('Max Verstappen | Exclusive Interview 2023');
    expect(interview?.url).toContain('2023');
  });

  it('should default to 2026 if no year provided', () => {
    const { results } = webSearch('Lando Norris');
    const interview = results.find(r => r.tags?.includes('Interview'));
    expect(interview?.title).toBe('Lando Norris | Exclusive Interview 2026');
  });
});
