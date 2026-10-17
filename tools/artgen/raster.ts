/**
 * Rasterise SVG files to PNG with Playwright's Chromium (already installed for the e2e suite;
 * no new dependency). Used for the app icons and for review sheets. Not used at runtime.
 */
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

export interface RasterJob {
  svg: string;
  png: string;
  /** CSS size of the SVG. */
  w: number;
  h: number;
  /** Device pixels per CSS px. */
  scale: number;
}

export async function rasterise(jobs: readonly RasterJob[]): Promise<void> {
  const browser = await chromium.launch();
  try {
    for (const j of jobs) {
      const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale });
      const page = await ctx.newPage();
      const url = pathToFileURL(j.svg).href;
      await page.goto(url);
      await page.screenshot({ path: j.png, clip: { x: 0, y: 0, width: j.w, height: j.h }, omitBackground: true });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

/** Screenshot a local HTML file (full page) at a device scale. */
export async function rasteriseHtml(html: string, png: string, width: number, scale: number): Promise<void> {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width, height: 400 }, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
    await page.screenshot({ path: png, fullPage: true });
    await ctx.close();
  } finally {
    await browser.close();
  }
}
