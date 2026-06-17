import { test, expect } from '@playwright/test'

const viewports = [
  { width: 320, height: 568, name: '320px' },
  { width: 375, height: 667, name: '375px' },
  { width: 390, height: 844, name: '390px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 1024, height: 768, name: '1024px' },
  { width: 1280, height: 800, name: '1280px' },
  { width: 1440, height: 900, name: '1440px' },
  { width: 1920, height: 1080, name: '1920px' },
  { width: 2560, height: 1440, name: '2560px' },
]

test.describe('Responsive Design Layout Audits', () => {
  viewports.forEach(({ width, height, name }) => {
    test(`Verify page layout at ${name} (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height })

      // Go to landing page
      await page.goto('/')
      
      // Perform overflow check: ensure no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalScroll).toBe(false)

      // Navigate to Sign In page
      await page.goto('/auth/signin')
      const signinScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(signinScroll).toBe(false)
      
      // Confirm the submit button is in view and not clipped
      const submitBtn = page.locator('button:has-text("ACCESS_SYSTEM")')
      await expect(submitBtn).toBeVisible()
    })
  })
})
