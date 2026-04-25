import { describe, it, expect } from 'vitest';
import { translateThaiQuery, getThaiSuggestions } from '../thai-mappings';

describe('Thai Fuzzy Search Mappings', () => {
  describe('translateThaiQuery', () => {
    it('translates exact matches successfully', () => {
      expect(translateThaiQuery('แวร์สแตปเพน')).toBe('verstappen');
      expect(translateThaiQuery('แมคลาเรน')).toBe('mclaren');
      expect(translateThaiQuery('ซิลเวอร์สโตน')).toBe('silverstone');
    });

    it('translates partial exact matches (mixed with English/numbers)', () => {
      expect(translateThaiQuery('แฮมิลตัน 2024')).toBe('hamilton 2024');
      expect(translateThaiQuery('เฟอร์รารี f1')).toBe('ferrari f1');
    });

    it('fixes Thai spelling typos using fuzzy matching', () => {
      // Typo: แฮมมินตัน -> แฮมิลตัน
      expect(translateThaiQuery('แฮมมินตัน')).toBe('hamilton');
      
      // Typo: เฟอรารี -> เฟอร์รารี
      expect(translateThaiQuery('เฟอรารี')).toBe('ferrari');
      
      // Typo: แมกซ -> แม็กซ์
      expect(translateThaiQuery('แมกซ')).toBe('max');
      
      // Typo combined with numbers
      expect(translateThaiQuery('เฟรารี 2025')).toBe('ferrari 2025');
    });

    it('replaces generic Thai terms', () => {
      expect(translateThaiQuery('ผลการแข่ง แมกซ')).toBe('results max');
    });

    it('returns original string if no Thai characters', () => {
      expect(translateThaiQuery('charles leclerc')).toBe('charles leclerc');
    });
  });

  describe('getThaiSuggestions', () => {
    it('returns suggestions for exact partial parts', () => {
      const suggestions = getThaiSuggestions('แวร์');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.english === 'verstappen')).toBe(true);
    });

    it('returns typo-tolerant suggestions', () => {
      const suggestions = getThaiSuggestions('เฟอราร');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.english === 'ferrari')).toBe(true);
    });

    it('limits suggestions deduplicated and to 8 max', () => {
      const suggestions = getThaiSuggestions('อ'); // will match many Thai characters
      expect(suggestions.length).toBeLessThanOrEqual(8);
    });
  });
});
