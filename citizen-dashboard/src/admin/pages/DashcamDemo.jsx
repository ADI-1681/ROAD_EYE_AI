import { useMemo } from 'react';

const clips = [
  {
    id: 'CAM-01',
    label: 'Main junction',
    status: 'High risk',
    tone: 'red',
    confidence: 96,
    summary: 'Vehicle crossing near missing road sign and debris cluster.',
  },
  {
    id: 'CAM-02',
    label: 'Bridge lane',
    status: 'Monitored',
    tone: 'amber',
    confidence: 82,
    summary: 'Temporary congestion pattern detected near the bridge approach.',
  },
  {
    id: 'CAM-03',
    label: 'Pedestrian corridor',
    status: 'Normal',
    tone: 'emerald',
    confidence: 91,
    summary: 'No obstruction or incident detected on the pedestrian corridor.',
  },
];

const incidents = [
  { title: 'Road sign obstruction', severity: 'High', time: '09:42 AM' },
  { title: 'Pothole edge detection', severity: 'Medium', time: '10:14 AM' },
  { title: 'Bike lane near miss', severity: 'High', time: '10:58 AM' },
];

export default function DashcamDemo() {
  const score = useMemo(
    () => Math.round(clips.reduce((sum, item) => sum + item.confidence, 0) / clips.length),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Dashcam intelligence</p>
            <h2 className="text-2xl font-bold text-slate-900">Dashcam demo</h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            Coverage score: {score}%
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <div className="relative h-[420px] w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_35%),linear-gradient(135deg,#0f172a,#111827_40%,#0f172a)]">
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

              <div className="absolute left-8 top-8 flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                Live monitoring
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent px-6 py-5 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Feed</p>
                  <p className="mt-1 text-lg font-semibold">MG Road - Sector 5</p>
                </div>
                <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
                  4 alerts
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Detected incidents</h3>
            <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div key={incident.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{incident.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      incident.severity === 'High' ? 'bg-red-100 text-red-700' :
                      incident.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{incident.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Camera health</h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>Network stability</span>
                  <span className="font-semibold text-slate-900">92%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[92%] rounded-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>AI confidence</span>
                  <span className="font-semibold text-slate-900">89%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[89%] rounded-full bg-cyan-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Camera feed list</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {clips.map((clip) => (
            <div key={clip.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{clip.label}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  clip.tone === 'red' ? 'bg-red-100 text-red-700' :
                  clip.tone === 'amber' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {clip.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{clip.summary}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{clip.id}</span>
                <span>{clip.confidence}% confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
