import { test, expect } from '@playwright/test'

test.describe('Rootly E2E User Flows', () => {
  test('Complete user cycle: login, log activity, route check, voice log, chatbot, weekly report, and goal tracking', async ({ page }) => {
    // 1. Landing page & Sign In
    await page.goto('/')
    await expect(page).toHaveTitle(/Rootly/)
    
    // Navigate to Sign In
    await page.click('text=INITIALIZE_CORE')
    await expect(page).toHaveURL(/\/auth\/signin/)

    // Fill in credentials and log in (any values will pass in demo mode)
    await page.fill('input[type="email"]', 'eco-tester@rootly.green')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("ACCESS_SYSTEM")')

    // Redirect to Dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Intelligence Dashboard')).toBeVisible()

    // 2. Activity Logging
    await page.goto('/activity')
    await expect(page.locator('text=Activity Intelligence')).toBeVisible()

    // Enter natural language activity
    await page.fill('#activity-input', 'I drove 12 km and had a vegetarian lunch')

    // Wait for live parsing indicator to show Analysis Ready
    await expect(page.locator('text=Analysis Ready')).toBeVisible()

    // Submit activity
    await page.click('button[aria-label="Submit activity"]')

    // Verify the newly added item is in the history list
    await expect(page.locator('text=I drove 12 km and had a vegetarian lunch')).toBeVisible()

    // 3. Route comparison
    await page.goto('/routes')
    await expect(page.locator('text=Route Intelligence')).toBeVisible()

    // Verify default coordinates/inputs Pune and Mumbai MH are present, then compare
    await expect(page.locator('#origin')).toHaveValue('Mumbai, MH')
    await expect(page.locator('#destination')).toHaveValue('Pune, MH')
    await page.click('button:has-text("Compare Routes")')
    
    // Check results are rendered
    await expect(page.locator('text=★ Recommended')).toBeVisible()
    await expect(page.locator('text=AI Recommendation')).toBeVisible()

    // 4. Voice Logging with mock Web Audio
    await page.goto('/voice')
    await expect(page.locator('text=Voice Logging')).toBeVisible()

    // Inject mock speech recognition and getUserMedia in the browser context
    await page.evaluate(() => {
      // Mock AudioContext createMediaStreamSource to bypass strict MediaStream type checking
      const mockSource = () => ({
        connect: () => {}
      });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        AudioCtx.prototype.createMediaStreamSource = mockSource as any;
      }

      // Mock MediaStream
      navigator.mediaDevices.getUserMedia = async () => {
        const track = { stop: () => {} };
        return {
          getTracks: () => [track],
          getVideoTracks: () => [],
          getAudioTracks: () => [track],
        } as any;
      };

      // Mock MediaRecorder
      class MockMediaRecorder {
        stream: any;
        options: any;
        ondataavailable: any;
        onstop: any;
        constructor(stream, options) {
          this.stream = stream;
          this.options = options;
          this.ondataavailable = null;
          this.onstop = null;
        }
        start() {
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob(['dummy-audio'], { type: 'audio/webm' }) });
            }
          }, 100);
        }
        stop() {
          if (this.onstop) this.onstop();
        }
      }
      window.MediaRecorder = MockMediaRecorder as any;
      (window.MediaRecorder as any).isTypeSupported = () => true;

      // Mock SpeechRecognition
      class MockSpeechRecognition {
        continuous: boolean = false;
        interimResults: boolean = false;
        lang: string = 'en-US';
        onresult: any = null;
        start() {
          setTimeout(() => {
            (window as any)._lastTranscript = 'I rode fifteen miles on a train';
            if (this.onresult) {
              this.onresult({
                resultIndex: 0,
                results: [[{ transcript: 'I rode fifteen miles on a train' }]],
              });
            }
          }, 200);
        }
        stop() {}
      }
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    // Start Recording
    await page.click('button[aria-label="Start recording"]', { force: true })
    await expect(page.locator('text=Listening...')).toBeVisible()

    // Stop Recording after brief moment
    await page.waitForTimeout(500)
    await page.click('button[aria-label="Stop recording"]', { force: true })

    // Wait for the processing to finish
    await expect(page.locator('text=Analysis Complete').first()).toBeVisible()
    await expect(page.locator('text=Train').first()).toBeVisible()

    // 5. AI Coach Chat
    await page.goto('/coach')
    await expect(page.locator('text=Sustainability Coach')).toBeVisible()

    // Type a message in chat input and send
    await page.fill('#chat-input', 'How is my score this week?')
    await page.click('button[aria-label="Send message"]')
    
    // Verify user bubble appears
    await expect(page.locator('text=How is my score this week?')).toBeVisible()
    // Verify AI response bubble appears
    await expect(page.locator('text=Rootly Intelligence').first()).toBeVisible()

    // 6. Weekly Report Generation
    await page.goto('/reports')
    await expect(page.locator('text=Weekly Intelligence Briefing')).toBeVisible()
    
    // If not generated, click generate briefing button
    const generateBtn = page.locator('button:has-text("Generate Briefing")')
    if (await generateBtn.isVisible()) {
      await generateBtn.click()
    }
    
    // Check report details
    await expect(page.locator('text=Major Contributors')).toBeVisible()
    await expect(page.locator('text=Performance Delta')).toBeVisible()
    await expect(page.locator('text=Tactical Objectives')).toBeVisible()

    // 7. Goal Tracking
    await page.goto('/goals')
    await expect(page.locator('text=Goals & Challenges')).toBeVisible()

    // Click New Mission to open dialog
    await page.click('button:has-text("New Mission")')
    await expect(page.locator('text=New Mission Objective')).toBeVisible()

    // Fill goal form
    await page.fill('#goal-title', 'Active Transport Shift')
    await page.fill('#goal-desc', 'Walk or cycle for short errands')
    await page.selectOption('#goal-category', 'transport')
    await page.fill('#goal-target', '25')
    await page.click('button:has-text("Commence Mission")')

    // Confirm goal card is rendered
    await expect(page.locator('text=Active Transport Shift')).toBeVisible()
    await expect(page.locator('text=ACTIVE MISSION').first()).toBeVisible()
  })
})
