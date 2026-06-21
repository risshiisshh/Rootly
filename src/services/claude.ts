import type { Activity } from '@/types/activity'
import type { Goal } from '@/types/report'
import type { ChatMessage } from '@/types/chat'
import type { User } from '@/types/user'
import { formatEmissions } from '@/lib/utils'

export const isGeminiConfigured = (customApiKey?: string) => {
  const forceDemo = process.env.FORCE_DEMO === 'true' || process.env.NEXT_PUBLIC_FORCE_DEMO === 'true'
  if (forceDemo) {
    return false
  }
  if (customApiKey && customApiKey !== '' && customApiKey !== 'your_gemini_api_key') {
    return true
  }
  const geminiKey = process.env.GEMINI_API_KEY
  return !!(geminiKey && geminiKey !== '' && geminiKey !== 'your_gemini_api_key')
}

/**
 * Call Google Gemini API using native fetch
 */
export async function callGemini(
  model: string,
  payload: {
    contents: any[]
    systemInstruction?: { parts: { text: string }[] }
    generationConfig?: {
      temperature?: number
      maxOutputTokens?: number
      responseMimeType?: string
    }
  },
  customApiKey?: string
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    throw new Error('Could not resolve Gemini API authentication. Expected GEMINI_API_KEY to be set in your environment or .env.local file.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Gemini API')
  }

  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0

  return { text, usage: { inputTokens, outputTokens } }
}

import { promptManager } from '@/backend/features/coach/prompt.manager'
import { recommendationEngine } from '@/backend/features/coach/recommendation.engine'
import type { CoachContext } from '@/backend/features/coach/response.schema'

export interface ChatContext {
  user: User
  recentActivities: Activity[]
  weeklyActivities?: Activity[]
  activeGoals: Goal[]
  weeklyEmissionsKg: number
  previousWeekEmissionsKg?: number
  trend: 'improving' | 'stable' | 'worsening'
  carbonScore?: number
  conversationHistory: ChatMessage[]
}

export function formatCoachResponse(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr)
    const observation = data.observation || data.Observation
    const reasoning = data.reasoning || data.Reasoning
    const recommendation = data.recommendation || data.Recommendation
    const estimatedImpact = data.estimatedImpact || data.estimated_impact || data.EstimatedImpact || data['Estimated impact']
    
    if (observation && reasoning && recommendation && estimatedImpact) {
      return `### Observation\n${observation}\n\n### Reasoning\n${reasoning}\n\n### Recommendation\n${recommendation}\n\n### Estimated Impact\n${estimatedImpact}`
    }
  } catch {
    // Ignore JSON parsing errors
  }
  return jsonStr
}

/**
 * Send a chat message and get an AI response (Gemini 2.0 Flash)
 * Returns the full text response
 */
export async function sendChatMessage(
  userMessage: string,
  ctx: ChatContext,
  customApiKey?: string
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  // Convert ChatContext to CoachContext (inject defaults for missing properties)
  const fullCtx: CoachContext = {
    ...ctx,
    weeklyActivities: ctx.weeklyActivities ?? [],
    previousWeekEmissionsKg: ctx.previousWeekEmissionsKg ?? 0,
    carbonScore: ctx.carbonScore ?? ctx.user.carbonScore ?? 75,
  }

  const recommendations = recommendationEngine.generateRecommendations(fullCtx)

  if (!isGeminiConfigured(customApiKey)) {
    const topRec = recommendations[0]
    let content = ''
    if (topRec) {
      content = `### Observation\n${topRec.observation}\n\n### Reasoning\n${topRec.reasoning}\n\n### Recommendation\n${topRec.recommendation}\n\n### Estimated Impact\n${topRec.estimatedImpact}`
    } else {
      content = `### Observation\nI see you are starting your journey with Rootly. Currently, you have logged some activities and your weekly emissions are at ${formatEmissions(ctx.weeklyEmissionsKg)}.\n\n### Reasoning\nSince you are new to the platform, we need to establish a consistent tracking habit to understand your primary carbon footprint drivers.\n\n### Recommendation\nStart by logging a transport or food activity. Try saying "I drove 10km to work" or "I had a vegetarian meal" to see how your carbon score is affected.\n\n### Estimated Impact\nTracking 100% of your activities can help you identify and reduce up to 20% of your current emissions through improved awareness.`
    }
    return {
      content,
      usage: { inputTokens: 0, outputTokens: 0 }
    }
  }

  const systemPrompt = promptManager.buildSystemPrompt(fullCtx, recommendations)

  // Build message history for Gemini (roles user and model)
  const contents = ctx.conversationHistory
    .slice(-10) // Last 10 messages for context
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  // Add the new user message
  contents.push({ role: 'user', parts: [{ text: userMessage }] })

  const response = await callGemini('gemini-1.5-flash', {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  }, customApiKey)

  return {
    content: formatCoachResponse(response.text),
    usage: response.usage,
  }
}

