import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Dumbbell, ExternalLink, Footprints, Gauge, Heart, MessageCircle, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Waves, X } from 'lucide-react'
import './App.css'

type Workout = { id: string; date: string; activity: string; focusAreas?: string[]; minutes: number; calories?: number; effort: number; note: string }
type CheckIn = { date: string; sleep: number; energy: number; soreness: number }
type Experience = 'new' | 'experienced'
type GoalType = 'finish' | 'consistency' | 'time'
type PlanResponse = 'moved' | 'rest' | 'skip' | 'done'
type SocialSourceId = 'reddit' | 'x' | 'instagram' | 'youtube' | 'official'
type SocialPost = { id: string; title: string; url: string; published: string; author: string; summary: string; source: string }
type PulseResult = { requestKey: string; posts: SocialPost[]; error: string }
type RaceEvent = { name: string; startDate: string; endDate: string; url: string }
type AppData = { eventName: string; eventDate: string; goal: string; workouts: Workout[]; checkIns: CheckIn[]; demo: boolean; experience: Experience | null; goalType: GoalType; weeklyTarget: number; plannedDays: number[]; rescheduledDates: string[]; planResponses: Record<string, PlanResponse> }

const STORAGE_KEY = 'hyrox-ready-data-v1'
const activities = ['Run', 'SkiErg', 'Sled push', 'Sled pull', 'Burpee broad jumps', 'Row', 'Farmers carry', 'Sandbag lunges', 'Wall balls', 'Multi-station session', 'Strength', 'Race simulation', 'Other activity']
const stations = ['SkiErg', 'Sled push', 'Sled pull', 'Burpee broad jumps', 'Row', 'Farmers carry', 'Sandbag lunges', 'Wall balls']
const stationDescriptions: Record<string, string> = {
  SkiErg: 'Build a steady rhythm on the ski-pulling machine.',
  'Sled push': 'Drive a weighted sled across the floor.',
  'Sled pull': 'Pull a weighted sled toward you with a rope.',
  'Burpee broad jumps': 'Burpee, then jump forward at a repeatable pace.',
  Row: 'Settle into a controlled rowing rhythm.',
  'Farmers carry': 'Walk while carrying a weight in each hand.',
  'Sandbag lunges': 'Lunge forward while carrying a sandbag.',
  'Wall balls': 'Throw a ball to a target in manageable sets.',
}
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const officialUpcomingRaces: RaceEvent[] = [
  { name: 'MyFitnessPal HYROX Tampa', startDate: '2026-10-22', endDate: '2026-10-25', url: 'https://hyrox.com/event/hyrox-tampa/' },
  { name: 'HYROX Abu Dhabi', startDate: '2026-10-23', endDate: '2026-10-25', url: 'https://hyrox.com/event/hyrox-abu-dhabi/' },
  { name: 'HYROX Birmingham', startDate: '2026-10-27', endDate: '2026-11-01', url: 'https://hyrox.com/event/hyrox-birmingham/' },
  { name: 'Intersport HYROX Hamburg', startDate: '2026-10-28', endDate: '2026-11-01', url: 'https://hyrox.com/event/intersport-hyrox-hamburg/' },
  { name: 'Trainsweateat HYROX Nice', startDate: '2026-10-29', endDate: '2026-11-01', url: 'https://hyrox.com/event/hyrox-nice-s26-27/' },
  { name: 'Sweatpals HYROX Miami Beach', startDate: '2027-03-26', endDate: '2027-03-28', url: 'https://hyrox.com/event/sweat-pals-hyrox-miami-beach-26-27/' },
]
const socialSources: Array<{ id: SocialSourceId; label: string; description: string; mark: string; url: (query: string) => string }> = [
  { id: 'reddit', label: 'Reddit', description: 'Athlete discussions and race-day advice', mark: 'r/', url: (query) => `https://www.reddit.com/search/?q=${encodeURIComponent(query)}` },
  { id: 'x', label: 'X', description: 'Live posts, event updates, and reactions', mark: '𝕏', url: (query) => `https://x.com/search?q=${encodeURIComponent(query)}` },
  { id: 'instagram', label: 'Instagram', description: 'Athlete clips and community moments', mark: '◎', url: () => 'https://www.instagram.com/explore/tags/hyrox/' },
  { id: 'youtube', label: 'YouTube', description: 'Race recaps, guides, and training videos', mark: '▶', url: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` },
  { id: 'official', label: 'HYROX official', description: 'Official events, announcements, and rules', mark: 'H', url: () => 'https://hyrox.com/' },
]

function dateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function makeDemoData(): AppData {
  return {
    eventName: 'Sweatpals HYROX Miami Beach', eventDate: '2027-03-26', goal: '1:45', demo: true, experience: null,
    goalType: 'time', weeklyTarget: 3, plannedDays: [], rescheduledDates: [], planResponses: {},
    workouts: [
      { id: 'demo-1', date: dateOffset(-1), activity: 'Run', minutes: 42, effort: 7, note: 'Tempo intervals, controlled finish' },
      { id: 'demo-2', date: dateOffset(-2), activity: 'Sled push', minutes: 24, effort: 8, note: 'Race-load practice' },
      { id: 'demo-3', date: dateOffset(-4), activity: 'SkiErg', minutes: 30, effort: 6, note: 'Steady aerobic' },
      { id: 'demo-4', date: dateOffset(-6), activity: 'Run', minutes: 55, effort: 6, note: 'Easy outside' },
      { id: 'demo-5', date: dateOffset(-8), activity: 'Farmers carry', minutes: 22, effort: 7, note: '' },
      { id: 'demo-6', date: dateOffset(-10), activity: 'Run', minutes: 38, effort: 8, note: 'Threshold intervals' },
      { id: 'demo-7', date: dateOffset(-12), activity: 'Row', minutes: 28, effort: 6, note: 'Technique + aerobic' },
      { id: 'demo-8', date: dateOffset(-14), activity: 'Sandbag lunges', minutes: 20, effort: 7, note: '' },
      { id: 'demo-9', date: dateOffset(-16), activity: 'Run', minutes: 48, effort: 6, note: 'Easy run' },
      { id: 'demo-10', date: dateOffset(-18), activity: 'Wall balls', minutes: 25, effort: 7, note: 'Sets of 20' },
      { id: 'demo-11', date: dateOffset(-20), activity: 'Race simulation', minutes: 65, effort: 8, note: 'Run + 4 stations' },
      { id: 'demo-12', date: dateOffset(-23), activity: 'Run', minutes: 40, effort: 6, note: '' },
      { id: 'demo-13', date: dateOffset(-25), activity: 'Sled pull', minutes: 20, effort: 7, note: '' },
    ],
    checkIns: [
      { date: dateOffset(-1), sleep: 7.5, energy: 7, soreness: 3 },
      { date: dateOffset(-2), sleep: 8, energy: 8, soreness: 2 },
      { date: dateOffset(-4), sleep: 6.5, energy: 6, soreness: 4 },
      { date: dateOffset(-6), sleep: 7, energy: 7, soreness: 3 },
    ],
  }
}

function makeBlankData(): AppData {
  return { ...makeDemoData(), workouts: [], checkIns: [], demo: false, goalType: 'finish' }
}

function readData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedData = JSON.parse(saved) as Partial<AppData>
      const oldMiamiPlaceholder = savedData.eventName === 'HYROX Miami' && (savedData.eventDate ?? '') < '2027-03-26'
      const initialData = {
        ...makeBlankData(),
        ...savedData,
        eventName: oldMiamiPlaceholder || typeof savedData.eventName !== 'string' || !savedData.eventName.trim() ? 'Sweatpals HYROX Miami Beach' : savedData.eventName,
        eventDate: oldMiamiPlaceholder ? '2027-03-26' : savedData.eventDate ?? '2027-03-26',
      }
      return savedData.demo ? { ...initialData, workouts: [], checkIns: [], demo: false } : initialData
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return makeBlankData()
}

function scoreWindow(workouts: Workout[], checkIns: CheckIn[], startDaysAgo: number, endDaysAgo: number, now: Date) {
  const inWindow = (date: string) => {
    const age = (now.getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000
    return age >= endDaysAgo && age < startDaysAgo
  }
  const recent = workouts.filter((workout) => inWindow(workout.date))
  const runMinutes = recent.filter((workout) => workout.activity === 'Run' || workout.activity === 'Race simulation').reduce((total, workout) => total + workout.minutes, 0)
  const coveredStations = new Set(recent.flatMap((workout) => [
    ...(workout.focusAreas ?? []),
    ...(stations.includes(workout.activity) ? [workout.activity] : []),
  ])).size
  const simulations = recent.filter((workout) => workout.activity === 'Race simulation').length
  const daysTrained = new Set(recent.map((workout) => workout.date)).size
  const recentCheckIns = checkIns.filter((checkIn) => inWindow(checkIn.date))
  const recovery = recentCheckIns.length
    ? recentCheckIns.reduce((sum, checkIn) => sum + (Math.min(checkIn.sleep / 8, 1) * 35 + checkIn.energy * 5 + (10 - checkIn.soreness) * 3), 0) / recentCheckIns.length
    : 55
  const factors = [
    { label: 'Run volume', value: Math.min(100, Math.round(runMinutes / 2.4)), weight: 25, detail: `${runMinutes} min logged` },
    { label: 'Station coverage', value: Math.round((coveredStations / stations.length) * 100), weight: 25, detail: `${coveredStations} of ${stations.length} stations` },
    { label: 'Race-specific work', value: Math.min(100, simulations * 35), weight: 20, detail: `${simulations} simulation${simulations === 1 ? '' : 's'}` },
    { label: 'Consistency', value: Math.min(100, Math.round((daysTrained / 12) * 100)), weight: 15, detail: `${daysTrained} training days` },
    { label: 'Recovery check-ins', value: Math.min(100, Math.round(recovery)), weight: 15, detail: `${recentCheckIns.length} check-in${recentCheckIns.length === 1 ? '' : 's'}` },
  ]
  return { factors, score: Math.round(factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0) / 100), recent }
}

function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRaceRange(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const year = endDate.getFullYear()
  return startMonth === endMonth
    ? `${startMonth} ${startDate.getDate()}–${endDate.getDate()}, ${year}`
    : `${startMonth} ${startDate.getDate()}–${endMonth} ${endDate.getDate()}, ${year}`
}

function effortDescription(effort: number) {
  if (effort <= 3) return 'Easy'
  if (effort <= 6) return 'Steady'
  if (effort <= 8) return 'Hard'
  return 'Very hard'
}

export default function Dashboard() {
  const [clock] = useState(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    return { now, weekStart }
  })
  const [data, setData] = useState<AppData>(readData)
  const [view, setView] = useState<'workouts' | 'overview' | 'training' | 'guide' | 'pulse' | 'progress' | 'settings'>('workouts')
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [pulseQuery, setPulseQuery] = useState('HYROX')
  const [pulseSearchDraft, setPulseSearchDraft] = useState('HYROX')
  const [pulseRefresh, setPulseRefresh] = useState(0)
  const [pulseResult, setPulseResult] = useState<PulseResult | null>(null)
  const pulseRequestKey = `${pulseQuery}:${pulseRefresh}`
  const pulseLoading = pulseResult?.requestKey !== pulseRequestKey
  const pulsePosts = pulseResult?.requestKey === pulseRequestKey ? pulseResult.posts : []
  const pulseError = pulseResult?.requestKey === pulseRequestKey ? pulseResult.error : ''
  const [dialog, setDialog] = useState<'workout' | 'checkin' | null>(null)
  const [coachText, setCoachText] = useState('')
  const [coachReply, setCoachReply] = useState('')
  const [coachBusy, setCoachBusy] = useState(false)
  const current = scoreWindow(data.workouts, data.checkIns, 28, 0, clock.now)
  const previous = scoreWindow(data.workouts, data.checkIns, 56, 28, clock.now)
  const daysToRace = Math.max(0, Math.ceil((new Date(`${data.eventDate}T12:00:00`).getTime() - clock.now.getTime()) / 86_400_000))
  const eventDateLabel = new Date(`${data.eventDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const thisWeek = data.workouts.filter((workout) => new Date(`${workout.date}T12:00:00`) >= clock.weekStart)
  const weeklyMinutes = thisWeek.reduce((sum, workout) => sum + workout.minutes, 0)
  const weeklyCalories = thisWeek.reduce((sum, workout) => sum + (workout.calories ?? 0), 0)
  const calorieEntries = thisWeek.filter((workout) => workout.calories !== undefined).length
  const weeklyTypes = [...new Set(thisWeek.flatMap((workout) => workout.focusAreas?.length ? workout.focusAreas : [workout.activity]))]
  const weeklyStations = weeklyTypes.filter((activity) => stations.includes(activity))
  const todayDate = clock.now.toISOString().slice(0, 10)
  const nextRaces = officialUpcomingRaces.filter((race) => race.endDate >= todayDate).slice(0, 4)
  const selectedRace = officialUpcomingRaces.find((race) => race.name === data.eventName && race.endDate >= todayDate)
  const overviewRaces = selectedRace && !nextRaces.some((race) => race.name === selectedRace.name)
    ? [...nextRaces, selectedRace].sort((left, right) => left.startDate.localeCompare(right.startDate))
    : nextRaces
  const todayKey = clock.now.toISOString().slice(0, 10)
  const todayPlanIndex = (clock.now.getDay() + 6) % 7
  const todayIsPlanned = data.plannedDays.includes(todayPlanIndex) || data.rescheduledDates.includes(todayKey)
  const completedToday = data.workouts.some((workout) => workout.date === todayKey)
  const confidence = current.recent.length < 3
    ? { label: 'Early picture', detail: 'Log 3 sessions to unlock a training index. For now, focus on getting comfortable with the routine.' }
    : current.recent.length < 8
      ? { label: 'Taking shape', detail: 'A few more weeks of entries will make your training trend more useful.' }
      : { label: 'Growing history', detail: 'This trend reflects your entries, not a prediction of race-day performance.' }
  const goalSummary = data.goalType === 'finish'
    ? 'Finish feeling good'
    : data.goalType === 'consistency'
      ? 'Build consistency'
      : `Work toward ${data.goal}`

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, demo: false }))
  }, [data])

  useEffect(() => {
    if (view !== 'pulse') return
    let active = true
    fetch(`http://127.0.0.1:8000/api/social/reddit?query=${encodeURIComponent(pulseQuery)}&limit=20`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.detail || 'Reddit feed is unavailable.')
        return result.items as SocialPost[]
      })
      .then((items) => { if (active) setPulseResult({ requestKey: pulseRequestKey, posts: items, error: '' }) })
      .catch((error: unknown) => {
        if (active) {
          setPulseResult({ requestKey: pulseRequestKey, posts: [], error: error instanceof Error ? error.message : 'Reddit feed is unavailable.' })
        }
      })
    return () => { active = false }
  }, [view, pulseQuery, pulseRefresh, pulseRequestKey])

  const updateData = (patch: Partial<AppData>) => setData((currentData) => ({ ...currentData, ...patch, demo: patch.demo ?? currentData.demo }))
  const addWorkout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const workout: Workout = {
      id: crypto.randomUUID(), date: String(form.get('date')),
      activity: selectedStations.length > 1 ? 'Multi-station session' : selectedStations[0] ?? String(form.get('activity')),
      ...(selectedStations.length ? { focusAreas: selectedStations } : {}),
      minutes: Number(form.get('minutes')),
      ...(Number(form.get('calories')) > 0 ? { calories: Number(form.get('calories')) } : {}),
      effort: Number(form.get('effort')), note: String(form.get('note') || ''),
    }
    updateData({ workouts: [workout, ...(data.demo ? [] : data.workouts)], checkIns: data.demo ? [] : data.checkIns, demo: false, rescheduledDates: data.rescheduledDates.filter((date) => date !== workout.date) })
    setSelectedStations([])
    setDialog(null)
  }
  const addCheckIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const checkIn = { date: dateOffset(0), sleep: Number(form.get('sleep')), energy: Number(form.get('energy')), soreness: Number(form.get('soreness')) }
    updateData({ workouts: data.demo ? [] : data.workouts, checkIns: [checkIn, ...(data.demo ? [] : data.checkIns.filter((item) => item.date !== checkIn.date))], demo: false })
    setDialog(null)
  }
  const toggleStation = (station: string) => {
    setSelectedStations((current) => current.includes(station)
      ? current.filter((item) => item !== station)
      : [...current, station])
  }
  const openWorkoutForm = (focusAreas: string[] = []) => {
    setSelectedStations(focusAreas)
    setDialog('workout')
  }
  const searchPulse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = pulseSearchDraft.trim()
    if (query) setPulseQuery(query)
  }
  const respondToPlan = (response: PlanResponse) => {
    const rescheduledDates = response === 'moved'
      ? [...new Set([...data.rescheduledDates, dateOffset(1)])]
      : data.rescheduledDates.filter((date) => date !== todayKey)
    updateData({ planResponses: { ...data.planResponses, [todayKey]: response }, rescheduledDates })
  }
  const askCoach = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = coachText.trim()
    if (!question || coachBusy) return
    setCoachBusy(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/coach/weekly-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, workouts: data.workouts.slice(0, 40).map((workout) => ({ date: workout.date, activity: workout.activity, focus_areas: workout.focusAreas ?? [], minutes: workout.minutes, effort: workout.effort })), check_ins: data.checkIns.slice(0, 14), event_date: data.eventDate, goal: data.goal }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Coach service unavailable')
      setCoachReply(result.review)
    } catch {
      setCoachReply('The AI coach is offline right now. Your training log and readiness index still work locally; start the API to request a personalized weekly review.')
    } finally {
      setCoachBusy(false)
      setCoachText('')
    }
  }

  const activityIcon = (activity: string) => activity === 'Run' ? <Footprints size={16} /> : activity === 'Race simulation' ? <Activity size={16} /> : <Dumbbell size={16} />
  const nav = [
    { key: 'workouts' as const, label: 'Workouts', icon: <Dumbbell size={17} /> },
    { key: 'overview' as const, label: 'Overview', icon: <Gauge size={17} /> },
    { key: 'training' as const, label: 'Log', icon: <Dumbbell size={17} /> },
    { key: 'guide' as const, label: 'Learn', icon: <BookOpen size={17} /> },
    { key: 'pulse' as const, label: 'Pulse', icon: <MessageCircle size={17} /> },
    { key: 'progress' as const, label: 'Readiness', icon: <Waves size={17} /> },
    { key: 'settings' as const, label: 'Setup', icon: <Settings2 size={17} /> },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#workouts" onClick={() => setView('workouts')}><span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span><span>PACE<span className="brand-light">/</span>CHECK</span></a>
        <p className="side-label">YOUR TRAINING</p>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map((item) => <button key={item.key} className={view === item.key ? 'selected' : ''} onClick={() => setView(item.key)}>{item.icon}<span>{item.label}</span>{view === item.key && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-event"><div className="event-icon"><CalendarDays size={17} /></div><p className="side-label">NEXT EVENT</p><strong>{data.eventName}</strong><span>{new Date(`${data.eventDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span><button onClick={() => setView('settings')}>Edit race details <ArrowRight size={13} /></button></div>
        <div className="sidebar-bottom"><span className="avatar">JD</span><div><strong>My training</strong><span>Personal workspace</span></div><ChevronDown size={15} /></div>
      </aside>

      <main className={`main-area ${view === 'overview' ? 'main-overview' : ''}`}>
        <header className="topbar"><div className="breadcrumb">PACE/CHECK <span>/</span> {view === 'overview' ? 'OVERVIEW' : view.toUpperCase()}</div><div className="top-actions"><span className="local-indicator"><span /> SAVED LOCALLY</span><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><button className="profile-button">JD</button></div></header>
        {data.demo && <div className="demo-banner"><Sparkles size={15} /> SAMPLE TRAINING DATA <span>Replace these demo entries with your own to make the index meaningful.</span><button onClick={() => updateData({ workouts: [], checkIns: [], demo: false })}>Clear sample data</button></div>}

        {view === 'workouts' && <section className="page-view workout-picker-page"><div className="race-banner workout-race-banner" aria-label="Training backdrop"><video className="race-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1}><source src="https://videos.pexels.com/video-files/8520599/8520599-uhd_4096_1680_25fps.mp4" type="video/mp4" /></video><div className="race-video-shade" /><div className="page-intro"><div><p className="eyebrow">YOUR NEXT SESSION · {daysToRace} DAYS TO RACE DAY</p><h1>What do you want to <em>work out on?</em></h1><p className="intro-copy">Choose one HYROX station or combine a few. Your session will track every focus you select.</p></div></div><a className="video-credit" href="https://www.pexels.com/video/woman-doing-the-battle-rope-workout-8520599/" target="_blank" rel="noreferrer">TRAINING FOOTAGE · PEXELS</a></div><div className="panel station-picker"><div className="picker-heading"><div><p className="eyebrow">THE EIGHT STATIONS</p><h2>Pick your focus.</h2></div><span className="selection-count">{selectedStations.length} selected</span></div><div className="workout-station-grid">{stations.map((station, index) => <button type="button" aria-pressed={selectedStations.includes(station)} className={`workout-station-option ${selectedStations.includes(station) ? 'selected' : ''}`} key={station} onClick={() => toggleStation(station)}><span className="workout-station-number">{String(index + 1).padStart(2, '0')}</span><span className="workout-station-copy"><strong>{station}</strong><small>{stationDescriptions[station]}</small></span><span className="workout-station-check">{selectedStations.includes(station) && <Check size={15} />}</span></button>)}</div><div className="picker-footer"><span>{selectedStations.length ? selectedStations.join(' · ') : 'Select one station or make a combination'}</span><button className="button-primary" disabled={!selectedStations.length} onClick={() => openWorkoutForm(selectedStations)}><Check size={16} /> Continue to session</button></div></div><div className="other-workout-strip"><div><strong>Doing a run, strength day, or something else?</strong><span>Those sessions count too.</span></div><button className="button-secondary" onClick={() => openWorkoutForm([])}><Plus size={15} /> Log another workout</button></div></section>}

        {view === 'pulse' && <section className="page-view pulse-page">
          <header className="pulse-heading">
            <div><p className="eyebrow">PUBLIC HYROX CONVERSATIONS</p><h1>HYROX <em>Pulse.</em></h1><p className="intro-copy">A continuous stream of public posts and current searches from across the community.</p></div>
            <button className="button-secondary" onClick={() => setPulseRefresh((current) => current + 1)}><RefreshCw size={15} /> Refresh feed</button>
          </header>
          <form className="pulse-search" onSubmit={searchPulse}>
            <Search size={18} /><input value={pulseSearchDraft} onChange={(event) => setPulseSearchDraft(event.target.value)} aria-label="Search public HYROX posts" placeholder="Search public HYROX posts" /><button className="button-primary" type="submit">Search</button>
          </form>
          <div className="pulse-stream-label"><div><span className="pulse-live"><i /> PUBLIC STREAM</span><p>Newest posts first. Open a post at its source to join the conversation.</p></div><span className="pulse-result-count">{pulsePosts.length} Reddit posts</span></div>
          <div className="pulse-timeline" aria-live="polite">
            {pulseLoading && <p className="pulse-message"><RefreshCw size={16} /> Loading public HYROX posts…</p>}
            {pulseError && <div className="pulse-message pulse-error"><p>{pulseError} The Reddit feed may be temporarily unavailable.</p><a href={`https://www.reddit.com/search/?q=${encodeURIComponent(pulseQuery)}`} target="_blank" rel="noreferrer">Open public Reddit results <ExternalLink size={14} /></a></div>}
            {!pulseLoading && !pulseError && pulsePosts.length === 0 && <p className="pulse-message">No recent Reddit posts matched “{pulseQuery}”. Public search links are below.</p>}
            {!pulseLoading && pulsePosts.map((post) => <article className="pulse-post" key={post.id}>
              <div className="pulse-post-meta"><span className="pulse-reddit-badge">r/</span><span>Reddit</span><span className="pulse-meta-dot">·</span><span>{post.author}</span><span className="pulse-meta-dot">·</span><time>{post.published ? new Date(post.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}</time></div>
              <h2>{post.title}</h2>{post.summary && <p>{post.summary}</p>}
              <a href={post.url} target="_blank" rel="noreferrer">Read and reply on Reddit <ExternalLink size={14} /></a>
            </article>)}
            <section className="pulse-public-links"><div className="pulse-section-title"><div><p className="eyebrow">MORE PUBLIC POSTS</p><h2>Continue the stream elsewhere.</h2></div></div><p className="pulse-links-intro">These searches use the same query and open public results on each platform.</p>
              {socialSources.map((source) => <a className="pulse-source-card" href={source.url(pulseQuery)} target="_blank" rel="noreferrer" key={source.id}><span className={`pulse-brand-mark ${source.id}`}>{source.mark}</span><span className="pulse-source-copy"><strong>{source.label}</strong><small>{source.id === 'reddit' ? `More public Reddit posts for “${pulseQuery}”` : `Public HYROX results for “${pulseQuery}”`}</small></span><ExternalLink size={15} /></a>)}
            </section>
          </div>
          <p className="pulse-disclaimer">The Reddit stream uses its public search feed. X and Instagram don’t provide an unrestricted public feed API here, so their entries link to public search pages instead of copying posts into PACE/CHECK.</p>
        </section>}

        {view === 'overview' && <>
          <section className="race-banner" aria-label="Race preparation">
            <video className="race-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1}>
              <source src="https://videos.pexels.com/video-files/8520599/8520599-uhd_4096_1680_25fps.mp4" type="video/mp4" />
            </video>
            <div className="race-video-shade" />
            <section className="page-intro"><div><p className="eyebrow">YOUR RACE · {daysToRace} DAYS TO GO</p><h1>{data.eventName}</h1><p className="intro-copy">{eventDateLabel} · {goalSummary}</p></div><div className="intro-actions"><button className="button-secondary" onClick={() => setDialog('checkin')}><Activity size={16} /> Check in</button><button className="button-primary" onClick={() => setView('workouts')}><Plus size={17} /> Log workout</button></div></section>
            <a className="video-credit" href="https://www.pexels.com/video/woman-doing-the-battle-rope-workout-8520599/" target="_blank" rel="noreferrer">TRAINING FOOTAGE · PEXELS</a>
          </section>
          <section className="overview-metrics panel" aria-label="This week's training totals"><div className="overview-section-heading"><div><p className="eyebrow">THIS WEEK</p><h2>Your work, so far.</h2></div><button className="text-button" onClick={() => setView('training')}>View log <ArrowRight size={14} /></button></div><div className="overview-metric-grid"><article><span>Workouts</span><strong>{thisWeek.length}</strong><small>logged this week</small></article><article><span>Calories burned</span><strong>{calorieEntries ? weeklyCalories.toLocaleString() : '—'}</strong><small>{calorieEntries ? `tracked in ${calorieEntries} ${calorieEntries === 1 ? 'session' : 'sessions'}` : 'no calorie data logged'}</small></article><article><span>Workout types</span><strong>{weeklyTypes.length}</strong><small>{weeklyTypes.length ? `${weeklyTypes.slice(0, 3).join(' · ')}${weeklyTypes.length > 3 ? ` +${weeklyTypes.length - 3}` : ''}${weeklyStations.length ? ` · ${weeklyStations.length} HYROX stations` : ''}` : 'none logged this week'}</small></article></div></section>
          <section className="overview-readiness panel" aria-label="Training readiness"><div className="overview-readiness-heading"><div><p className="eyebrow">READINESS</p><h2>{current.recent.length >= 3 ? 'Preparation trend' : 'Baseline in progress'}</h2></div><strong>{current.recent.length >= 3 ? current.score : '—'}<span>{current.recent.length >= 3 ? ' / 100' : ''}</span></strong></div><div className="readiness-bar" role="progressbar" aria-label="Training readiness index" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.recent.length >= 3 ? current.score : 0}><span style={{ width: `${current.recent.length >= 3 ? current.score : 0}%` }} /></div><p>{current.recent.length >= 3 ? confidence.detail : 'Log 3 workouts in the last 4 weeks to see your readiness trend.'}</p></section>
          <section className="overview-races panel" aria-label="Upcoming HYROX races"><div className="overview-section-heading"><div><p className="eyebrow">RACE CALENDAR</p><h2>Upcoming races</h2></div><a href="https://hyrox.com/find-my-race/" target="_blank" rel="noreferrer">Full calendar <ExternalLink size={13} /></a></div><div className="overview-race-list">{overviewRaces.map((race) => <a className={race.name === data.eventName ? 'your-race' : ''} href={race.url} target="_blank" rel="noreferrer" key={race.name}><span className="overview-race-date">{formatRaceRange(race.startDate, race.endDate)}</span><strong>{race.name}</strong>{race.name === data.eventName && <span className="your-race-badge">YOUR RACE</span>}<ExternalLink size={14} /></a>)}</div><p className="calendar-updated">Schedule checked Oct 22, 2026 · Confirm event details with HYROX before booking.</p></section>
          <section className="hero-grid">
            <article className="readiness-card"><div className="readiness-copy"><div className="card-kicker"><span className="live-dot" /> YOUR TRAINING INDEX <span className="info-tip" title="A coaching aid based on your logged training and check-ins. Not a race-time or medical prediction.">i</span></div><div className="score-line"><strong>{current.recent.length >= 3 ? current.score : '—'}</strong><span>{current.recent.length >= 3 ? '/ 100' : 'starting'}</span></div><p className="score-caption">{confidence.label} · {confidence.detail}</p><div className="delta-pill">{previous.recent.length && current.recent.length >= 3 ? <>{current.score >= previous.score ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(current.score - previous.score)} pts <span>vs previous 4 weeks</span></> : <><Activity size={14} /> {current.recent.length >= 3 ? 'Baseline' : 'Start where you are'}</>}</div></div><div className="score-gauge" style={{ '--score': `${current.recent.length >= 3 ? current.score * 3.6 : 0}deg` } as CSSProperties}><div className="gauge-center"><Gauge size={22} /><span>{current.recent.length >= 3 ? 'BUILDING' : 'START HERE'}</span></div></div><div className="readiness-foot"><span><ShieldCheck size={15} /> A training signal, not a race prediction</span><button onClick={() => setView('progress')}>How it works <ArrowRight size={14} /></button></div></article>
            <article className="week-card"><div className="section-heading"><div><p className="eyebrow">WEEK AT A GLANCE</p><h2>Keep the rhythm.</h2></div><button className="more-button" onClick={() => setView('training')} aria-label="Open training log"><ArrowRight size={18} /></button></div><div className="week-stats"><div><strong>{thisWeek.length}<span> / {data.weeklyTarget} sessions</span></strong><small>your weekly target</small></div><div><strong>{weeklyMinutes}<span> min</span></strong><small>total training time</small></div></div><div className="week-bars" aria-label="Training minutes by weekday">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => { const date = new Date(clock.weekStart); date.setDate(date.getDate() + index); const mins = thisWeek.filter((workout) => workout.date === date.toISOString().slice(0, 10)).reduce((sum, workout) => sum + workout.minutes, 0); return <div className="week-bar-col" key={`${day}-${index}`}><div className="bar-track"><span className={mins ? 'has-workout' : ''} style={{ height: `${mins ? Math.max(24, Math.min(100, mins * 1.2)) : 5}%` }} /></div><span className="bar-day">{day}</span></div> })}</div><div className="week-foot"><span><span className="legend-swatch" /> Training minutes</span><span>{weeklyMinutes ? 'Your pace, your week' : 'Add your first session'}</span></div></article>
          </section>
          {todayIsPlanned && !completedToday && <section className="checkpoint-panel"><div className="checkpoint-icon"><Heart size={18} /></div><div className="checkpoint-copy"><p className="eyebrow">TODAY'S CHECKPOINT</p><h2>{data.planResponses[todayKey] ? 'Your plan can flex.' : 'A session was on your plan.'}</h2><p>{data.planResponses[todayKey] === 'rest' ? 'Rest is part of training. Your plan is still here when you’re ready.' : data.planResponses[todayKey] === 'moved' ? 'Moved for today. Tomorrow is another option; no catch-up required.' : data.planResponses[todayKey] === 'skip' ? 'Marked as skipped. No streak lost and no score penalty.' : data.planResponses[todayKey] === 'done' ? 'Marked done. Add the details whenever you like.' : 'How would you like to handle it? No guilt, just a useful check-in.'}</p></div>{!data.planResponses[todayKey] && <div className="checkpoint-actions"><button onClick={() => respondToPlan('done')}><Check size={14} /> Done</button><button onClick={() => respondToPlan('moved')}>Move to tomorrow</button><button onClick={() => respondToPlan('rest')}>Rest today</button><button onClick={() => respondToPlan('skip')}>Skip</button></div>}</section>}
          <section className="dashboard-grid">
            <article className="panel factor-panel"><div className="section-heading"><div><p className="eyebrow">WHAT MOVES THE INDEX</p><h2>Readiness factors</h2></div><button className="text-button" onClick={() => setView('progress')}>View method <ArrowRight size={14} /></button></div><div className="factor-list">{current.factors.map((factor, index) => <div className="factor-row" key={factor.label}><div className="factor-name"><span className={`factor-symbol factor-${index}`}>{index === 0 ? <Footprints size={15} /> : index === 4 ? <Activity size={15} /> : <Dumbbell size={15} />}</span><span>{factor.label}</span><span className="factor-detail">{factor.detail}</span><strong>{current.recent.length >= 3 ? factor.value : '—'}</strong></div><div className="factor-track"><span style={{ width: `${current.recent.length >= 3 ? factor.value : 0}%` }} /></div></div>)}</div><p className="method-note">Weighted index: run volume 25%, station coverage 25%, race-specific work 20%, consistency 15%, recovery check-ins 15%. Factor values unlock after 3 sessions in the last 28 days.</p></article>
            <article className="panel coach-panel"><div className="coach-heading"><span className="coach-icon"><Sparkles size={17} /></span><div><p className="eyebrow">WEEKLY COACH</p><h2>A clearer next step.</h2></div><span className="coach-status">AI</span></div><p className="coach-summary">{current.recent.length < 3 ? 'No score yet, and that is okay. Log any session that feels right; HYROX 101 can explain the race without assuming experience.' : current.factors[1].value < 70 ? 'Your station exposure is still filling in. Keep touches across different stations in the mix alongside your running.' : 'Your logs are building a useful picture. A weekly review can connect training patterns with your recovery check-ins.'}</p><div className="coach-insight"><span className="insight-mark"><Waves size={15} /></span><p><strong>Worth noticing</strong><br />This index reflects logged activity only. A quieter week can mean recovery, travel, or simply missing entries.</p></div>{coachReply && <p className="coach-reply" role="status">{coachReply}</p>}<form className="coach-form" onSubmit={askCoach}><input value={coachText} onChange={(event) => setCoachText(event.target.value)} placeholder="Ask about your training week..." aria-label="Ask the weekly coach" /><button disabled={coachBusy || !coachText.trim()} aria-label="Send to coach">{coachBusy ? <span className="spinner" /> : <ArrowRight size={17} />}</button></form><p className="coach-disclaimer">Coaching support, not medical advice. Take pain, illness, or unusual fatigue seriously.</p></article>
          </section>
          <section className="panel recent-panel"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Sessions that moved you forward.</h2></div><button className="text-button" onClick={() => setView('training')}>Full training log <ArrowRight size={14} /></button></div><div className="session-list">{data.workouts.slice(0, 4).map((workout) => <div className="session-row" key={workout.id}><span className="activity-icon">{activityIcon(workout.focusAreas?.[0] ?? workout.activity)}</span><div className="session-main"><strong>{workout.focusAreas?.length ? workout.focusAreas.join(' + ') : workout.activity}</strong><span>{workout.note || workout.activity}</span></div><span className="session-date">{formatShortDate(workout.date)}</span><span className="session-duration"><Clock3 size={14} /> {workout.minutes} min</span><span className="effort-tag">{effortDescription(workout.effort)}</span></div>)}{data.workouts.length === 0 && <p className="empty-state">No sessions logged yet. Add your first workout to start building your picture.</p>}</div></section>
        </>}

        {view === 'training' && <section className="page-view"><div className="page-intro"><div><p className="eyebrow">YOUR LOG · {data.workouts.length} SESSIONS</p><h1>Training, <em>accounted for.</em></h1><p className="intro-copy">Every run, station, and strength session has a place here.</p></div><button className="button-primary" onClick={() => openWorkoutForm([])}><Plus size={17} /> Log a session</button></div><div className="panel full-log"><div className="section-heading"><div><p className="eyebrow">ALL SESSIONS</p><h2>Your training history</h2></div><span className="log-count">{data.workouts.length} total</span></div>{[...data.workouts].sort((a, b) => b.date.localeCompare(a.date)).map((workout) => <div className="session-row" key={workout.id}><span className="activity-icon">{activityIcon(workout.focusAreas?.[0] ?? workout.activity)}</span><div className="session-main"><strong>{workout.focusAreas?.length ? workout.focusAreas.join(' + ') : workout.activity}</strong><span>{workout.note || workout.activity}</span></div><span className="session-date">{formatShortDate(workout.date)}</span><span className="session-duration"><Clock3 size={14} /> {workout.minutes} min</span><span className="effort-tag">{effortDescription(workout.effort)}</span><button className="remove-button" aria-label={`Remove ${workout.activity} on ${workout.date}`} onClick={() => updateData({ workouts: data.workouts.filter((item) => item.id !== workout.id) })}><X size={15} /></button></div>)}{data.workouts.length === 0 && <p className="empty-state">Your training log is ready when you are.</p>}</div></section>}

        {view === 'guide' && <section className="page-view"><div className="page-intro"><div><p className="eyebrow">THE BASICS · NO EXPERIENCE REQUIRED</p><h1>HYROX, <em>made clear.</em></h1><p className="intro-copy">A quick orientation to the format and the eight stations.</p></div><button className="button-primary" onClick={() => setDialog('workout')}><Plus size={17} /> Log a session</button></div><div className="guide-intro panel"><div className="guide-big-number">8</div><div><p className="eyebrow">THE RACE FORMAT</p><h2>Run, then work. Repeat.</h2><p>A HYROX race alternates 1 km of running with one workout station, repeated eight times. Event divisions and loads vary. You don’t need to train every station in every session to get started.</p></div></div><div className="station-grid">{stations.map((station, index) => <article className="station-card" key={station}><span className="station-number">{String(index + 1).padStart(2, '0')}</span><div><h2>{station}</h2><p>{['A ski-pulling machine; steady rhythm matters more than a sprint.', 'Push a weighted sled across the floor.', 'Pull a weighted sled toward you using a rope.', 'Burpee, then broad jump forward. Move at a repeatable pace.', 'A rowing machine; settle into a controlled rhythm.', 'Carry a weight in each hand while walking.', 'Lunge forward while carrying a sandbag.', 'Repeated wall-ball throws to a target. Break into manageable sets.'][index]}</p></div></article>)}</div><div className="beginner-note"><Heart size={17} /><p><strong>New to this?</strong> Start with what you have access to. A walk, a short run, or learning one station all count as useful first steps. The app tracks your log; it does not prescribe a training plan.</p></div></section>}

        {view === 'progress' && <section className="page-view"><div className="page-intro"><div><p className="eyebrow">THE SIGNAL, NOT A PROMISE</p><h1>Progress with <em>context.</em></h1><p className="intro-copy">A transparent view of what your entries say, and what they can’t.</p></div></div><div className="panel progress-explainer"><div className="section-heading"><div><p className="eyebrow">HOW THE INDEX WORKS</p><h2>Five inputs. One conversation starter.</h2></div><span className="method-badge"><Gauge size={15} /> {current.recent.length >= 3 ? `${current.score} / 100` : 'Early log'}</span></div><p className="explainer-copy">This is a simple training indicator calculated from your last 28 days of logged workouts and recovery check-ins. {confidence.detail} It is not validated to predict a race result, diagnose fatigue, or replace a coach or clinician.</p><div className="factor-list expanded">{current.factors.map((factor, index) => <div className="factor-row" key={factor.label}><div className="factor-name"><span className={`factor-symbol factor-${index}`}>{index === 0 ? <Footprints size={15} /> : index === 4 ? <Activity size={15} /> : <Dumbbell size={15} />}</span><span>{factor.label}</span><span className="factor-detail">Weight {factor.weight}% · {factor.detail}</span><strong>{current.recent.length >= 3 ? factor.value : '—'}</strong></div><div className="factor-track"><span style={{ width: `${current.recent.length >= 3 ? factor.value : 0}%` }} /></div></div>)}</div><div className="safety-note"><ShieldCheck size={19} /><p><strong>Listen to your body first.</strong> The score can’t see pain, illness, stress, or how a session felt beyond what you record. Reduce or stop training when appropriate, and seek qualified care for concerning symptoms.</p></div></div></section>}

        {view === 'settings' && <section className="page-view"><div className="page-intro"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Race <em>setup.</em></h1><p className="intro-copy">Choose a goal that feels like yours and set your weekly rhythm.</p></div></div><div className="panel settings-panel"><div className="section-heading"><div><p className="eyebrow">TARGET EVENT</p><h2>One finish line in view.</h2></div><CalendarDays size={22} /></div><label>Event name<input value={data.eventName} onChange={(event) => updateData({ eventName: event.target.value })} maxLength={80} /></label><label>Countdown date · event weekend starts<input type="date" value={data.eventDate} onChange={(event) => updateData({ eventDate: event.target.value })} /></label><p className="settings-label">What does success look like?</p><div className="choice-row">{([['finish', 'Finish feeling good'], ['consistency', 'Build consistency'], ['time', 'Target a time']] as const).map(([goal, label]) => <button className={data.goalType === goal ? 'active' : ''} key={goal} onClick={() => updateData({ goalType: goal })}>{label}</button>)}</div>{data.goalType === 'time' && <label>Finish-time goal<input value={data.goal} onChange={(event) => updateData({ goal: event.target.value })} placeholder="1:45" /></label>}<label>Sessions that feel realistic each week<select value={data.weeklyTarget} onChange={(event) => updateData({ weeklyTarget: Number(event.target.value) })}>{[2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count} sessions</option>)}</select></label><div className="settings-label">Days you prefer to train <span className="optional">optional</span></div><div className="day-picker">{weekdays.map((day, index) => <button className={data.plannedDays.includes(index) ? 'active' : ''} key={day} onClick={() => updateData({ plannedDays: data.plannedDays.includes(index) ? data.plannedDays.filter((item) => item !== index) : [...data.plannedDays, index] })}>{day.slice(0, 3)}</button>)}</div><p className="method-note">The official Miami Beach event weekend is March 26–28, 2027; this countdown uses March 26 unless your personal race day differs. Check-ins are in-app only.</p><button className="danger-button" onClick={() => { localStorage.removeItem(STORAGE_KEY); setData(makeDemoData()) }}>Restore sample data</button></div></section>}

        <footer className="page-footer"><span>PACE/CHECK <span className="footer-dot">·</span> TRAIN WITH CONTEXT</span><span>Training indicator only. Not medical guidance or a race prediction.</span></footer>
      </main>

      {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><p className="eyebrow">{dialog === 'workout' ? 'TRAINING LOG' : 'DAILY CHECK-IN'}</p><h2 id="modal-title">{dialog === 'workout' ? selectedStations.length > 1 ? 'Log a combination.' : selectedStations.length === 1 ? `Log ${selectedStations[0]}.` : 'Log a session.' : 'How are you feeling?'}</h2></div><button className="icon-button" onClick={() => setDialog(null)} aria-label="Close dialog"><X size={19} /></button></div>
          {dialog === 'workout' ? <form className="entry-form" onSubmit={addWorkout}>
            {selectedStations.length > 0 ? <div className="modal-focus-list"><div><strong>Workout focus</strong><span>{selectedStations.join(' + ')}</span></div><button type="button" className="text-button" onClick={() => { setDialog(null); setView('workouts') }}>Edit selection</button></div> : <label>What did you do?<select name="activity">{activities.map((activity) => <option key={activity}>{activity}</option>)}</select></label>}
            <div className="form-pair"><label>Day<input name="date" type="date" defaultValue={dateOffset(0)} required /></label><label>How long? · minutes<input name="minutes" type="number" min="1" max="600" defaultValue="40" required /></label></div>
            <label>Calories burned <span className="optional">optional · from your tracker or estimate</span><input name="calories" type="number" min="1" max="5000" step="1" placeholder="e.g. 320" /></label>
            <label>How hard did it feel?<select name="effort" defaultValue="5"><option value="2">Easy · could keep going</option><option value="5">Steady · working, still in control</option><option value="8">Hard · needed real effort</option><option value="10">Very hard · near my limit</option></select></label>
            <label>Anything you want to remember? <span className="optional">optional</span><input name="note" maxLength={160} placeholder="How it felt, what you practiced..." /></label>
            <button className="button-primary submit-button" type="submit"><Check size={16} /> Save session</button>
          </form> : <form className="entry-form" onSubmit={addCheckIn}><p className="form-hint">A quick self-check gives the training picture more context.</p><label>Sleep last night · hours<input name="sleep" type="number" min="0" max="16" step="0.5" defaultValue="7" required /></label><label>Energy today · 1 low to 10 high<input name="energy" type="range" min="1" max="10" defaultValue="6" /></label><label>Soreness today · 1 low to 10 high<input name="soreness" type="range" min="1" max="10" defaultValue="3" /></label><button className="button-primary submit-button" type="submit"><Check size={16} /> Save check-in</button></form>}
        </section>
      </div>}
    </div>
  )
}