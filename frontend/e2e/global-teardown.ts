import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global teardown: Cleanup complete');
  // Add any necessary cleanup here
  // For now, just log completion
}

export default globalTeardown;