interface WeeklyReportContext {
  user: User
  activities: Activity[]
  previousWeekActivities: Activity[]
  activeGoals: Goal[]
}

/**
 * Generate a comprehensive weekly report using Gemini 1.5 Pro
 */
export async function generateWeeklyReport(
  ctx: WeeklyReportContext,
  customApiKey?: string
): Promise<{
  narrative: string
  recommendations: { title: string; description: string; potentialSavingsKg: number; priority: 'high' | 'medium' | 'low' }[]
  trend: 'improving' | 'stable' | 'worsening'
}> {
  const currentTotal = ctx.activities.reduce((s, a) => s + a.emission, 0)
  const previousTotal = ctx.previousWeekActivities.reduce((s, a) => s + a.emission, 0)
  const delta = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

  if (!isGeminiConfigured(customApiKey)) {
    return {
      narrative: `You did a great job tracking your footprint this week, ${ctx.user.displayName ?? 'Eco Explorer'}. Your emissions are stable, but targeting transport options will yield the biggest savings.`,
      trend: delta < -5 ? 'improving' : delta > 5 ? 'worsening' : 'stable',
      recommendations: [
        {
          title: 'Switch to public transit',
          description: 'By choosing electric train over car driving for your regular commutes, you can save significant emissions.',
          potentialSavingsKg: 8.5,
          priority: 'high'
        },
        {
          title: 'Optimize home heating',
          description: 'Reduce heating cycles by 1 hour to save electricity and gas emissions.',
          potentialSavingsKg: 4.2,
          priority: 'high'
        },
        {
          title: 'Choose plant-based options',
          description: 'Replacing red meat with vegetarian meals twice a week reduces food footprint.',
          potentialSavingsKg: 3.5,
          priority: 'medium'
        },
        {
          title: 'Unplug idle electronics',
          description: 'Phantom power load accounts for up to 5% of household energy consumption.',
          potentialSavingsKg: 1.1,
          priority: 'low'
        },
        {
          title: 'Combine errands into one trip',
          description: 'Plan driving routes in advance to minimize cold engine starts and total distance.',
          potentialSavingsKg: 2.3,
          priority: 'low'
        }
      ]
    }
  }

  const prompt = `Generate a weekly carbon intelligence briefing for ${ctx.user.displayName ?? 'the user'}.

CURRENT WEEK DATA:
- Total emissions: ${formatEmissions(currentTotal)}
- Previous week: ${formatEmissions(previousTotal)}
- Change: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%
- Weekly goal: ${formatEmissions(ctx.user.weeklyGoalKg)}
- Carbon score: ${ctx.user.carbonScore}/100

ACTIVITIES THIS WEEK:
${ctx.activities.map(a => `- ${a.activity}: ${formatEmissions(a.emission)} [${a.category}]`).join('\n') || 'No activities logged'}

ACTIVE GOALS:
${ctx.activeGoals.map(g => `- ${g.title}: target ${formatEmissions(g.targetReductionKg)} reduction`).join('\n') || 'None'}

Return a JSON object with:
{
  "narrative": "A 2-3 sentence personalized summary referencing their actual data",
  "trend": "improving|stable|worsening",
  "recommendations": [
    {
      "title": "Short action title",
      "description": "Specific actionable advice referencing their data",
      "potentialSavingsKg": 0.0,
      "priority": "high|medium|low"
    }
  ]
}

Generate exactly 5 recommendations, ranked by impact. Be specific, not generic.`

  const response = await callGemini('gemini-1.5-flash', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }, customApiKey)

  try {
    return JSON.parse(response.text)
  } catch {
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      return JSON.parse(jsonMatch[0])
    } catch {
      return {
        narrative: response.text.slice(0, 300),
        recommendations: [],
        trend: delta < -5 ? 'improving' : delta > 5 ? 'worsening' : 'stable',
      }
    }
  }
}

/**
 * Extract activities from a voice transcript using Gemini 2.0 Flash
 */
