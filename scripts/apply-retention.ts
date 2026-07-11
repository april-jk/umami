import { applyRetentionSweep } from '@/jobs/apply-retention';

applyRetentionSweep()
  .then(({ updated }) => console.log(`Applied retention cutoff to ${updated} website(s).`))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
