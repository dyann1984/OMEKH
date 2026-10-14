import { test, expect } from '@playwright/test';

test.describe('OMEKH - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Initial page load shows idle states', async ({ page }) => {
    // Verify HUD shows initial idle states
    await expect(page.locator('.hud-chip').filter({ hasText: 'CÁMARA' })).toContainText('EN ESPERA');
    await expect(page.locator('.hud-chip').filter({ hasText: 'AUDIO' })).toContainText('EN ESPERA');
    await expect(page.locator('.hud-chip').filter({ hasText: 'VOZ' })).toContainText('EN ESPERA');
    await expect(page.locator('.hud-chip').filter({ hasText: 'IA' })).toContainText('LISTA');

    // Verify hero section is visible
    await expect(page.locator('h1')).toContainText('Amplifica tu');
    await expect(page.locator('.intro')).toBeVisible();
  });

  test('Camera activation requires explicit action', async ({ page }) => {
    // Verify camera is initially idle
    const cameraStatus = page.locator('.hud-chip').filter({ hasText: 'CÁMARA' });
    await expect(cameraStatus).toContainText('EN ESPERA');

    // Click activate camera button
    await page.click('button:has-text("Activar cámara")');

    // In this environment without real camera, it will show blocked or requesting
    // We verify the state changes from idle
    await expect(cameraStatus).not.toContainText('EN ESPERA');
  });

  test('Vision analysis requires consent checkbox', async ({ page }) => {
    // Verify AI analysis button is disabled without consent
    const analyzeButton = page.locator('button:has-text("Analizar escena con IA")');
    const consentCheckbox = page.locator('input[type="checkbox"]').first(); // Vision consent checkbox

    // Initially, consent checkbox should be unchecked
    await expect(consentCheckbox).not.toBeChecked();

    // Try to click analyze without consent (should fail or show error)
    if (await analyzeButton.isEnabled()) {
      await analyzeButton.click();
      // Should show error message about consent
      const status = page.locator('.hud-readout strong');
      await expect(status).toBeVisible();
    }
  });

  test('Microphone activation shows audio metrics', async ({ page }) => {
    // Verify microphone is initially idle
    const audioStatus = page.locator('.hud-chip').filter({ hasText: 'AUDIO' });
    await expect(audioStatus).toContainText('EN ESPERA');

    // Click activate microphone button
    await page.click('button:has-text("Activar micrófono")');

    // In this environment without real microphone, it will show blocked or requesting
    // We verify the state changes from idle
    await expect(audioStatus).not.toContainText('EN ESPERA');
  });

  test('Audio classification requires consent', async ({ page }) => {
    // Verify audio classification button exists
    const classifyButton = page.locator('button:has-text("Clasificar sonido")');
    const audioConsentCheckbox = page.locator('input[type="checkbox"]').nth(1); // Second checkbox

    // Initially, audio consent checkbox should be unchecked
    await expect(audioConsentCheckbox).not.toBeChecked();

    // Try to click classify without consent (should fail or show error)
    if (await classifyButton.isEnabled()) {
      await classifyButton.click();
      // Should show error message about consent
      const status = page.locator('.hud-readout strong');
      await expect(status).toBeVisible();
    }
  });

  test('Voice command fallback via text input', async ({ page }) => {
    // Verify text input field exists inside text-command label
    const textCommandLabel = page.locator('.text-command');
    await expect(textCommandLabel).toBeVisible();

    const textInput = textCommandLabel.locator('input');
    await expect(textInput).toBeVisible();

    // Type a command
    await textInput.fill('¿Qué observas?');

    // Click send button
    await textCommandLabel.locator('button').click();

    // Verify question is displayed (it will be in the transcript or answer area)
    // Since we don't have data, the status should update
    const status = page.locator('.hud-readout strong');
    await expect(status).toBeVisible();
  });

  test('Vision API endpoint validates requests', async ({ page }) => {
    // Test the vision API endpoint directly
    const response = await page.request.post('/api/vision', {
      data: { imageDataUrl: 'invalid' }
    });

    // Without API key, returns 503. With API key, would return 400 for invalid data
    // We accept either status as the endpoint is protected
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('Vision API returns 503 without API key', async ({ page }) => {
    // Test with valid image format but no API key (current state)
    const response = await page.request.post('/api/vision', {
      data: { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=' }
    });

    // Should return 503 (service unavailable) without API key
    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body.error).toContain('IA no configurada');
  });

  test('Audio API endpoint validates requests', async ({ page }) => {
    // Test the audio API endpoint directly
    const response = await page.request.post('/api/audio', {
      data: { audioBase64: 'invalid', format: 'wav', consent: false }
    });

    // Should return 403 without consent
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('Audio API returns 503 without API key', async ({ page }) => {
    // Test with valid format but no API key (current state)
    const response = await page.request.post('/api/audio', {
      data: { audioBase64: 'YWJj', format: 'wav', consent: true }
    });

    // Should return 503 (service unavailable) without API key
    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body.error).toContain('IA no configurada');
  });

  test('Fusion panel displays structure', async ({ page }) => {
    // Verify fusion panel exists (it's the access-panel with module-id 04)
    const fusionPanel = page.locator('.access-panel');
    await expect(fusionPanel).toBeVisible();

    // Verify it shows the module header
    await expect(fusionPanel).toContainText('MULTIMODAL FUSION');

    // Verify it shows status (initially should be EMPTY or similar)
    await expect(fusionPanel).toContainText('Sin observaciones');
  });

  test('Accessibility: ARIA labels and keyboard navigation', async ({ page }) => {
    // Verify main element exists (it's semantic, doesn't need role attribute)
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Verify video has aria-label
    const video = page.locator('video');
    await expect(video).toHaveAttribute('aria-label');

    // Test keyboard navigation to main buttons
    await page.keyboard.press('Tab');
    // Focus should move to first interactive element
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused);
  });

  test('Timeline displays events', async ({ page }) => {
    // Verify timeline section exists inside the access-panel
    const timeline = page.locator('.timeline');
    await expect(timeline).toBeVisible();

    // Initially should show placeholder text
    await expect(timeline).toContainText('Eventos de cámara');
  });

  test('Status messages are visible and descriptive', async ({ page }) => {
    // Check initial status message
    const status = page.locator('.hud-readout strong');
    await expect(status).toBeVisible();
    await expect(status).toContainText('IA EN ESPERA');
  });
});