export async function extractActivitiesFromTranscript(
  transcript: string,
  customApiKey?: string
): Promise<{
  activities: { category: string; activity: string; quantity: number; emission: number; description: string }[]
}> {
  if (!isGeminiConfigured(customApiKey)) {
    const text = transcript.toLowerCase()
    const activities: any[] = []

    const numberWords: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
      eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
      seventy: 70, eighty: 80, ninety: 90, hundred: 100
    }
    const parseVal = (s: string): number => {
      if (!s) return 1
      const n = parseFloat(s)
      if (!isNaN(n)) return n
      return numberWords[s.trim()] ?? 1
    }

    const numPattern = '(?:\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)'

    // Split transcript by common dividers to handle multiple activities
    const clauses = text.split(/\band\b|\bthen\b|,|\.|\bbut\b/)

    for (const clause of clauses) {
      const trimmedClause = clause.trim()
      if (!trimmedClause) continue

      // 1. Driving
      if (trimmedClause.includes('drive') || trimmedClause.includes('drove') || trimmedClause.includes('car') || trimmedClause.includes('road') || trimmedClause.includes('highway') || trimmedClause.includes('motorcycle') || trimmedClause.includes('cab') || trimmedClause.includes('uber')) {
        const match = trimmedClause.match(new RegExp('(' + numPattern + ')\\s*(km|kilometers|miles|mile|kilometres|kilometre)', 'i'))
        let distance = match ? parseVal(match[1]) : 15
        const unit = match ? match[2] : 'km'
        if (unit.startsWith('mile')) {
          distance = distance * 1.60934
        }
        activities.push({
          category: 'transport',
          activity: 'car',
          quantity: Math.round(distance),
          emission: distance * 0.192,
          description: `Car travel extracted from voice log: "${trimmedClause}"`
        })
        continue
      }

      // 2. Train
      if (trimmedClause.includes('train') || trimmedClause.includes('transit') || trimmedClause.includes('subway') || trimmedClause.includes('metro') || trimmedClause.includes('rail') || trimmedClause.includes('tube')) {
        const match = trimmedClause.match(new RegExp('(' + numPattern + ')\\s*(km|kilometers|miles|mile|kilometres|kilometre)', 'i'))
        let distance = match ? parseVal(match[1]) : 20
        const unit = match ? match[2] : 'km'
        if (unit.startsWith('mile')) {
          distance = distance * 1.60934
        }
        activities.push({
          category: 'transport',
          activity: 'train',
          quantity: Math.round(distance),
          emission: distance * 0.041,
          description: `Train commute extracted from voice log: "${trimmedClause}"`
        })
        continue
      }

      // 3. Flight
      if (trimmedClause.includes('flight') || trimmedClause.includes('flew') || trimmedClause.includes('fly') || trimmedClause.includes('plane') || trimmedClause.includes('airplane') || trimmedClause.includes('aviation')) {
        const match = trimmedClause.match(new RegExp('(' + numPattern + ')\\s*(km|kilometers|miles|mile|kilometres|kilometre)', 'i'))
        let distance = match ? parseVal(match[1]) : 100
        const unit = match ? match[2] : 'km'
        if (unit.startsWith('mile')) {
          distance = distance * 1.60934
        }
        activities.push({
          category: 'transport',
          activity: 'flight',
          quantity: Math.round(distance),
          emission: distance * 0.255,
          description: `Flight extracted from voice log: "${trimmedClause}"`
        })
        continue
      }

      // 4. Bus
      if (trimmedClause.includes('bus') || trimmedClause.includes('shuttle')) {
        const match = trimmedClause.match(new RegExp('(' + numPattern + ')\\s*(km|kilometers|miles|mile|kilometres|kilometre)', 'i'))
        let distance = match ? parseVal(match[1]) : 10
        const unit = match ? match[2] : 'km'
        if (unit.startsWith('mile')) {
          distance = distance * 1.60934
        }
        activities.push({
          category: 'transport',
          activity: 'bus',
          quantity: Math.round(distance),
          emission: distance * 0.089,
          description: `Bus ride extracted from voice log: "${trimmedClause}"`
        })
        continue
      }

      // 5. Food
      if (trimmedClause.includes('beef') || trimmedClause.includes('steak') || trimmedClause.includes('pork') || trimmedClause.includes('red meat') || trimmedClause.includes('burger') || trimmedClause.includes('mutton') || trimmedClause.includes('lamb')) {
        activities.push({
          category: 'food',
          activity: 'red_meat',
          quantity: 1,
          emission: 3.2,
          description: `Red meat meal consumption reported in: "${trimmedClause}"`
        })
        continue
      }

      const hasChicken = trimmedClause.includes('chicken') || trimmedClause.includes('poultry') || trimmedClause.includes('turkey')
      const hasBiryani = trimmedClause.includes('biryani')
      const hasVegBiryani = trimmedClause.includes('veg biryani') || trimmedClause.includes('vegetarian biryani')

      if (hasVegBiryani) {
        activities.push({
          category: 'food',
          activity: 'veg_biryani',
          quantity: 1,
          emission: 0.5,
          description: `Veg Biryani consumption reported in: "${trimmedClause}"`
        })
        continue
      }

      if (hasChicken || hasBiryani) {
        activities.push({
          category: 'food',
          activity: hasBiryani ? 'chicken_biryani' : 'chicken',
          quantity: 1,
          emission: 1.5,
          description: `${hasBiryani ? 'Chicken Biryani' : 'Chicken'} meal consumption reported in: "${trimmedClause}"`
        })
        continue
      }

      if (trimmedClause.includes('vegetarian') || trimmedClause.includes('vegan') || trimmedClause.includes('salad') || trimmedClause.includes('plant') || trimmedClause.includes('dal') || trimmedClause.includes('roti') || trimmedClause.includes('rice') || trimmedClause.includes('paneer') || trimmedClause.includes('chana') || trimmedClause.includes('aloo') || trimmedClause.includes('samosa') || trimmedClause.includes('tofu') || trimmedClause.includes('beans') || trimmedClause.includes('lentils')) {
        let act = 'plant_based_meal'
        if (trimmedClause.includes('dal')) act = 'dal'
        else if (trimmedClause.includes('roti')) act = 'roti'
        else if (trimmedClause.includes('paneer')) act = 'paneer'
        else if (trimmedClause.includes('rice')) act = 'rice'

        activities.push({
          category: 'food',
          activity: act,
          quantity: 1,
          emission: 0.5,
          description: `Vegetarian food reported in: "${trimmedClause}"`
        })
        continue
      }

      // 6. Energy
      if (trimmedClause.includes('electricity') || trimmedClause.includes('heating') || trimmedClause.includes('kwh') || trimmedClause.includes('power') || trimmedClause.includes('unit') || trimmedClause.includes('units') || trimmedClause.includes('kilowatt') || trimmedClause.includes('kilowatts')) {
        const match = trimmedClause.match(new RegExp('(' + numPattern + ')\\s*(kwh|kilowatt|kilowatts|unit|units|kilowatt-hour|kilowatt-hours)', 'i'))
        const kwh = match ? parseVal(match[1]) : 10
        activities.push({
          category: 'energy',
          activity: 'electricity',
          quantity: kwh,
          emission: kwh * 0.233,
          description: `Home energy usage extracted from transcript: "${trimmedClause}"`
        })
        continue
      }
    }

    if (activities.length === 0) {
      activities.push({
        category: 'lifestyle',
        activity: 'general',
        quantity: 1,
        emission: 1.8,
        description: `General activity logs: "${transcript}"`
      })
    }

    return { activities }
  }

  const prompt = `Extract carbon footprint activities from this transcript: "${transcript}"

Return a JSON array of activities:
[
  {
    "category": "transport|food|energy|lifestyle|other",
    "activity": "Specific activity type (e.g. car, train, flight, red_meat, vegan_meal, electricity)",
    "quantity": 0.0,
    "emission": 0.0,
    "description": "Details extracted from transcript"
  }
]

Use these emission factors:
- Driving: 0.192 kg/km
- Train: 0.041 kg/km  
- Bus: 0.089 kg/km
- Flight (short): 0.255 kg/km
- Red meat meal: 3.2 kg
- Chicken meal: 1.5 kg
- Vegan meal: 0.5 kg
- Electricity (1 kWh): 0.233 kg

Only include activities with quantifiable emissions. Return empty array if none found.`

  const response = await callGemini('gemini-1.5-flash', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  }, customApiKey)

  try {
    return { activities: JSON.parse(response.text) }
  } catch {
    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return { activities: [] }
      return { activities: JSON.parse(jsonMatch[0]) }
    } catch {
      return { activities: [] }
    }
  }
}

