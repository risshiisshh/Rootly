import { useCallback, useRef, useState } from 'react'
import { auth } from '@/services/firebase'
import { useAuthStore } from '@/store/userStore'
import { getSafeLocalStorage } from '@/lib/utils'
import { analyticsTracker } from '@/lib/analytics'

type VoiceState = 'idle' | 'recording' | 'processing' | 'complete' | 'error'

interface ExtractedActivity {
  category: string
  activity: string
  quantity: number
  emission: number
  description: string
}

/**
 * Encapsulates the full MediaRecorder → API → activity extraction pipeline.
 * Exposes waveform heights for real-time visualization.
 */
export function useVoice() {
  const { userProfile } = useAuthStore()
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [extracted, setExtracted] = useState<ExtractedActivity[]>([])
  const [duration, setDuration] = useState(0)
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(20))
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setTranscript('')
    setExtracted([])
    setDuration(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const src = audioCtx.createMediaStreamSource(stream)
      const analyzer = audioCtx.createAnalyser()
      analyzer.fftSize = 64
      src.connect(analyzer)
      analyzerRef.current = analyzer

      const tick = () => {
        const data = new Uint8Array(analyzer.frequencyBinCount)
        analyzer.getByteFrequencyData(data)
        setWaveform(Array.from({ length: 20 }, (_, i) => {
          const v = data[Math.floor(i * data.length / 20)] / 255
          return Math.max(8, v * 80 + 8)
        }))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setWaveform(Array(20).fill(20))
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await process(blob)
      }
      mr.start(500)
      setState('recording')
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
      setState('error')
    }
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
    setState('processing')
  }, [])

  const process = useCallback(async (blob: Blob) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const customKey = getSafeLocalStorage('user_gemini_api_key')
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: fd,
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Processing failed')
      const data = await res.json()
      setTranscript(data.transcript ?? '')
      setExtracted(data.activities ?? [])
      setState('complete')
      analyticsTracker.track('VOICE_LOGGING', {
        activityCount: data.activities?.length || 0,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setState('error')
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
    setExtracted([])
    setDuration(0)
    setError(null)
  }, [])

  return { state, transcript, extracted, duration, waveform, error, start, stop, reset }
}
