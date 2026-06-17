# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Accessibility Audits (WCAG AA Compliance) >> Landing page has no critical or serious accessibility violations
- Location: src/tests/e2e/accessibility.spec.ts:5:7

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
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | 
  4  | test.describe('Accessibility Audits (WCAG AA Compliance)', () => {
  5  |   test('Landing page has no critical or serious accessibility violations', async ({ page }) => {
> 6  |     await page.goto('/')
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  7  |     
  8  |     // Perform Axe audit
  9  |     const results = await new AxeBuilder({ page })
  10 |       .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
  11 |       .analyze()
  12 | 
  13 |     // Filter for critical or serious violations
  14 |     const criticalViolations = results.violations.filter(
  15 |       v => v.impact === 'critical' || v.impact === 'serious'
  16 |     )
  17 | 
  18 |     // Assert zero critical violations
  19 |     expect(criticalViolations).toEqual([])
  20 |   })
  21 | 
  22 |   test('Sign In page has no critical or serious accessibility violations', async ({ page }) => {
  23 |     await page.goto('/auth/signin')
  24 | 
  25 |     const results = await new AxeBuilder({ page })
  26 |       .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
  27 |       .analyze()
  28 | 
  29 |     const criticalViolations = results.violations.filter(
  30 |       v => v.impact === 'critical' || v.impact === 'serious'
  31 |     )
  32 | 
  33 |     expect(criticalViolations).toEqual([])
  34 |   })
  35 | })
  36 | 
```