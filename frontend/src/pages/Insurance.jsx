import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './insurance/insurance.css';
import Shell from './insurance/Shell';
import Overview from './insurance/screens/Overview';
import ClaimValidation from './insurance/screens/ClaimValidation';
import HospitalBenchmarks from './insurance/screens/HospitalBenchmarks';
import ProcedurePricing from './insurance/screens/ProcedurePricing';
import Evaluation from './insurance/screens/Evaluation';
import Integration from './insurance/screens/Integration';

export default function Insurance() {
  const [route, setRoute] = useState('overview');
  const [focusClaim, setFocusClaim] = useState(null);

  useEffect(() => {
    const main = document.getElementById('main-scroll');
    if (main) main.scrollTo({ top: 0 });
  }, [route, focusClaim]);

  const openClaim = (id) => { setFocusClaim(id); setRoute('validation'); };

  const page = {
    overview: <Overview onOpenClaim={openClaim} setRoute={setRoute} />,
    validation: <ClaimValidation initialClaimId={focusClaim} />,
    hospitals: <HospitalBenchmarks onOpenClaim={openClaim} />,
    pricing: <ProcedurePricing />,
    evaluation: <Evaluation />,
    integration: <Integration />,
  }[route] || <Overview onOpenClaim={openClaim} setRoute={setRoute} />;

  return (
    <motion.div className="nuvo-insurance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}>
      <Shell route={route} setRoute={(r) => { setRoute(r); if (r !== 'validation') setFocusClaim(null); }}>
        <div data-screen-label={route}>{page}</div>
      </Shell>
    </motion.div>
  );
}