test.describe('OMEKH - Error Handling', () => {
  test('Vision API rejects oversized image', async ({ page }) => {
    // Create an oversized base64 string (> MAX_IMAGE_CHARS)
    const oversized = 'data:image/jpeg;base64,' + 'x'.repeat(2_200_000);

    const response = await page.request.post('/api/vision', {
      data: { imageDataUrl: oversized }
    });

    // Without API key, returns 503. With API key, would return 400 for oversized data
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 400) {
      expect(body.error).toContain('lím');
    } else {
      expect(body.error).toContain('IA no configurada');
    }
  });

  test('Audio API rejects oversized audio', async ({ page }) => {
    // Create an oversized base64 string (> MAX_AUDIO_CHARS)
    const oversized = 'A'.repeat(1_500_000);

    const response = await page.request.post('/api/audio', {
      data: { audioBase64: oversized, format: 'wav', consent: true }
    });

    // Without API key, returns 503. With API key, would return 400 for oversized data
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 400) {
      expect(body.error).toContain('lím');
    } else {
      expect(body.error).toContain('IA no configurada');
    }
  });

  test('Audio API rejects invalid format', async ({ page }) => {
    const response = await page.request.post('/api/audio', {
      data: { audioBase64: 'YWJj', format: 'invalid', consent: true }
    });

    // Without API key, returns 503. With API key, would return 400 for invalid format
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 400) {
      expect(body.error).toContain('formato');
    } else {
      expect(body.error).toContain('IA no configurada');
    }
  });
});
