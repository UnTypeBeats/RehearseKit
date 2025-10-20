import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Global setup: Checking backend services...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const maxRetries = 30;
  const retryDelay = 2000;

  // Wait for backend to be ready
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto(`${backendUrl}/api/health`, {
        timeout: 5000,
      });

      if (response && response.ok()) {
        const health = await response.json();
        
        if (health.status === 'healthy' && 
            health.database === 'healthy' && 
            health.redis === 'healthy') {
          console.log('✅ Backend services are healthy');
          await browser.close();
          return;
        } else {
          console.log(`⚠️  Backend services not fully healthy (attempt ${i + 1}/${maxRetries}):`, health);
        }
      }
    } catch (error) {
      console.log(`⏳ Waiting for backend services (attempt ${i + 1}/${maxRetries})...`);
    }

    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  await browser.close();
  throw new Error('Backend services did not become healthy in time');
}

export default globalSetup;

