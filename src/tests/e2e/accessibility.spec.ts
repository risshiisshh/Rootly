import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Audits (WCAG AA Compliance)', () => {
  test('Landing page has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/')
    
    // Perform Axe audit
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze()

    // Filter for critical or serious violations
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

    // Assert zero critical violations
    expect(criticalViolations).toEqual([])
  })

  test('Sign In page has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/auth/signin')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze()

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toEqual([])
  })

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('input[type="email"]', 'eco-tester@rootly.green')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button:has-text("ACCESS_SYSTEM")')
      await expect(page).toHaveURL(/\/dashboard/)
    })

    const PAGES = [
      '/dashboard',
      '/activity',
      '/routes',
      '/voice',
      '/coach',
      '/reports',
      '/goals',
      '/profile',
      '/exports',
      '/insights',
    ]

    for (const url of PAGES) {
      test(`${url} page has no critical or serious accessibility violations`, async ({ page }) => {
        await page.goto(url)
        // Wait a short moment for hydration
        await page.waitForTimeout(500)
        
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
          .analyze()

        const criticalViolations = results.violations.filter(
          v => v.impact === 'critical' || v.impact === 'serious'
        )

        expect(criticalViolations).toEqual([])
      })
    }
  })
})
