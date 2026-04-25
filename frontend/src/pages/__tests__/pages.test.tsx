import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';

// Import all pages
import Home from '../Home';
import Calendar from '../Calendar';
import Drivers from '../Drivers';
import Teams from '../Teams';
import DriverProfile from '../DriverProfile';
import RaceResults from '../RaceResults';
import SearchResults from '../SearchResults';
import NotFound from '../NotFound';

const queryClient = new QueryClient();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Page Components Smoke Tests', () => {
  it('renders Home page without crashing', () => {
    const { container } = renderWithProviders(<Home />);
    expect(container).toBeTruthy();
  });

  it('renders Calendar page without crashing', () => {
    const { container } = renderWithProviders(<Calendar />);
    expect(container).toBeTruthy();
  });

  it('renders Drivers page without crashing', () => {
    const { container } = renderWithProviders(<Drivers />);
    expect(container).toBeTruthy();
  });

  it('renders Teams page without crashing', () => {
    const { container } = renderWithProviders(<Teams />);
    expect(container).toBeTruthy();
  });

  it('renders DriverProfile page without crashing', () => {
    const { container } = renderWithProviders(<DriverProfile />);
    expect(container).toBeTruthy();
  });

  it('renders RaceResults page without crashing', () => {
    const { container } = renderWithProviders(<RaceResults />);
    expect(container).toBeTruthy();
  });

  it('renders SearchResults page without crashing', () => {
    const { container } = renderWithProviders(<SearchResults />);
    expect(container).toBeTruthy();
  });

  it('renders NotFound page without crashing', () => {
    const { container } = renderWithProviders(<NotFound />);
    expect(container).toBeTruthy();
  });
});
