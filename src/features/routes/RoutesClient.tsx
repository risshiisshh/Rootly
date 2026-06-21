'use client'

import { useState, useEffect, useRef } from 'react'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { cn, formatEmissions } from '@/lib/utils'
import type { RouteOption } from '@/types/route'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ErrorState, EmptyState, SkeletonCard, SkeletonPulse } from '@/components/shared/StateFeedback'
import { getClientEnv } from '@/lib/env'


const MODE_ICONS: Record<string, string> = {
  car: 'directions_car',
  train: 'train',
  bus: 'directions_bus',
  ev: 'electric_car',
  bike: 'directions_bike',
  walk: 'directions_walk',
  flight: 'flight',
  motorcycle: 'motorcycle',
}

const MODE_COLORS: Record<string, string> = {
  car: 'text-error',
  train: 'text-primary',
  bus: 'text-secondary',
  ev: 'text-primary',
  bike: 'text-secondary',
  walk: 'text-secondary',
  flight: 'text-error',
  motorcycle: 'text-error',
}

function MapVisualizer({
  origin,
  destination,
  selectedMode,
  active,
  loading,
}: {
  origin: string
  destination: string
  selectedMode: string | null
  active: boolean
  loading: boolean
}) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  
  const googleMapInstanceRef = useRef<any>(null)
  const directionsRendererRef = useRef<any>(null)

  const leafletMapInstanceRef = useRef<any>(null)
  const leafletPolylineRef = useRef<any>(null)
  const leafletStartMarkerRef = useRef<any>(null)
  const leafletEndMarkerRef = useRef<any>(null)

  const mapsKey = getClientEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
  const isGoogleMapsEnabled = !!(mapsKey && mapsKey !== 'your_google_maps_api_key')

  // Load Google Maps API script
  useEffect(() => {
    if (!isGoogleMapsEnabled) return

    if ((window as any).google && (window as any).google.maps) {
      setMapLoaded(true)
      return
    }

    const scriptId = 'google-maps-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else {
      const handleLoad = () => setMapLoaded(true)
      script.addEventListener('load', handleLoad)
      return () => script.removeEventListener('load', handleLoad)
    }
  }, [isGoogleMapsEnabled, mapsKey])

  // Load Leaflet API script & CSS
  useEffect(() => {
    if (isGoogleMapsEnabled) return

    if ((window as any).L) {
      setLeafletLoaded(true)
      return
    }

    const cssId = 'leaflet-css'
    let cssLink = document.getElementById(cssId) as HTMLLinkElement
    if (!cssLink) {
      cssLink = document.createElement('link')
      cssLink.id = cssId
      cssLink.rel = 'stylesheet'
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(cssLink)
    }

    const jsId = 'leaflet-js'
    let jsScript = document.getElementById(jsId) as HTMLScriptElement
    if (!jsScript) {
      jsScript = document.createElement('script')
      jsScript.id = jsId
      jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      jsScript.async = true
      jsScript.defer = true
      jsScript.onload = () => setLeafletLoaded(true)
      document.head.appendChild(jsScript)
    } else {
      const handleLoad = () => setLeafletLoaded(true)
      jsScript.addEventListener('load', handleLoad)
      return () => jsScript.removeEventListener('load', handleLoad)
    }
  }, [isGoogleMapsEnabled])

  // Initialize Google Maps Map
  useEffect(() => {
    if (!isGoogleMapsEnabled || !mapLoaded || !mapRef.current) return

    const google = (window as any).google
    if (!google) return

    const darkThemeStyle = [
      { elementType: 'geometry', stylers: [{ color: '#121412' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#121412' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#c0c9b9' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#91d883' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#c0c9b9' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#0d2410' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#91d883' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#1e201e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#292a28' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8a9385' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#292a28' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#333533' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0d2334' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8a9385' }]
      }
    ]

    const mapOptions = {
      center: { lat: 19.0760, lng: 72.8777 },
      zoom: 12,
      styles: darkThemeStyle,
      disableDefaultUI: true,
      zoomControl: false,
    }

    const map = new google.maps.Map(mapRef.current, mapOptions)
    googleMapInstanceRef.current = map

    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#91d883',
        strokeOpacity: 0.8,
        strokeWeight: 5,
      }
    })
    directionsRendererRef.current = directionsRenderer
  }, [mapLoaded, isGoogleMapsEnabled])

  // Update Google Maps Directions
  useEffect(() => {
    if (!isGoogleMapsEnabled) return
    const google = (window as any).google
    if (!google || !googleMapInstanceRef.current || !directionsRendererRef.current) return

    if (!active) {
      directionsRendererRef.current.setDirections({ routes: [] })
      googleMapInstanceRef.current.setCenter({ lat: 19.0760, lng: 72.8777 })
      googleMapInstanceRef.current.setZoom(12)
      return
    }

    const directionsService = new google.maps.DirectionsService()

    let travelMode = google.maps.TravelMode.DRIVING
    if (selectedMode === 'train' || selectedMode === 'bus') {
      travelMode = google.maps.TravelMode.TRANSIT
    } else if (selectedMode === 'bike') {
      travelMode = google.maps.TravelMode.BICYCLING
    } else if (selectedMode === 'walk') {
      travelMode = google.maps.TravelMode.WALKING
    }

    let routeStrokeColor = '#91d883'
    if (selectedMode === 'car' || selectedMode === 'flight' || selectedMode === 'motorcycle') {
      routeStrokeColor = '#ffb4ab'
    }

    directionsRendererRef.current.setOptions({
      polylineOptions: {
        strokeColor: routeStrokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 6,
      }
    })

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: travelMode,
      },
      (result: any, status: string) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result)
        } else {
          console.error('Directions request failed due to ' + status)
        }
      }
    )
  }, [origin, destination, selectedMode, active, mapLoaded, isGoogleMapsEnabled])

  // Initialize Leaflet Map
  useEffect(() => {
    if (isGoogleMapsEnabled || !leafletLoaded || !mapRef.current) return

    const L = (window as any).L
    if (!L) return

    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.remove()
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([20.5937, 78.9629], 5)

    leafletMapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)
  }, [leafletLoaded, isGoogleMapsEnabled])

  // Update Leaflet Route Overlay
  useEffect(() => {
    if (isGoogleMapsEnabled) return
    const L = (window as any).L
    if (!L || !leafletMapInstanceRef.current) return

    // Clear existing layers
    if (leafletPolylineRef.current) {
      leafletMapInstanceRef.current.removeLayer(leafletPolylineRef.current)
      leafletPolylineRef.current = null
    }
    if (leafletStartMarkerRef.current) {
      leafletMapInstanceRef.current.removeLayer(leafletStartMarkerRef.current)
      leafletStartMarkerRef.current = null
    }
    if (leafletEndMarkerRef.current) {
      leafletMapInstanceRef.current.removeLayer(leafletEndMarkerRef.current)
      leafletEndMarkerRef.current = null
    }

    if (!active) {
      leafletMapInstanceRef.current.setView([20.5937, 78.9629], 5)
      return
    }

    // Resolve coordinates using simple geocoder mapper
    const getCoords = (name: string, fallback: [number, number]): [number, number] => {
      const norm = name.toLowerCase()
      if (norm.includes('mumbai') || norm.includes('bombay')) {
        return [19.0760, 72.8777]
      }
      if (norm.includes('pune')) {
        return [18.5204, 73.8567]
      }
      if (norm.includes('delhi')) {
        return [28.6139, 77.2090]
      }
      if (norm.includes('bangalore') || norm.includes('bengaluru')) {
        return [12.9716, 77.5946]
      }
      if (norm.includes('chennai') || norm.includes('madras')) {
        return [13.0827, 80.2707]
      }
      if (norm.includes('hyderabad')) {
        return [17.3850, 78.4867]
      }
      if (norm.includes('kolkata') || norm.includes('calcutta')) {
        return [22.5726, 88.3639]
      }
      if (norm.includes('ahmedabad')) {
        return [23.0225, 72.5714]
      }
      if (norm.includes('jaipur')) {
        return [26.9124, 75.7873]
      }
      if (norm.includes('silicon valley') || norm.includes('san jose') || norm.includes('mountain view') || norm.includes('cupertino')) {
        return [37.3861, -122.0839]
      }
      if (norm.includes('san francisco') || norm.includes('sf')) {
        return [37.7749, -122.4194]
      }
      if (norm.includes('oakland')) {
        return [37.8044, -122.2712]
      }
      if (norm.includes('berkeley')) {
        return [37.8715, -122.2730]
      }
      if (norm.includes('new york') || norm.includes('ny') || norm.includes('manhattan')) {
        return [40.7128, -74.0060]
      }
      if (norm.includes('brooklyn')) {
        return [40.6782, -73.9442]
      }
      if (norm.includes('london')) {
        return [51.5074, -0.1278]
      }
      if (norm.includes('paris')) {
        return [48.8566, 2.3522]
      }
      return fallback
    }

    const startCoords = getCoords(origin, [19.0760, 72.8777])
    const endCoords = getCoords(destination, [18.5204, 73.8567])

    // Generate curve points for premium viz
    const generateCurvePoints = (start: [number, number], end: [number, number]): [number, number][] => {
      const points: [number, number][] = []
      const steps = 30
      const midLat = (start[0] + end[0]) / 2
      const midLng = (start[1] + end[1]) / 2
      const diffLat = end[0] - start[0]
      const diffLng = end[1] - start[1]
      const offsetLat = -diffLng * 0.15
      const offsetLng = diffLat * 0.15
      const control: [number, number] = [midLat + offsetLat, midLng + offsetLng]

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * control[0] + t * t * end[0]
        const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * control[1] + t * t * end[1]
        points.push([lat, lng])
      }
      return points
    }

    const curvePoints = generateCurvePoints(startCoords, endCoords)

    // Markers
    const startMarker = L.circleMarker(startCoords, {
      radius: 8,
      fillColor: '#91d883',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(leafletMapInstanceRef.current).bindPopup(`<b>Origin:</b> ${origin}`).openPopup()

    const endMarker = L.circleMarker(endCoords, {
      radius: 8,
      fillColor: '#ffb4ab',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(leafletMapInstanceRef.current).bindPopup(`<b>Destination:</b> ${destination}`)

    // Draw route line
    const routeStrokeColor = (selectedMode === 'car' || selectedMode === 'flight' || selectedMode === 'motorcycle') ? '#ffb4ab' : '#91d883'
    const polyline = L.polyline(curvePoints, {
      color: routeStrokeColor,
      weight: 5,
      opacity: 0.85,
    }).addTo(leafletMapInstanceRef.current)

    leafletStartMarkerRef.current = startMarker
    leafletEndMarkerRef.current = endMarker
    leafletPolylineRef.current = polyline

    leafletMapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] })
  }, [origin, destination, selectedMode, active, leafletLoaded, isGoogleMapsEnabled])

  const handleZoomIn = () => {
    if (isGoogleMapsEnabled) {
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() + 1)
      }
    } else {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.zoomIn()
      }
    }
  }

  const handleZoomOut = () => {
    if (isGoogleMapsEnabled) {
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() - 1)
      }
    } else {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.zoomOut()
      }
    }
  }

  return (
    <GlassCard className="p-0 h-[320px] relative overflow-hidden flex flex-col justify-between border border-white/[0.08]" hover={false}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes routeFlow {
          from { stroke-dashoffset: 240; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes mapPulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}} />

      {/* Map Header / Search Bar Chrome */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg text-[11px] text-on-surface max-w-[280px]">
          <span className="material-symbols-outlined text-primary text-[14px]">search</span>
          <span className="font-hanken font-medium truncate">
            {active ? `${origin} to ${destination}` : 'Search / Compare Route'}
          </span>
        </div>

        {/* Layer & Map Options Button */}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-background/95 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg animate-fade-in pointer-events-auto">
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">layers</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-background/95 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg animate-fade-in pointer-events-auto">
            <span className="material-symbols-outlined text-primary text-[16px]">explore</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full z-0 bg-[#0c0e0c]" />

      {/* Map Shimmer Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1001] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 pointer-events-none">
          <SkeletonPulse className="w-14 h-14 rounded-full shrink-0" />
          <div className="space-y-2 text-center w-2/3 max-w-xs">
            <SkeletonPulse className="h-4 w-full rounded" />
            <SkeletonPulse className="h-3 w-5/6 rounded mx-auto" />
          </div>
        </div>
      )}

      {/* Compass and Zoom UI Widgets on Right */}
      <div className="absolute right-3 top-24 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-background/95 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-on-surface hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-background/95 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-on-surface hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
      </div>

      {/* Map Scale indicator (Bottom Left) */}
      <div className="absolute left-3 bottom-3 z-[1000] flex items-end gap-1.5 pointer-events-none">
        <div className="bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 flex flex-col gap-0.5 text-on-surface font-mono text-[9px] shadow-lg">
          <div className="h-1 w-12 border-l border-r border-b border-on-surface" />
          <span className="text-on-surface">2 km</span>
        </div>
      </div>

      {/* Telemetry and Google/Leaflet Copyright Banner (Bottom) */}
      <div className="relative z-[1000] w-full flex justify-between items-center px-3 py-2 bg-gradient-to-t from-[#0c0e0c]/90 to-transparent pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/5 text-[9px] font-mono text-primary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>{loading ? 'CALCULATING...' : active ? (isGoogleMapsEnabled ? 'GPS_LOCK // LIVE_GOOGLE_MAPS' : 'GPS_LOCK // LIVE_OPENSTREETMAP') : 'STANDBY // MAPPING_READY'}</span>
        </div>
        
        <span className="text-[9px] font-sans text-outline/50 select-none">
          {isGoogleMapsEnabled ? 'Map data ©2026 Google' : 'Map data © OpenStreetMap'}
        </span>
      </div>
    </GlassCard>
  )
}

export function RoutesClient() {
  const isOnline = useOnlineStatus()
  const [origin, setOrigin] = useState('Mumbai, MH')
  const [destination, setDestination] = useState('Pune, MH')
  const [options, setOptions] = useState<RouteOption[]>([])
  const [aiReasoning, setAiReasoning] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<string | null>(null)

  const handleCompare = async (startVal?: string, endVal?: string) => {
    const oVal = startVal ?? origin
    const dVal = endVal ?? destination
    if (!oVal.trim() || !dVal.trim()) return
    setIsLoading(true)
    setError(null)
    setOptions([])
    setAiReasoning('')
    try {
      let token = 'demo-token'
      if (isFirebaseConfigured && auth.currentUser) {
        try { token = await auth.currentUser.getIdToken() } catch { token = 'demo-token' }
      }
      const customKey = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('user_gemini_api_key') : null
      const res = await fetch('/api/routes/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({ origin: oVal, destination: dVal }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error ?? 'Route comparison failed')
      }
      const data = await res.json()
      setOptions(data.comparison.options)
      setAiReasoning(data.comparison.aiReasoning)
      setSelectedMode(data.comparison.recommendedMode)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compare routes')
    } finally {
      setIsLoading(false)
    }
  }

  const recommendedOption = options.find((o) => o.isRecommended)
  const carOption = options.find((o) => o.mode === 'car')

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
      <DotGrid className="opacity-40" />

      {/* Header */}
      <div className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
          Route Intelligence // Kinetic Cartographer
        </p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Route <span className="text-primary">Comparison</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">
          Compare transport modes by CO₂. AI recommends the greenest path.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard className="p-6" hover={false}>
            <h2 className="font-geist font-semibold text-on-surface mb-6">Plan Your Route</h2>
            
            <div className="flex gap-4">
              {/* Visual connector */}
              <div className="flex flex-col items-center pt-8 gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">trip_origin</span>
                <div className="w-px h-10 border-l border-dashed border-outline-variant" />
                <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">location_on</span>
              </div>

              <div className="flex-1 space-y-4">
                <div className="relative">
                  <label htmlFor="origin" className="absolute -top-2.5 left-3 bg-surface-container px-1 font-geist text-[10px] text-primary uppercase tracking-widest">
                    Origin
                  </label>
                  <input
                    id="origin"
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    disabled={!isOnline}
                    className="w-full recessed-input rounded-lg px-3 py-3 font-hanken text-on-surface text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Starting point..."
                  />
                </div>
                <div className="relative">
                  <label htmlFor="destination" className="absolute -top-2.5 left-3 bg-surface-container px-1 font-geist text-[10px] text-primary uppercase tracking-widest">
                    Destination
                  </label>
                  <input
                    id="destination"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={!isOnline}
                    className="w-full recessed-input rounded-lg px-3 py-3 font-hanken text-on-surface text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Destination..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCompare()}
              disabled={isLoading || !origin.trim() || !destination.trim() || !isOnline}
              className={cn(
                'w-full mt-6 py-3 rounded-full font-geist font-bold text-sm uppercase tracking-wide',
                isOnline ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed',
                'hover:opacity-90 active:scale-[0.98] transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" aria-hidden="true" />
                  Calculating...
                </>
              ) : !isOnline ? (
                <>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi_off</span>
                  Offline Mode Active
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">route</span>
                  Compare Routes
                </>
              )}
            </button>

            {!isOnline && (
              <div className="mt-4 p-3.5 rounded-xl bg-error-container/10 border border-error/20 flex items-start gap-2.5" role="alert">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0" aria-hidden="true">wifi_off</span>
                <div className="space-y-1">
                  <p className="font-geist text-xs font-bold text-on-surface uppercase tracking-wide">Route Comparison Offline</p>
                  <p className="font-hanken text-on-surface-variant text-[11px] leading-relaxed">
                    Offline route calculations are unavailable. Please reconnect to compare transit modes and estimate emissions.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 rounded-lg bg-error-container/20 border border-error/30 flex items-start gap-2" role="alert">
                <span className="material-symbols-outlined text-error text-[16px] shrink-0" aria-hidden="true">error</span>
                <p className="font-hanken text-error text-xs">{error}</p>
              </div>
            )}
          </GlassCard>

          {/* AI Reasoning */}
          {aiReasoning && (
            <GlassCard variant="primary" className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">auto_awesome</span>
                <h3 className="font-geist text-[11px] text-primary uppercase tracking-widest">AI Recommendation</h3>
              </div>
              <p className="font-hanken text-on-surface-variant text-sm leading-relaxed">{aiReasoning}</p>
            </GlassCard>
          )}

          {recommendedOption && (
            <GlassCard variant="primary" className="p-6 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/20 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <span className="inline-block px-3 py-1 bg-primary text-on-primary rounded-full font-geist text-[11px] font-bold uppercase tracking-tight mb-3">
                  Recommended
                </span>
                <h3 className="font-geist font-bold text-on-primary-container text-xl capitalize">{recommendedOption.mode}</h3>
                <div className="flex items-center gap-6 mt-4">
                  <div>
                    <p className="font-geist text-[10px] text-on-surface-variant uppercase">Time</p>
                    <p className="font-geist font-bold text-on-surface text-lg">{recommendedOption.durationMinutes}min</p>
                  </div>
                  <div className="w-px h-8 bg-outline-variant" aria-hidden="true" />
                  <div>
                    <p className="font-geist text-[10px] text-on-surface-variant uppercase">CO₂</p>
                    <p className="font-geist font-bold text-primary text-lg">{formatEmissions(recommendedOption.emissionsKg)}</p>
                  </div>
                </div>
                {recommendedOption.savingsVsCar && recommendedOption.savingsVsCar > 0 && (
                  <div className="mt-4 bg-primary/10 border border-primary/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">eco</span>
                      <span>Save {formatEmissions(recommendedOption.savingsVsCar)} vs car</span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Route comparison list */}
        <div className="lg:col-span-8 space-y-4">
          {/* Animated GPS Map Visualizer */}
          <MapVisualizer
            origin={origin}
            destination={destination}
            selectedMode={selectedMode}
            active={options.length > 0}
            loading={isLoading}
          />

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-5 flex items-center gap-4 pointer-events-none">
                  <SkeletonPulse className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonPulse className="h-4 w-1/3" />
                    <SkeletonPulse className="h-3 w-1/2" />
                  </div>
                  <SkeletonPulse className="w-16 h-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Comparison Failed"
              message={error}
              onRetry={() => handleCompare()}
              retryLabel="Retry Comparison"
            />
          ) : options.length === 0 ? (
            <EmptyState
              icon="map"
              title="Compare Route Emissions"
              description="Plan your daily commute or next journey. We'll analyze multiple transport modes to find the fastest and most eco-friendly route."
              steps={[
                {
                  icon: 'pin_drop',
                  title: 'Set Locations',
                  description: 'Enter your starting point and destination in the planning panel.',
                },
                {
                  icon: 'co2',
                  title: 'Analyze Impact',
                  description: 'Compare transit, EV, flight, walking, and biking CO₂ footprint.',
                },
                {
                  icon: 'eco',
                  title: 'Save Carbon',
                  description: 'Receive AI recommendations to minimize your travel impact.',
                },
              ]}
              action={isOnline ? {
                label: 'Run Demo Comparison',
                icon: 'play_arrow',
                onClick: () => {
                  setOrigin('Mumbai, MH')
                  setDestination('Pune, MH')
                  handleCompare('Mumbai, MH', 'Pune, MH')
                }
              } : undefined}
            />
          ) : (
            <ul className="space-y-3" aria-label="Route options sorted by emissions">
              {options.map((option) => (
                <li key={option.mode}>
                  <button
                    onClick={() => setSelectedMode(option.mode)}
                    className={cn(
                      'w-full glass-card p-5 rounded-lg flex items-center gap-4 text-left',
                      'border-l-4 transition-all hover:scale-[1.01] active:scale-[0.99]',
                      selectedMode === option.mode && option.isRecommended
                        ? 'border-l-primary'
                        : selectedMode === option.mode
                        ? 'border-l-outline'
                        : option.isRecommended
                        ? 'border-l-primary/50'
                        : 'border-l-transparent',
                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                    aria-pressed={selectedMode === option.mode}
                    aria-label={`${option.mode}: ${option.durationMinutes} minutes, ${formatEmissions(option.emissionsKg)} CO2${option.isRecommended ? ', recommended' : ''}`}
                  >
                    {/* Mode icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shrink-0',
                    )}>
                      <span
                         className={cn('material-symbols-outlined text-xl', MODE_COLORS[option.mode] ?? 'text-on-surface-variant')}
                        aria-hidden="true"
                      >
                        {MODE_ICONS[option.mode] ?? 'commute'}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                      <div>
                        <p className="font-geist font-bold text-on-surface capitalize">{option.mode}</p>
                        {option.isRecommended && (
                          <span className="font-geist text-[10px] text-primary uppercase tracking-wider">★ Recommended</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-geist text-[10px] text-on-surface-variant uppercase mb-0.5">Time</p>
                        <p className="font-geist font-bold text-on-surface">{option.durationMinutes}m</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[10px] text-on-surface-variant uppercase mb-0.5">CO₂</p>
                      <p className={cn(
                        'font-geist font-bold',
                        option.emissionsKg === 0 ? 'text-primary'
                          : option.emissionsKg < 5 ? 'text-secondary'
                          : option.emissionsKg < 20 ? 'text-tertiary'
                          : 'text-error'
                      )}>
                        {formatEmissions(option.emissionsKg)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Live traffic indicator */}
          {options.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2.5 glass-card rounded-full w-fit">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                <span className="font-geist text-on-surface-variant text-[11px]">Live Traffic Active</span>
              </div>
              <div className="w-px h-4 bg-outline-variant" aria-hidden="true" />
              <span className="font-geist text-on-surface-variant text-[11px]">Updated just now</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