/**
 * Generate AI reasoning for route comparison using Gemini 2.0 Flash
 */
export async function generateRouteReasoning(
  origin: string,
  destination: string,
  options: { mode: string; emissionsKg: number; durationMinutes: number }[],
  customApiKey?: string
): Promise<string> {
  const sorted = [...options].sort((a, b) => a.emissionsKg - b.emissionsKg)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]

  if (!isGeminiConfigured(customApiKey)) {
    return `${best.mode === 'walk' || best.mode === 'bike' ? 'Walking or cycling' : 'Public transit'} is the greenest option for this route, saving ${(worst.emissionsKg - best.emissionsKg).toFixed(1)}kg of CO₂ compared to driving a ${worst.mode}.`
  }

  const prompt = `Generate a 2-sentence recommendation for a route from ${origin} to ${destination}.

Options (sorted by emissions):
${sorted.map(o => `- ${o.mode}: ${o.emissionsKg.toFixed(1)}kg CO2, ${o.durationMinutes}min`).join('\n')}

Best option: ${best.mode} saves ${(worst.emissionsKg - best.emissionsKg).toFixed(1)}kg vs ${worst.mode}.
Be specific about the savings and brief about why. Keep under 100 words.`

  const response = await callGemini('gemini-1.5-flash', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 200,
    },
  }, customApiKey)

  return response.text
}
