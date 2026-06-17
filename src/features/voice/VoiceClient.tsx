'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import { createVoiceLog, getUserVoiceLogs, createActivity } from '@/services/firestore'
import { useAuthStore } from '@/store/userStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ErrorState, SkeletonList } from '@/components/shared/StateFeedback'
import type { VoiceLog } from '@/types/activity'

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error'

export function VoiceClient() {
  const { userProfile } = useAuthStore()
  const isOnline = useOnlineStatus()
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [sessionDuration, setSessionDuration] = useState(0)
  const [extractedActivities, setExtractedActivities] = useState<{ category: string; activity: string; quantity: number; emission: number; description: string }[]>([])
  const [recentLogs, setRecentLogs] = useState<VoiceLog[]>([])
  const [waveformHeights, setWaveformHeights] = useState<number[]>(Array(20).fill(20))
  const [error, setError] = useState<string | null>(null)
  const [isMicBlocked, setIsMicBlocked] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)

  // Track session details for potential retry
  const [retrySession, setRetrySession] = useState<{ blob: Blob; duration: number; localTranscript: string } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveformRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const recognitionRef = useRef<any>(null)

  // Load recent logs
  useEffect(() => {
    if (!userProfile) return
    setIsLoadingLogs(true)
    getUserVoiceLogs(userProfile.uid, 5)
      .then(setRecentLogs)
      .catch(console.error)
      .finally(() => setIsLoadingLogs(false))
  }, [userProfile])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (waveformRef.current) clearInterval(waveformRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  const processAudio = async (blob: Blob, duration: number, localTranscript?: string) => {
    if (!userProfile) return
    setError(null)
    setRecordingState('processing')
    setUploadProgress(0)
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Recording stopped. Processing audio footprint...'
    }
    
    // Simulate upload/processing progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 150)

    try {
      let token = 'demo-token'
      if (isFirebaseConfigured && auth.currentUser) {
        try { token = await auth.currentUser.getIdToken() } catch { token = 'demo-token' }
      }
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      if (localTranscript) {
        formData.append('transcript', localTranscript)
      }

      const customKey = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('user_gemini_api_key') : null
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Processing failed')
      }

      const data = await res.json()
      clearInterval(progressInterval)
      setUploadProgress(100)
      setTranscript(data.transcript ?? localTranscript ?? '')
      setExtractedActivities(data.activities ?? [])
      setFeedback(data.feedback ?? '')

      // Save voice log to Firestore
      await createVoiceLog(userProfile.uid, {
        transcript: data.transcript ?? localTranscript ?? '',
        extractedActivities: (data.activities ?? []).map((a: any) => ({
          category: a.category,
          activity: a.activity,
          quantity: a.quantity,
          emission: a.emission,
          description: a.description,
          source: 'voice' as const,
        })),
        audioLengthSeconds: duration,
        processingStatus: 'complete',
        feedback: data.feedback ?? '',
      })

      setRecordingState('complete')
      setRetrySession(null)
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Voice analysis complete. Carbon activities extracted successfully.'
      }
      // Refresh logs
      setIsLoadingLogs(true)
      const logs = await getUserVoiceLogs(userProfile.uid, 5)
      setRecentLogs(logs)
    } catch (err: unknown) {
      clearInterval(progressInterval)
      setUploadProgress(0)
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setError(msg)
      setRecordingState('error')
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Voice processing failed: ${msg}`
      }
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const handleRetryProcessing = useCallback(async () => {
    if (!retrySession) return
    await processAudio(retrySession.blob, retrySession.duration, retrySession.localTranscript)
  }, [retrySession, userProfile])

  const startRecording = useCallback(async () => {
    setError(null)
    setIsMicBlocked(false)
    setTranscript('')
    setExtractedActivities([])
    setFeedback('')
    setSessionDuration(0)
    setRetrySession(null)
    audioChunksRef.current = []
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Recording started. Speak naturally to describe your activity.'
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      // Waveform visualization with AnalyserNode
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyzer = audioCtx.createAnalyser()
      analyzer.fftSize = 64
      source.connect(analyzer)
      analyzerRef.current = analyzer

      const updateWaveform = () => {
        if (!analyzerRef.current) return
        const data = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(data)
        const heights = Array.from({ length: 20 }, (_, i) => {
          const v = data[Math.floor(i * data.length / 20)] / 255
          return Math.max(8, v * 80 + 8)
        })
        setWaveformHeights(heights)
        animFrameRef.current = requestAnimationFrame(updateWaveform)
      }
      updateWaveform()

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setWaveformHeights(Array(20).fill(20))

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Retrieve final transcript state at stop time
        const finalTranscript = (window as any)._lastTranscript || ''
        setRetrySession({ blob, duration: sessionDuration, localTranscript: finalTranscript })
        await processAudio(blob, sessionDuration, finalTranscript)
      }

      // Initialize Web Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        ;(window as any)._lastTranscript = ''

        recognition.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript
          }
          if (currentTranscript.trim()) {
            setTranscript(currentTranscript)
            ;(window as any)._lastTranscript = currentTranscript
          }
        }

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error)
        }

        recognition.start()
        recognitionRef.current = recognition
      }

      mediaRecorder.start(500) // collect data every 500ms
      setRecordingState('recording')

      // Timer
      timerRef.current = setInterval(() => {
        setSessionDuration((d) => d + 1)
      }, 1000)
    } catch (err: unknown) {
      console.error('Mic access error:', err)
      let msg = 'Microphone access denied'
      let isBlocked = false
      if (err instanceof Error) {
        msg = err.message
        if (
          err.name === 'NotAllowedError' || 
          err.name === 'PermissionDeniedError' || 
          err.name === 'SecurityError' ||
          err.message.includes('Permission') ||
          err.message.includes('denied')
        ) {
          isBlocked = true
        }
      }
      setError(msg)
      setRecordingState('error')
      setIsMicBlocked(isBlocked)
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Microphone access failed: ${msg}`
      }
    }
  }, [sessionDuration, userProfile])

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    mediaRecorderRef.current?.stop()
    setRecordingState('processing')
  }, [])

  const saveExtractedActivities = async () => {
    if (!userProfile || extractedActivities.length === 0) return
    try {
      await Promise.all(
        extractedActivities.map((a) =>
          createActivity(userProfile.uid, {
            category: a.category as 'transport' | 'food' | 'energy' | 'lifestyle' | 'other',
            activity: a.activity,
            quantity: a.quantity,
            emission: a.emission,
            description: a.description,
          })
        )
      )
      setRecordingState('idle')
      setTranscript('')
      setExtractedActivities([])
      setFeedback('')
      // Refresh logs
      setIsLoadingLogs(true)
      const logs = await getUserVoiceLogs(userProfile.uid, 5)
      setRecentLogs(logs)
    } catch (err) {
      console.error('Failed to save activities:', err)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-6xl mx-auto">
      <DotGrid className="opacity-40" />

      {/* Live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Header */}
      <div className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
          Voice Intelligence // Acoustic Command
        </p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Voice <span className="text-primary">Logging</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">
          Speak naturally. AI extracts and quantifies your carbon activities in real-time.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main recording area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recording control */}
          <GlassCard className="p-8 flex items-center justify-between" hover={false}>
            <div className="flex items-center gap-6">
              {/* Mic button */}
              <button
                onClick={recordingState === 'recording' ? stopRecording : startRecording}
                disabled={recordingState === 'processing' || !isOnline}
                className={cn(
                  'relative w-16 h-16 rounded-full flex items-center justify-center transition-all',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  recordingState === 'recording'
                    ? 'bg-error recording-active'
                    : recordingState === 'processing'
                    ? 'bg-surface-container-high cursor-not-allowed'
                    : !isOnline
                    ? 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed'
                    : 'bg-primary-container mic-glow hover:bg-primary/20 active:scale-95'
                )}
                aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start recording'}
                aria-pressed={recordingState === 'recording'}
              >
                {recordingState === 'processing' ? (
                  <span className="w-6 h-6 border-2 border-on-surface-variant/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                ) : (
                  <span
                    className="material-symbols-outlined text-primary text-2xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                    aria-hidden="true"
                  >
                    {recordingState === 'recording' ? 'stop' : 'mic'}
                  </span>
                )}
                {recordingState === 'recording' && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error rounded-full border-2 border-background animate-pulse" aria-hidden="true" />
                )}
              </button>

              <div>
                <h2 className="font-geist font-medium text-on-surface text-xl">
                  {recordingState === 'idle' && 'Ready to record'}
                  {recordingState === 'recording' && 'Listening...'}
                  {recordingState === 'processing' && 'Processing audio...'}
                  {recordingState === 'complete' && 'Analysis complete'}
                  {recordingState === 'error' && 'Recording failed'}
                </h2>
                <p className="font-geist text-outline text-sm">
                  {recordingState === 'recording'
                    ? 'Active Session: Carbon Audit Recording'
                    : recordingState === 'processing'
                    ? 'Neural acoustic engine analyzing...'
                    : 'Tap the mic to start your session'}
                </p>
              </div>
            </div>

            {/* Waveform + timer */}
            <div className="flex items-center gap-4">
              {recordingState === 'recording' && (
                <>
                  <div className="flex items-end gap-[2px] h-10" aria-hidden="true">
                    {waveformHeights.map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-primary transition-all duration-75"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <span className="font-geist font-mono text-primary text-sm" aria-label={`Recording duration: ${formatDuration(sessionDuration)}`}>
                    {formatDuration(sessionDuration)}
                  </span>
                </>
              )}
            </div>
          </GlassCard>

          {!isOnline && (
            <div className="p-4 rounded-xl bg-error-container/10 border border-error/20 flex items-start gap-3 my-4" role="alert">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0" aria-hidden="true">wifi_off</span>
              <div className="space-y-1">
                <p className="font-geist text-xs font-bold text-on-surface uppercase tracking-wide">Voice Transcriber Offline</p>
                <p className="font-hanken text-on-surface-variant text-[11px] leading-relaxed">
                  Voice logging and AI audio feature extraction require an active network connection. Please reconnect to transcribe new carbon activities.
                </p>
              </div>
            </div>
          )}

          {/* Transcript board */}
          {(transcript || recordingState === 'recording' || recordingState === 'processing') && (
            <GlassCard className="p-8 min-h-[200px]" hover={false}>
              <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest mb-6">Live Transcription</h3>
              {recordingState === 'recording' && !transcript && (
                <p className="font-geist text-on-surface-variant text-lg animate-pulse">Speak now... I&apos;m listening</p>
              )}
              {transcript && (
                <p className="font-geist text-on-surface text-xl leading-relaxed">{transcript}</p>
              )}
              {recordingState === 'processing' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-geist text-sm text-primary uppercase tracking-widest animate-pulse">
                        Analyzing audio footprint...
                      </span>
                      <span className="font-geist font-mono text-sm text-primary font-bold">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Upload and audio processing progress"
                      className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden border border-white/5"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[80, 60, 90].map((w, i) => (
                      <div key={i} className="h-3 bg-surface-container-high rounded animate-pulse" style={{ width: `${w}%` }} aria-hidden="true" />
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* AI Feedback */}
          {feedback && (
            <GlassCard variant="primary" className="p-8" hover={false}>
              <h3 className="font-geist text-[11px] text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">psychology</span>
                Personalized AI Feedback
              </h3>
              <p className="font-hanken text-on-surface text-lg leading-relaxed italic">
                &ldquo;{feedback}&rdquo;
              </p>
            </GlassCard>
          )}

          {/* Extracted activities */}
          {extractedActivities.length > 0 && (
            <GlassCard variant="primary" className="p-8" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-geist text-[11px] text-primary uppercase tracking-widest">Identified Activities</h3>
                <button
                  onClick={saveExtractedActivities}
                  className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-full font-geist text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
                  Save All ({extractedActivities.length})
                </button>
              </div>
              <div className="space-y-3">
                {extractedActivities.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container/50 rounded-lg border border-outline-variant/10">
                    <div>
                      <p className="font-geist font-medium text-on-surface">{a.description || a.activity}</p>
                      <p className="font-hanken text-on-surface-variant text-sm capitalize">{a.category}</p>
                    </div>
                    <span className="font-geist font-bold text-primary">{a.emission.toFixed(2)} kg CO₂</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Error state */}
          {error && (
            <div className="space-y-4 my-4">
              <ErrorState
                title={isMicBlocked ? 'Microphone Permission Blocked' : 'Voice Processing Error'}
                message={isMicBlocked 
                  ? 'Rootly requires microphone permission to record and transcribe. Please grant browser access to your microphone and reload.' 
                  : error
                }
                onRetry={retrySession && !isMicBlocked ? handleRetryProcessing : undefined}
                retryLabel={retrySession && !isMicBlocked ? 'Re-upload & Retry Analysis' : undefined}
              />
              {isMicBlocked && (
                <div className="glass-card p-5 border-outline-variant/20 bg-surface-container-low/40 rounded-xl space-y-3">
                  <p className="font-geist text-[10px] text-primary font-bold uppercase tracking-widest border-b border-outline-variant/15 pb-2">
                    How to Enable Microphone Access
                  </p>
                  <ul className="space-y-2.5 font-hanken text-xs text-on-surface-variant leading-relaxed">
                    <li className="flex gap-2">
                      <span className="font-mono text-primary font-bold">1.</span>
                      <span>Click the <b>Lock icon</b> (🔒) or <b>settings toggle</b> on the left side of your browser's address bar.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-primary font-bold">2.</span>
                      <span>Find the <b>Microphone</b> setting and change it from "Block" to <b>"Allow"</b>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-primary font-bold">3.</span>
                      <span>Reload this page and try recording again.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Technical telemetry */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest">Session Telemetry</h3>
            {[
              { label: 'Sample Rate', value: '192 kHz' },
              { label: 'Latency', value: '< 2ms' },
              { label: 'Codec', value: 'WebM/Opus' },
              { label: 'AI Engine', value: 'Claude Sonnet' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-outline-variant/10 pb-3 last:border-0 last:pb-0">
                <span className="font-geist text-outline text-sm">{item.label}</span>
                <span className="font-geist font-medium text-on-surface text-sm">{item.value}</span>
              </div>
            ))}
          </GlassCard>

          {/* Recent logs */}
          <GlassCard className="p-6">
            <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest mb-4">Recent Voice Logs</h3>
            {isLoadingLogs ? (
              <SkeletonList count={3} />
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-6 px-4 space-y-3">
                <span className="material-symbols-outlined text-outline/40 text-3xl" aria-hidden="true">mic_none</span>
                <p className="font-geist font-medium text-on-surface text-xs">No Voice Logs Found</p>
                <p className="font-hanken text-on-surface-variant text-[11px] leading-relaxed">
                  Your recorded sessions will appear here with automated category and CO₂ emission breakdowns.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline" aria-hidden="true">description</span>
                      <div>
                        <p className="font-geist font-medium text-on-surface text-sm line-clamp-1">
                          {log.transcript?.slice(0, 40) ?? 'Voice session'}...
                        </p>
                        <p className="font-geist text-outline text-xs">
                          {log.createdAt?.toDate ? formatRelativeTime(log.createdAt.toDate()) : ''} · {log.audioLengthSeconds}s
                        </p>
                      </div>
                    </div>
                    {log.extractedActivities?.length > 0 && (
                      <span className="px-2 py-0.5 bg-secondary-container text-secondary rounded text-[10px] font-geist font-bold uppercase shrink-0">
                        {log.extractedActivities.length} items
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
