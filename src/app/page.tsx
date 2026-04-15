import { WeatherDashboard } from "@/components/weather-dashboard";

const architecture = [
  "Open-Meteo current conditions",
  "Railway worker polling every few minutes",
  "Supabase table with Realtime enabled",
  "Next.js dashboard updating without refresh",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(180deg,_#07111f_0%,_#10233c_45%,_#e6eef5_100%)] text-slate-950">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/20 bg-slate-950/80 p-8 text-white shadow-2xl shadow-slate-950/20 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">
              Assignment 4 System
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight sm:text-6xl">
              A live weather board with realtime database updates.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              The worker polls current conditions for a fixed set of cities, writes the
              latest snapshot into Supabase, and this dashboard listens for inserts and
              updates through Supabase Realtime.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {architecture.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200/70 bg-white/82 p-8 shadow-xl shadow-slate-900/10 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
              Deployment Split
            </p>
            <div className="mt-6 space-y-5 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-950">Frontend</p>
                <p>Next.js on Vercel reads from the public Supabase endpoint.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Worker</p>
                <p>Railway runs `npm run worker` on a loop using the service role key.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Database</p>
                <p>Supabase stores the latest city snapshots and broadcasts updates.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 flex-1 rounded-[2rem] border border-white/60 bg-white/88 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-6">
          <WeatherDashboard />
        </section>
      </main>
    </div>
  );
}
