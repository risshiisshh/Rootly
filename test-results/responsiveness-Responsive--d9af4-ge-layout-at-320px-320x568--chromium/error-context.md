# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsiveness.spec.ts >> Responsive Design Layout Audits >> Verify page layout at 320px (320x568)
- Location: src/tests/e2e/responsiveness.spec.ts:17:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const viewports = [
  4  |   { width: 320, height: 568, name: '320px' },
  5  |   { width: 375, height: 667, name: '375px' },
  6  |   { width: 390, height: 844, name: '390px' },
  7  |   { width: 768, height: 1024, name: '768px' },
  8  |   { width: 1024, height: 768, name: '1024px' },
  9  |   { width: 1280, height: 800, name: '1280px' },
  10 |   { width: 1440, height: 900, name: '1440px' },
  11 |   { width: 1920, height: 1080, name: '1920px' },
  12 |   { width: 2560, height: 1440, name: '2560px' },
  13 | ]
  14 | 
  15 | test.describe('Responsive Design Layout Audits', () => {
  16 |   viewports.forEach(({ width, height, name }) => {
  17 |     test(`Verify page layout at ${name} (${width}x${height})`, async ({ page }) => {
  18 |       // Set viewport size
  19 |       await page.setViewportSize({ width, height })
  20 | 
  21 |       // Go to landing page
> 22 |       await page.goto('/')
     |                  ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  23 |       
  24 |       // Perform overflow check: ensure no horizontal scroll
  25 |       const hasHorizontalScroll = await page.evaluate(() => {
  26 |         return document.documentElement.scrollWidth > window.innerWidth
  27 |       })
  28 |       expect(hasHorizontalScroll).toBe(false)
  29 | 
  30 |       // Navigate to Sign In page
  31 |       await page.goto('/auth/signin')
  32 |       const signinScroll = await page.evaluate(() => {
  33 |         return document.documentElement.scrollWidth > window.innerWidth
  34 |       })
  35 |       expect(signinScroll).toBe(false)
  36 |       
  37 |       // Confirm the submit button is in view and not clipped
  38 |       const submitBtn = page.locator('button:has-text("ACCESS_SYSTEM")')
  39 |       await expect(submitBtn).toBeVisible()
  40 |     })
  41 |   })
  42 | })
  43 | 
```