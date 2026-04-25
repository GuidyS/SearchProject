import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseYearFromQuery,
  searchDrivers,
  searchConstructors,
  searchCircuits,
  getDriverStandings,
  getLatestRaceResult,
  getDriverResults
} from '../f1-api';

// Create a mock for global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('f1-api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseYearFromQuery', () => {
    it('should extract correct year and query from input string', () => {
      const { query, year } = parseYearFromQuery('Verstappen 2023');
      expect(query).toBe('Verstappen');
      expect(year).toBe(2023);
    });

    it('should default to current year if no year provided', () => {
      const currentYear = new Date().getFullYear();
      const { query, year } = parseYearFromQuery('Ferrari');
      expect(query).toBe('Ferrari');
      expect(year).toBe(currentYear);
    });

    it('should handle Thai translations', () => {
      // "เฟอรารี" -> "Ferrari"
      const { query, year } = parseYearFromQuery('เฟอรารี 2024');
      expect(query.toLowerCase()).toBe('ferrari');
      expect(year).toBe(2024);
    });
  });

  describe('searchDrivers', () => {
    const mockDriversData = {
      MRData: {
        DriverTable: {
          Drivers: [
            { driverId: 'max_verstappen', givenName: 'Max', familyName: 'Verstappen', nationality: 'Dutch' },
            { driverId: 'leclerc', givenName: 'Charles', familyName: 'Leclerc', nationality: 'Monegasque' },
            { driverId: 'hamilton', givenName: 'Lewis', familyName: 'Hamilton', nationality: 'British' }
          ]
        }
      }
    };

    it('should fetch and fuzzy search drivers successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDriversData
      });

      const results = await searchDrivers('max', 2024);
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/2024/drivers.json?limit=100');
      expect(results).toHaveLength(1);
      expect(results[0].driverId).toBe('max_verstappen');
    });

    it('should search full names including space', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDriversData
      });

      const results = await searchDrivers('charles leclerc', 2024);
      expect(results).toHaveLength(1);
      expect(results[0].driverId).toBe('leclerc');
    });

    it('should return all drivers if query is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDriversData
      });

      const results = await searchDrivers('', 2024);
      expect(results).toHaveLength(3);
    });

    it('should return empty array on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const results = await searchDrivers('alonso', 2024);
      expect(results).toEqual([]);
    });

    it('should return empty array on exception', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));
      const results = await searchDrivers('alonso', 2024);
      expect(results).toEqual([]);
    });
  });

  describe('searchConstructors', () => {
    const mockConstructorsData = {
      MRData: {
        ConstructorTable: {
          Constructors: [
            { constructorId: 'red_bull', name: 'Red Bull Racing', nationality: 'Austrian' },
            { constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian' }
          ]
        }
      }
    };

    it('should fetch and fuzzy search constructors successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConstructorsData
      });

      const results = await searchConstructors('red', 2024);
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/2024/constructors.json?limit=100');
      expect(results).toHaveLength(1);
      expect(results[0].constructorId).toBe('red_bull');
    });

    it('should return all constructors if query is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConstructorsData
      });

      const results = await searchConstructors(' ', 2024);
      expect(results).toHaveLength(2);
    });
  });

  describe('searchCircuits', () => {
    const mockCircuitsData = {
      MRData: {
        CircuitTable: {
          Circuits: [
            { circuitId: 'monza', circuitName: 'Autodromo Nazionale Monza', Location: { country: 'Italy', locality: 'Monza' } },
            { circuitId: 'silverstone', circuitName: 'Silverstone Circuit', Location: { country: 'UK', locality: 'Silverstone' } }
          ]
        }
      }
    };

    it('should fetch and fuzzy search circuits successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCircuitsData
      });

      const results = await searchCircuits('italy', 2024);
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/2024/circuits.json?limit=100');
      expect(results).toHaveLength(1);
      expect(results[0].circuitId).toBe('monza');
    });
  });

  describe('getDriverStandings', () => {
    const mockStandingsData = {
      MRData: {
        StandingsTable: {
          StandingsLists: [
            {
              DriverStandings: [
                { position: '1', points: '100', wins: '4', Driver: { driverId: 'max_verstappen' }, Constructors: [] }
              ]
            }
          ]
        }
      }
    };

    it('should fetch driver standings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStandingsData
      });

      const results = await getDriverStandings(2024);
      expect(results).toHaveLength(1);
      expect(results[0].position).toBe('1');
    });

    it('should return empty list if StandingsLists is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ MRData: { StandingsTable: { StandingsLists: [] } } })
      });

      const results = await getDriverStandings(2024);
      expect(results).toEqual([]);
    });
  });

  describe('getDriverResults', () => {
    const mockDriverResultsData = {
      MRData: {
        RaceTable: {
          Races: [
            { raceName: 'Bahrain Grand Prix', round: '1' }
          ]
        }
      }
    };

    it('should fetch driver specific results successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDriverResultsData
      });

      const results = await getDriverResults('max_verstappen', 2024);
      expect(mockFetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/2024/drivers/max_verstappen/results.json?limit=100');
      expect(results).toHaveLength(1);
    });
  });

  describe('getLatestRaceResult', () => {
    const mockLatestRaceData = {
      MRData: {
        RaceTable: {
          Races: [
            {
              round: '1',
              raceName: 'Bahrain Grand Prix',
              Circuit: { circuitName: 'Bahrain' },
              date: '2024-03-02',
              Results: []
            }
          ]
        }
      }
    };

    it('should fetch latest race result successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLatestRaceData
      });

      const result = await getLatestRaceResult(2024);
      expect(result?.raceName).toBe('Bahrain Grand Prix');
    });

    it('should return null if no races found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ MRData: { RaceTable: { Races: [] } } })
      });

      const result = await getLatestRaceResult(2024);
      expect(result).toBeNull();
    });
  });
});
