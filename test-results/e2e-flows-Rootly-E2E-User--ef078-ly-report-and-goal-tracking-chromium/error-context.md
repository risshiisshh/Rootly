# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-flows.spec.ts >> Rootly E2E User Flows >> Complete user cycle: login, log activity, route check, voice log, chatbot, weekly report, and goal tracking
- Location: src/tests/e2e/e2e-flows.spec.ts:4:7

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
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Rootly E2E User Flows', () => {
  4   |   test('Complete user cycle: login, log activity, route check, voice log, chatbot, weekly report, and goal tracking', async ({ page }) => {
  5   |     // 1. Landing page & Sign In
> 6   |     await page.goto('/')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  7   |     await expect(page).toHaveTitle(/Rootly/)
  8   |     
  9   |     // Navigate to Sign In
  10  |     await page.click('text=INITIALIZE_CORE')
  11  |     await expect(page).toHaveURL(/\/auth\/signin/)
  12  | 
  13  |     // Fill in credentials and log in (any values will pass in demo mode)
  14  |     await page.fill('input[type="email"]', 'eco-tester@rootly.green')
  15  |     await page.fill('input[type="password"]', 'password123')
  16  |     await page.click('button:has-text("ACCESS_SYSTEM")')
  17  | 
  18  |     // Redirect to Dashboard
  19  |     await expect(page).toHaveURL(/\/dashboard/)
  20  |     await expect(page.locator('text=Intelligence Dashboard')).toBeVisible()
  21  | 
  22  |     // 2. Activity Logging
  23  |     await page.goto('/activity')
  24  |     await expect(page.locator('text=Activity Intelligence')).toBeVisible()
  25  | 
  26  |     // Enter natural language activity
  27  |     await page.fill('#activity-input', 'I drove 12 km and had a vegetarian lunch')
  28  | 
  29  |     // Wait for live parsing indicator to show Analysis Ready
  30  |     await expect(page.locator('text=Analysis Ready')).toBeVisible()
  31  | 
  32  |     // Submit activity
  33  |     await page.click('button[aria-label="Submit activity"]')
  34  | 
  35  |     // Verify the newly added item is in the history list
  36  |     await expect(page.locator('text=I drove 12 km and had a vegetarian lunch')).toBeVisible()
  37  | 
  38  |     // 3. Route comparison
  39  |     await page.goto('/routes')
  40  |     await expect(page.locator('text=Route Intelligence')).toBeVisible()
  41  | 
  42  |     // Verify default coordinates/inputs Pune and Mumbai MH are present, then compare
  43  |     await expect(page.locator('#origin')).toHaveValue('Mumbai, MH')
  44  |     await expect(page.locator('#destination')).toHaveValue('Pune, MH')
  45  |     await page.click('button:has-text("Compare Routes")')
  46  |     
  47  |     // Check results are rendered
  48  |     await expect(page.locator('text=★ Recommended')).toBeVisible()
  49  |     await expect(page.locator('text=AI Recommendation')).toBeVisible()
  50  | 
  51  |     // 4. Voice Logging with mock Web Audio
  52  |     await page.goto('/voice')
  53  |     await expect(page.locator('text=Voice Logging')).toBeVisible()
  54  | 
  55  |     // Inject mock speech recognition and getUserMedia in the browser context
  56  |     await page.evaluate(() => {
  57  |       // Mock AudioContext createMediaStreamSource to bypass strict MediaStream type checking
  58  |       const mockSource = () => ({
  59  |         connect: () => {}
  60  |       });
  61  |       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  62  |       if (AudioCtx) {
  63  |         AudioCtx.prototype.createMediaStreamSource = mockSource as any;
  64  |       }
  65  | 
  66  |       // Mock MediaStream
  67  |       navigator.mediaDevices.getUserMedia = async () => {
  68  |         const track = { stop: () => {} };
  69  |         return {
  70  |           getTracks: () => [track],
  71  |           getVideoTracks: () => [],
  72  |           getAudioTracks: () => [track],
  73  |         } as any;
  74  |       };
  75  | 
  76  |       // Mock MediaRecorder
  77  |       class MockMediaRecorder {
  78  |         stream: any;
  79  |         options: any;
  80  |         ondataavailable: any;
  81  |         onstop: any;
  82  |         constructor(stream, options) {
  83  |           this.stream = stream;
  84  |           this.options = options;
  85  |           this.ondataavailable = null;
  86  |           this.onstop = null;
  87  |         }
  88  |         start() {
  89  |           setTimeout(() => {
  90  |             if (this.ondataavailable) {
  91  |               this.ondataavailable({ data: new Blob(['dummy-audio'], { type: 'audio/webm' }) });
  92  |             }
  93  |           }, 100);
  94  |         }
  95  |         stop() {
  96  |           if (this.onstop) this.onstop();
  97  |         }
  98  |       }
  99  |       window.MediaRecorder = MockMediaRecorder as any;
  100 |       (window.MediaRecorder as any).isTypeSupported = () => true;
  101 | 
  102 |       // Mock SpeechRecognition
  103 |       class MockSpeechRecognition {
  104 |         continuous: boolean = false;
  105 |         interimResults: boolean = false;
  106 |         lang: string = 'en-US';
```