import React from "react";
import SiteHeader from "@/components/SiteHeader";
import { LiveTimingPanel } from "@/components/LiveTimingPanel";

const Live = () => {
  return (
    <div className="dark min-h-screen bg-racing-vignette">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Live Timing & Data</h1>
          <p className="text-muted-foreground mt-2">ติดตามอันดับและสถานะเซสชันล่าสุดจาก OpenF1</p>
        </div>
        
        <LiveTimingPanel />
      </main>
    </div>
  );
};

export default Live;
