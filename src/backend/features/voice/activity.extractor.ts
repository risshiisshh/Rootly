import { isGeminiConfigured, callGemini, extractActivitiesFromTranscript } from '@/services/claude'
import { emissionCalculator } from './emission.calculator'

export interface ExtractedActivity {
  category: 'transport' | 'food' | 'energy' | 'lifestyle' | 'other'
  activity: string
  quantity: number
  emission: number
  description: string
}

export class ActivityExtractor {
  async extractFromTranscript(
    transcript: string,
    customApiKey?: string
  ): Promise<{ activities: ExtractedActivity[] }> {
    // Rely on the existing extractActivitiesFromTranscript helper
    const result = await extractActivitiesFromTranscript(transcript, customApiKey)
    
    // Ensure all emissions are calculated deterministically by our EmissionCalculator
    const activities = result.activities.map((a) => {
      const emission = emissionCalculator.calculate(a.category, a.activity, a.quantity)
      return {
        category: a.category as any,
        activity: a.activity,
        quantity: a.quantity,
        emission,
        description: a.description || `${a.activity} logged via voice`,
      }
    })

    return { activities }
  }

  async extractFromAudio(
    audioBase64: string,
    mimeType: string,
    customApiKey?: string
  ): Promise<{ transcript: string; activities: ExtractedActivity[] }> {
    if (!isGeminiConfigured(customApiKey)) {
      // Offline fallback: simulate audio transcription
      const defaultTranscript = 'I drove to work today in my petrol car, about 15 kilometers. Then I had a chicken burger for lunch.'
      const { activities } = await this.extractFromTranscript(defaultTranscript, customApiKey)
      return {
        transcript: defaultTranscript,
        activities,
      }
    }

    // Call Gemini 2.0/2.5/3.5 to transcribe and extract in one go
    const prompt = `Listen to this audio recording. 
1. Transcribe the audio exactly.
2. Extract all carbon-impact activities mentioned in the audio.

Support these categories and activities:
- transport: car (petrol), ev, diesel, motorcycle, bus, train, subway, flight (short/long), bike, walk
- food: red_meat, chicken, plant_based_meal, vegan_meal, mixed_meal
- energy: electricity, natural_gas, heating_oil, coal, lpg, renewable
- lifestyle: clothing_item, electronics_smartphone, electronics_laptop, streaming_per_hour, ac_per_hour, shower_10min, bath, laundry_load

Return a JSON object containing:
{
  "transcript": "The full transcribed text of the audio",
  "activities": [
    {
      "category": "transport|food|energy|lifestyle|other",
      "activity": "Specific activity subtype (e.g. car, ev, red_meat, chicken, electricity, clothing_item)",
      "quantity": 0.0,
      "description": "Short description of this specific activity"
    }
  ]
}

Only return raw JSON. Do not wrap in markdown blocks.`

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }

    try {
      const response = await callGemini('gemini-1.5-flash', payload, customApiKey)
      const data = JSON.parse(response.text)
      
      const rawActivities = Array.isArray(data.activities) ? data.activities : []
      const activities = rawActivities.map((a: any) => {
        const category = (a.category || 'other').toLowerCase()
        const activity = (a.activity || 'general').toLowerCase()
        const quantity = typeof a.quantity === 'number' ? a.quantity : 1
        const emission = emissionCalculator.calculate(category, activity, quantity)
        return {
          category: category as any,
          activity,
          quantity,
          emission,
          description: a.description || `${activity} logged via voice`,
        }
      })

      return {
        transcript: data.transcript || 'Audio processed.',
        activities,
      }
    } catch (error) {
      console.error('Failed to transcribe/extract from audio using Gemini:', error)
      // Fallback to text mode using a simple transcript or empty
      const fallbackTranscript = 'Audio recording uploaded.'
      return {
        transcript: fallbackTranscript,
        activities: [],
      }
    }
  }
}

export const activityExtractor = new ActivityExtractor()
