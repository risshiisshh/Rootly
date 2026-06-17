import { describe, it, expect } from 'vitest'
import { extractActivitiesFromTranscript } from '../../services/claude'

describe('extractActivitiesFromTranscript fallback parser', () => {
  it('parses text-based numbers and multiple activities (driving + food)', async () => {
    const transcript = 'I drove ten km and then had chicken biryani'
    const result = await extractActivitiesFromTranscript(transcript)
    
    expect(result.activities).toHaveLength(2)
    
    const transport = result.activities.find(a => a.category === 'transport')
    expect(transport).toBeDefined()
    expect(transport?.activity).toBe('car')
    expect(transport?.quantity).toBe(10)
    expect(transport?.emission).toBeCloseTo(10 * 0.192, 4)

    const food = result.activities.find(a => a.category === 'food')
    expect(food).toBeDefined()
    expect(food?.activity).toBe('chicken_biryani')
    expect(food?.quantity).toBe(1)
    expect(food?.emission).toBe(1.5)
  })

  it('parses distance units (miles) and converts them to km', async () => {
    const transcript = 'I rode the train for fifteen miles'
    const result = await extractActivitiesFromTranscript(transcript)
    
    expect(result.activities).toHaveLength(1)
    const transport = result.activities[0]
    expect(transport.category).toBe('transport')
    expect(transport.activity).toBe('train')
    expect(transport.quantity).toBe(24) // 15 miles = 24.14 km -> round to 24
    expect(transport.emission).toBeCloseTo(15 * 1.60934 * 0.041, 4)
  })

  it('parses plant-based Indian food items (dal, roti)', async () => {
    const transcript = 'I had dal and roti for lunch'
    const result = await extractActivitiesFromTranscript(transcript)
    
    expect(result.activities.length).toBeGreaterThanOrEqual(1)
    const food = result.activities[0]
    expect(food.category).toBe('food')
    expect(food.activity).toMatch(/dal|roti|plant_based_meal/)
    expect(food.emission).toBe(0.5)
  })

  it('parses energy units and kilowatts', async () => {
    const transcript = 'our household used fifty units of electricity'
    const result = await extractActivitiesFromTranscript(transcript)
    
    expect(result.activities).toHaveLength(1)
    const energy = result.activities[0]
    expect(energy.category).toBe('energy')
    expect(energy.activity).toBe('electricity')
    expect(energy.quantity).toBe(50)
    expect(energy.emission).toBeCloseTo(50 * 0.233, 4)
  })

  it('falls back to daily footprint if no pattern is matched', async () => {
    const transcript = 'just woke up and felt great'
    const result = await extractActivitiesFromTranscript(transcript)
    
    expect(result.activities).toHaveLength(1)
    const fallback = result.activities[0]
    expect(fallback.category).toBe('lifestyle')
    expect(fallback.activity).toBe('general')
    expect(fallback.quantity).toBe(1)
    expect(fallback.emission).toBe(1.8)
  })
})
