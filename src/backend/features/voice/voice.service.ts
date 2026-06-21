import { voiceRepository } from './voice.repository'
import { activityExtractor, ExtractedActivity } from './activity.extractor'
import { isGeminiConfigured, callGemini } from '@/services/claude'
import { Timestamp } from 'firebase-admin/firestore'

export class VoiceService {
  async processVoiceRequest(
    userId: string,
    audioFile: File | null,
    transcript: string | null,
    customApiKey?: string
  ) {
    let finalTranscript = transcript || ''
    let activities: ExtractedActivity[] = []

    if (audioFile) {
      if (finalTranscript) {
        // If the client already transcribed it, just extract activities
        const result = await activityExtractor.extractFromTranscript(finalTranscript, customApiKey)
        activities = result.activities
      } else {
        // Otherwise, transcribe the audio file and extract activities using Gemini
        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const audioBase64 = buffer.toString('base64')
        const mimeType = audioFile.type || 'audio/webm'
        
        const result = await activityExtractor.extractFromAudio(audioBase64, mimeType, customApiKey)
        finalTranscript = result.transcript
        activities = result.activities
      }
    } else if (finalTranscript) {
      // Transcript-only processing
      const result = await activityExtractor.extractFromTranscript(finalTranscript, customApiKey)
      activities = result.activities
    } else {
      throw new Error('No audio file or transcript provided for voice logging.')
    }

    // Generate personalized AI feedback
    const feedback = await this.generateFeedback(activities, customApiKey)

    // Save the voice log transaction in Firestore
    await voiceRepository.create(userId, {
      transcript: finalTranscript,
      extractedActivities: activities.map(a => ({
        category: a.category,
        activity: a.activity,
        quantity: a.quantity,
        emission: a.emission,
        description: a.description,
        timestamp: Timestamp.now() as any,
      })),
      audioLengthSeconds: 0,
      processingStatus: 'complete',
      feedback,
    })

    return {
      transcript: finalTranscript,
      activities,
      feedback,
      processingStatus: 'complete',
    }
  }

  // Deprecated fallback method to preserve any legacy calls
  async processVoiceTranscript(
    userId: string,
    transcript: string,
    customApiKey?: string
  ) {
    return this.processVoiceRequest(userId, null, transcript, customApiKey)
  }

  private async generateFeedback(
    activities: ExtractedActivity[],
    customApiKey?: string
  ): Promise<string> {
    if (activities.length === 0) {
      return 'No activities were detected in your voice recording. Try logging something like: "I drove 10 km in a petrol car today."'
    }

    if (!isGeminiConfigured(customApiKey)) {
      // Deterministic feedback fallback
      const hasRedMeat = activities.some(a => a.category === 'food' && a.activity === 'red_meat')
      const hasCar = activities.some(a => a.category === 'transport' && a.activity === 'car')
      const hasGreenTransit = activities.some(a => a.category === 'transport' && (a.activity === 'train' || a.activity === 'bus' || a.activity === 'ev' || a.activity === 'walk' || a.activity === 'bike'))
      const hasVeg = activities.some(a => a.category === 'food' && (a.activity === 'vegan_line_based' || a.activity === 'plant_based_meal' || a.activity === 'vegan_line'))

      if (hasRedMeat) {
        return 'I noticed a red meat meal, which carries a high carbon footprint. Swapping this for chicken or a plant-based alternative next time is a powerful way to reduce food emissions!'
      }
      if (hasCar) {
        return 'You logged some car travel. Consider combining trips, carpooling, or walking/cycling for routes under 3 km to lower your weekly carbon score.'
      }
      if (hasGreenTransit || hasVeg) {
        return 'Fantastic job choosing low-emissions options! Choosing vegetarian meals and public transit helps keep your carbon footprint well within targets.'
      }
      return 'Great job logging your daily activities! Consistently tracking your footprint is the first step toward effective carbon reduction.'
    }

    const prompt = `Given these logged carbon activities:
${activities.map(a => `- Category: ${a.category}, Activity: ${a.activity}, Quantity: ${a.quantity}, Emissions: ${a.emission.toFixed(2)} kg CO2`).join('\n')}

Generate a supportive, highly personalized 1-2 sentence feedback tip for the user about their carbon footprint impact. Be encouraging, reference their specific activities, and keep it under 50 words.`

    try {
      const response = await callGemini('gemini-3.5-flash', {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      }, customApiKey)
      return response.text.trim()
    } catch (error) {
      console.error('Failed to generate feedback with Gemini:', error)
      return 'Your activities were successfully logged. Every entry helps refine your weekly carbon score!'
    }
  }
}

export const voiceService = new VoiceService()
