import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
});

async function setRange(locator: import('@playwright/test').Locator, value: number) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('adds, updates and automatically removes a winner', async ({ page }) => {
  await expect(page.getByText('La carrera está lista')).toBeVisible();
  await expect(page.getByLabel('Cantidad de abejas')).toHaveAttribute('max', '5');
  await expect(page.getByText('Selecciona un emoji')).toBeVisible();
  await expect(page.locator('.emoji-choice-number, .identity-number')).toHaveCount(0);
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByRole('button', { name: /^Fuego/ }).click();
  await setRange(page.getByLabel('Cantidad de abejas'), 3);
  await setRange(page.getByLabel('Inteligencia'), 2);
  await page.getByRole('button', { name: 'Añadir participante' }).click();

  await expect(page.locator('.roster-name', { hasText: 'Ana' })).toBeVisible();
  await expect(page.locator('.participant-edit', { hasText: 'Ana' })).toContainText('3 abejas');
  await expect(page.locator('canvas')).toBeVisible();

  await page.locator('.participant-edit', { hasText: 'Ana' }).click();
  await setRange(page.getByLabel('Cantidad de abejas'), 5);
  await setRange(page.getByLabel('Inteligencia'), 5);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('.participant-edit', { hasText: 'Ana' })).toContainText('5 abejas · inteligencia 5');

  await page.getByLabel('Nombre').fill('Luis');
  await page.getByRole('button', { name: /^Arcoíris/ }).click();
  await setRange(page.getByLabel('Cantidad de abejas'), 2);
  await setRange(page.getByLabel('Inteligencia'), 4);
  await page.getByRole('button', { name: 'Añadir participante' }).click();
  await expect(page.locator('.participant-edit', { hasText: 'Luis' })).toContainText('2 abejas · inteligencia 4');

  const participantId = await page.evaluate(() => {
    const stored = localStorage.getItem('beer-game:participants:v1');
    return (JSON.parse(stored ?? '[]') as Array<{ id: string; name: string }>).find(
      (participant) => participant.name === 'Ana',
    )?.id;
  });
  await page.evaluate((id) => {
    window.dispatchEvent(
      new CustomEvent('bee-game:force-winner', { detail: { participantId: id } }),
    );
  }, participantId);

  await expect(page.getByRole('dialog')).toContainText('Victoria de Ana');
  await expect(page.locator('.roster-name', { hasText: 'Ana' })).toHaveCount(0);
  await expect(page.locator('.roster-name', { hasText: 'Luis' })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('.participant-edit', { hasText: 'Luis' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('keeps all controls usable on a mobile-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Jardín de competencia' })).toBeVisible();
  await page.getByRole('heading', { name: 'Participantes' }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Nombre')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir participante' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
