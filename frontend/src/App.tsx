import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home.tsx";

import SearchResults from "./pages/SearchResults.tsx";
import RaceResults from "./pages/RaceResults.tsx";
import Drivers from "./pages/Drivers.tsx";
import DriverProfile from "./pages/DriverProfile.tsx";
import Teams from "./pages/Teams.tsx";
import Calendar from "./pages/Calendar.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/search" element={<SearchResults />} />
          <Route path="/results" element={<RaceResults />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/driver/:driverId" element={<DriverProfile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/calendar" element={<Calendar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
