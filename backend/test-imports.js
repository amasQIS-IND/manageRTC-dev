console.log('[TEST] Starting import test...');

try {
  console.log('[TEST] Importing env.js...');
  await import('./config/env.js');
  console.log('[TEST] env.js OK');

  console.log('[TEST] Importing express...');
  const express = await import('express');
  console.log('[TEST] express OK');

  console.log('[TEST] Importing http...');
  await import('http');
  console.log('[TEST] http OK');

  console.log('[TEST] Importing socket handler...');
  await import('./socket/index.js');
  console.log('[TEST] socket handler OK');

  console.log('[TEST] Importing promotion scheduler...');
  await import('./jobs/promotionScheduler.js');
  console.log('[TEST] promotion scheduler OK');

  console.log('[TEST] Importing logger...');
  await import('./utils/logger.js');
  console.log('[TEST] logger OK');

  console.log('[TEST] Importing swagger...');
  await import('./swagger.js');
  console.log('[TEST] swagger OK');

  console.log('[TEST] All imports successful!');
} catch (error) {
  console.error('[TEST] Import failed:', error.message, error.stack);
  process.exit(1);
}
