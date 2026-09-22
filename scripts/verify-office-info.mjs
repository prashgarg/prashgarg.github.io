// Built-site interaction check: node scripts/verify-office-info.mjs [base URL]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:4328';
const shots = 'shots/office-atmosphere';
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const size of [{width:1800,height:900}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
    const mobile = size.width <= 900;
    const label = `${size.width}x${size.height}`;
    const context = await browser.newContext({viewport:size,hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    const scripts = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    try {
      await page.goto(base, { waitUntil:'load' });
      if (mobile) {
        await page.locator('.win95-desktop:not([inert])').waitFor();
        assert.equal(await page.locator('canvas').count(), 0, 'Mobile loaded WebGL before asking for the office');
        assert(!scripts.some(url => /\/Office\./.test(url)), 'Mobile eagerly downloaded room code');
        await page.getByRole('button', {name:'Start',exact:true}).click();
        await page.getByRole('menuitem', {name:'View office (3D)',exact:true}).click();
      } else {
        await page.locator('.office-monitor[data-ready="true"]').waitFor();
        await page.getByRole('button', {name:'ENTER',exact:true}).click();
      }
      await page.locator('#office[data-phase="idle"]').waitFor();
      await page.mouse.move(size.width / 2, size.height / 2);
      await page.waitForTimeout(2000);
      await page.screenshot({path:`${shots}/${label}-room.png`});
      const info = page.getByRole('button', {name:'About this room',exact:true});
      const triggerBox = await info.boundingBox();
      assert(triggerBox && triggerBox.x >= 0 && triggerBox.x + triggerBox.width <= size.width);
      if (mobile) assert(triggerBox.width >= 44 && triggerBox.height >= 44, 'Touch target is too small');
      await info.focus();
      await page.waitForTimeout(200);
      await page.getByRole('tooltip').waitFor();
      await page.screenshot({path:`${shots}/${label}-tooltip.png`});
      await page.keyboard.press('Escape');
      await page.getByRole('tooltip').waitFor({state:'hidden'});
      assert(await info.evaluate(el => el === document.activeElement), 'Dismissing tooltip lost keyboard focus');
      await page.keyboard.press('Enter');
      const panel = page.getByRole('dialog', {name:'About this room',exact:true});
      await panel.waitFor();
      assert.equal(await page.locator('#office').getAttribute('data-phase'), 'idle', 'Opening info entered monitor');
      const box = await panel.boundingBox();
      assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, 'Popover exceeds viewport');
      assert(await panel.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const front = document.elementFromPoint(rect.x + rect.width / 2, rect.bottom - 8);
        return !!front && el.contains(front);
      }), 'A room control paints over the open panel');
      await page.screenshot({path:`${shots}/${label}-info.png`});
      await page.getByRole('button', {name:'Design credits',exact:true}).click();
      await panel.getByRole('link', {name:/Henry Heffernan/}).waitFor();
      const expanded = await panel.boundingBox();
      assert(expanded && expanded.y >= 0 && expanded.y + expanded.height <= size.height + 1, 'Expanded credits exceed viewport');
      assert(await panel.evaluate(el => {
        const rect = el.getBoundingClientRect();
        for (const x of [0.25, 0.5, 0.75]) for (const y of [0.25, 0.5, 0.75]) {
          const front = document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y);
          if (!front || !el.contains(front)) return false;
        }
        return true;
      }), 'Projected monitor paints over the expanded credits');
      assert(await panel.evaluate(el => {
        const projected = document.querySelector('[data-entry-desktop]');
        if (!projected) return true;
        const a = el.getBoundingClientRect(), b = projected.getBoundingClientRect();
        const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right);
        const top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom);
        if (left >= right || top >= bottom) return true;
        const front = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return !!front && el.contains(front);
      }), 'The live projected screen overlaps the credits');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
      await page.screenshot({path:`${shots}/${label}-credits.png`});
      await page.keyboard.press('Escape');
      await panel.waitFor({state:'detached'});
      assert(await info.evaluate(el => el === document.activeElement), 'Escape did not restore focus');
      assert.equal(await page.locator('#office').getAttribute('data-phase'), 'idle');
      // Touch uses the same control; closing on an outside pointer must leave the room intact.
      if (mobile) await info.tap(); else await info.click();
      await panel.waitFor();
      await page.mouse.click(size.width - 20, Math.min(140, size.height/3));
      await panel.waitFor({state:'detached'});
      assert.equal(await page.locator('#office').getAttribute('data-phase'), 'idle');
      if (mobile) {
        await page.getByRole('button', {name:'Desktop',exact:true}).click();
        await page.locator('.win95-desktop:not([inert])').waitFor();
      } else {
        await page.locator('#office').focus();
        await page.keyboard.press('Enter');
        await page.locator('#office[data-phase="desktop"]').waitFor();
        await page.frameLocator('iframe[title="prashantgarg.os"]').locator('.win95-desktop:not([inert])').waitFor();
      }
      await page.screenshot({path:`${shots}/${label}-desktop.png`});
      assert.deepEqual(errors, []);
      console.log(`PASS ${label}: room, info, credits, keyboard/touch, outside dismiss, desktop; no page errors.`);
    } catch(error) {
      await page.screenshot({path:`${shots}/${label}-failure.png`});
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
