import React, { useState, useEffect } from 'react';
import './insurance/insurance.css';
import Shell from './insurance/Shell';
import Overview from './insurance/screens/Overview';
import ClaimValidation from './insurance/screens/ClaimValidation';
import HospitalBenchmarks from './insurance/screens/HospitalBenchmarks';
import ProcedurePricing from './insurance/screens/ProcedurePricing';
import AnomalyDetection from './insurance/screens/AnomalyDetection';
import QuarterlyReports from './insurance/screens/QuarterlyReports';
import Settings from './insurance/screens/Settings';

export default function Insurance() {
  const [route, setRoute] = useState('overview');

  useEffect(() => {
    const main = document.getElementById('main-scroll');
    if (main) main.scrollTo({ top: 0 });
  }, [route]);

  const Page = () => {
    switch (route) {
      case 'overview': return <Overview />;
      case 'validation': return <ClaimValidation />;
      case 'hospitals': return <HospitalBenchmarks />;
      case 'pricing': return <ProcedurePricing />;
      case 'anomaly': return <AnomalyDetection />;
      case 'reports': return <QuarterlyReports />;
      case 'settings': return <Settings />;
      default: return <Overview />;
    }
  };

  return (
    <div className="nuvo-insurance">
      <Shell route={route} setRoute={setRoute}>
        <div data-screen-label={route}><Page /></div>
      </Shell>
    </div>
  );
}
