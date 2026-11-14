import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen font-sans text-bark">
      {/* Lodge photo background with a soft sand scrim */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/landing-bg.webp)' }}
      />
      <div className="fixed inset-0 bg-sand/70" />

      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 md:px-14 md:py-7 2xl:gap-6 2xl:px-12 2xl:py-10">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/nangomalogo.webp"
            alt="Nangoma Safari Lodge"
            className="h-28 w-auto rounded-xl md:h-40"
            style={{ transform: 'translateX(30px)' }}
          />
          <h1 className="font-display text-3xl font-semibold md:text-5xl 2xl:text-6xl">Welcome</h1>
          <p className="text-lg text-bark-muted">Please select your role to continue</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 2xl:gap-6">
          <Link
            to="/staff"
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-bark p-6 transition-transform hover:scale-105 hover:shadow-lg"
          >
            <img src="/staff-icon.svg" alt="" className="h-10 w-10" />
            <h3 className="font-sans text-2xl font-semibold text-sand-card">Staff</h3>
          </Link>

          <Link
            to="/reception"
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-bark p-6 transition-transform hover:scale-105 hover:shadow-lg"
          >
            <img src="/reception-icon.svg" alt="" className="h-10 w-10" />
            <h3 className="font-sans text-2xl font-semibold text-sand-card">Reception</h3>
          </Link>

          <Link
            to="/gm"
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-bark p-6 transition-transform hover:scale-105 hover:shadow-lg"
          >
            <img src="/management-icon.svg" alt="" className="h-10 w-10" />
            <h3 className="font-sans text-2xl font-semibold text-sand-card">Management</h3>
          </Link>
        </div>
      </div>
    </div>
  );
}
