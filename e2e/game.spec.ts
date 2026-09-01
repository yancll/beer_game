import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

async function unlockGame(page: import('@playwright/test').Page) {
  await page.getByLabel('Código de acceso').fill('1992');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

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
  await unlockGame(page);
  await expect(page.getByText('La carrera está lista')).toBeVisible();
  await expect(page.getByLabel('Cantidad de abejas')).toHaveAttribute('max', '5');
  await expect(page.getByText('Selecciona un emoji')).toBeVisible();
  await expect(page.getByLabel('0 participantes activos')).toContainText('0/15');
  await expect(page.getByRole('button', { name: 'Corona' })).toBeVisible();
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
  await unlockGame(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Jardín de competencia' })).toBeVisible();
  await page.getByRole('heading', { name: 'Participantes' }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Nombre')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir participante' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('blocks the game until the correct access code is entered', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Acceso al juego' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jardín de competencia' })).toHaveCount(0);

  await page.getByLabel('Código de acceso').fill('1111');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Código incorrecto');

  await unlockGame(page);
  await expect(page.getByRole('heading', { name: 'Jardín de competencia' })).toBeVisible();
});

test('aligns the competition panel with the garden on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await unlockGame(page);
  await expect(page.locator('.identity-row')).toHaveCount(15);

  const heights = await page.evaluate(() => ({
    competition: document.querySelector('.identity-panel')?.getBoundingClientRect().height ?? 0,
    garden: document.querySelector('.arena-panel')?.getBoundingClientRect().height ?? 0,
  }));
  expect(Math.abs(heights.competition - heights.garden)).toBeLessThanOrEqual(1);
});

test('maximizes the garden without leaving a laptop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await unlockGame(page);

  const layout = await page.evaluate(() => {
    const arena = document.querySelector('.arena-panel')?.getBoundingClientRect();
    const frame = document.querySelector('.game-frame')?.getBoundingClientRect();
    const title = document.querySelector('.arena-heading h2')?.getBoundingClientRect();
    const description = document.querySelector('.arena-heading p')?.getBoundingClientRect();
    return {
      arenaBottom: arena?.bottom ?? Number.POSITIVE_INFINITY,
      frameWidth: frame?.width ?? 0,
      titleCenter: title ? title.top + title.height / 2 : 0,
      descriptionCenter: description ? description.top + description.height / 2 : 100,
    };
  });

  expect(layout.arenaBottom).toBeLessThanOrEqual(768);
  expect(layout.frameWidth).toBeGreaterThan(1000);
  expect(Math.abs(layout.titleCenter - layout.descriptionCenter)).toBeLessThanOrEqual(2);
});
