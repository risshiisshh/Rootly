import { describe, it, expect, vi, beforeEach } from 'vitest'
import { emissionCalculator } from '../../backend/features/voice/emission.calculator'
import { activityExtractor } from '../../backend/features/voice/activity.extractor'
import { voiceService } from '../../backend/features/voice/voice.service'
import { voiceRepository } from '../../backend/features/voice/voice.repository'
import { EMISSION_FACTORS } from '@/lib/constants'

describe('Voice Logging Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('EmissionCalculator', () => {
    it('calculates transport emissions correctly', () => {
      // Petrol car
      const carVal = emissionCalculator.calculate('transport', 'car', 10)
      expect(carVal).toBeCloseTo(10 * EMISSION_FACTORS.transport.car_petrol_per_km, 4)

      // EV
      const evVal = emissionCalculator.calculate('transport', 'ev', 20)
      expect(evVal).toBeCloseTo(20 * EMISSION_FACTORS.transport.car_ev_per_km, 4)

      // Flight <= 1500km (short)
      const shortFlightVal = emissionCalculator.calculate('transport', 'flight', 1000)
      expect(shortFlightVal).toBeCloseTo(1000 * EMISSION_FACTORS.transport.flight_short_per_km, 4)

      // Flight > 1500km (long)
      const longFlightVal = emissionCalculator.calculate('transport', 'flight', 2000)
      expect(longFlightVal).toBeCloseTo(2000 * EMISSION_FACTORS.transport.flight_long_per_km, 4)
    })

    it('calculates food emissions correctly', () => {
      // Red meat (heavy)
      const redMeatVal = emissionCalculator.calculate('food', 'red_meat', 1)
      expect(redMeatVal).toBeCloseTo(1 * EMISSION_FACTORS.food.meat_heavy_meal, 4)

      // Chicken (mixed)
      const chickenVal = emissionCalculator.calculate('food', 'chicken', 1)
      expect(chickenVal).toBeCloseTo(1 * EMISSION_FACTORS.food.mixed_meal, 4)

      // Vegetarian
      const vegVal = emissionCalculator.calculate('food', 'vegetarian', 1)
      expect(vegVal).toBeCloseTo(1 * EMISSION_FACTORS.food.plant_based_meal, 4)
    })

    it('calculates energy emissions correctly', () => {
      const electricityVal = emissionCalculator.calculate('energy', 'electricity', 100)
      expect(electricityVal).toBeCloseTo(100 * EMISSION_FACTORS.energy.electricity_per_kwh, 4)
    })

    it('calculates lifestyle emissions correctly', () => {
      const laptopVal = emissionCalculator.calculate('lifestyle', 'electronics_laptop', 1)
      expect(laptopVal).toBeCloseTo(1 * EMISSION_FACTORS.lifestyle.electronics_laptop, 4)
    })
  })

  describe('ActivityExtractor', () => {
    it('extracts activities from transcript fallback correctly', async () => {
      const transcript = 'I drove 15km in my car'
      const res = await activityExtractor.extractFromTranscript(transcript)
      expect(res.activities.length).toBeGreaterThan(0)
      const carAct = res.activities.find(a => a.activity === 'car')
      expect(carAct).toBeDefined()
      expect(carAct?.category).toBe('transport')
      expect(carAct?.quantity).toBe(15)
      expect(carAct?.emission).toBeCloseTo(15 * EMISSION_FACTORS.transport.car_petrol_per_km, 4)
    })

    it('transcribes and extracts from audio fallback correctly when Gemini is not configured', async () => {
      const res = await activityExtractor.extractFromAudio('dummy-base64', 'audio/webm')
      expect(res.transcript).toContain('drove')
      expect(res.activities.length).toBeGreaterThan(0)
    })
  })

  describe('VoiceService', () => {
    it('processes transcript-only request successfully and generates feedback', async () => {
      const createSpy = vi.spyOn(voiceRepository, 'create').mockResolvedValue('mock-log-id')
      
      const res = await voiceService.processVoiceRequest(
        'user-1',
        null,
        'I drove 10km in my car and ate a vegetarian meal.'
      )

      expect(res.transcript).toBe('I drove 10km in my car and ate a vegetarian meal.')
      expect(res.activities.length).toBeGreaterThan(0)
      expect(res.feedback).toBeDefined()
      expect(res.feedback.length).toBeGreaterThan(0)
      expect(res.processingStatus).toBe('complete')
      
      expect(createSpy).toHaveBeenCalledTimes(1)
    })

    it('throws error if neither audio nor transcript is provided', async () => {
      await expect(
        voiceService.processVoiceRequest('user-1', null, null)
      ).rejects.toThrow('No audio file or transcript provided for voice logging.')
    })
  })
})
