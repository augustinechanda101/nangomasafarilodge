import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ALERTS, DAYS, GRID_BARS, LOCATIONS, barsForDate, type LocationId } from '../lib/sampleStaff';
import AlertCard from '../components/AlertCard';
import RoomGrid from '../components/RoomGrid';
import HourlyGrid from '../components/HourlyGrid';
import RoomDetailView from '../components/RoomDetailView';
import MonthlyGrid from '../components/MonthlyGrid';
import VacancyView from '../components/VacancyView';
import FinanceCard from '../components/FinanceCard';
import StaffHeader from '../components/StaffHeader';

type ViewMode = 'overview' | 'hourly' | 'monthly' | 'day';

function fmtDay(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function ReceptionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedRoom, setSelectedRoom] = useState<{ name: string; number: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState(localISO(new Date()));
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 7 days, 2 = 4 days, 3 = 2 days
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationId>('all');
  const [showVacancy, setShowVacancy] = useState(false);
  const rooms = LOCATIONS.find((l) => l.id === location)!.rooms;

  const openDate = (dateStr: string) => {
    setOpenDates((p) => (p.includes(dateStr) ? p : [...p, dateStr]));
    setActiveDate(dateStr);
    setViewMode('day');
  };

  const closeDate = (d: string) => {
    setOpenDates((prev) => {
      const next = prev.filter((x) => x !== d);
      if (activeDate === d) {
        if (next.length > 0) {
          setActiveDate(next[next.length - 1]);
          setViewMode('day');
        } else {
          setActiveDate(null);
          setViewMode('monthly');
        }
      }
      return next;
    });
  };

  // TODO: replace each handler with the Express call (server re-checks every rule)
  const handleAlert = (id: number) => console.log('POST /api/alerts/%s/action', id);

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <StaffHeader
          role="Reception"
          who="[Receptionist name]"
          location={location}
          onLocationChange={setLocation}
          action={
            <>
              <Link
                to="/reception/booking"
                className="min-h-10 rounded-xl bg-ochre px-4 text-sm font-semibold text-sand-card hover:bg-bark-deep transition-colors flex items-center justify-center"
              >
                New Booking
              </Link>
              <Link
                to="/reception/records"
                className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off transition-colors flex items-center justify-center"
              >
                Records
              </Link>
              <Link
                to="/reception/logs"
                className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off transition-colors flex items-center justify-center"
              >
                Logs
              </Link>
              <Link
                to="/reception/finance"
                className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off transition-colors flex items-center justify-center"
              >
                Finance
              </Link>
            </>
          }
        />

        <div className="flex gap-3 overflow-x-auto pb-2">
          {ALERTS.map((a) => (
            <div key={a.id} className="flex-shrink-0 min-w-[280px]">
              <AlertCard item={a} onAction={handleAlert} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedDate(localISO(new Date()));
              setViewMode('hourly');
            }}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${
              viewMode === 'hourly'
                ? 'bg-bark-deep text-sand-card'
                : 'bg-ochre text-sand-card hover:bg-bark-deep'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode('overview')}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${
              viewMode === 'overview'
                ? 'bg-bark-deep text-sand-card'
                : 'bg-bark-soft text-bark hover:bg-bark-off'
            }`}
          >
            {zoomLevel === 1 && '7-Day Overview'}
            {zoomLevel === 2 && '4-Day Overview'}
            {zoomLevel === 3 && '2-Day Overview'}
          </button>
          <button
            onClick={() => {
              setShowVacancy(false);
              setViewMode('monthly');
            }}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${
              viewMode === 'monthly'
                ? 'bg-bark-deep text-sand-card'
                : 'bg-bark-soft text-bark hover:bg-bark-off'
            }`}
          >
            Monthly View
          </button>
          {viewMode !== 'monthly' && (
            <div className="flex rounded-xl bg-bark-soft p-0.5 ml-1">
              <button
                type="button"
                onClick={() => setShowVacancy(false)}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  !showVacancy ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setShowVacancy(true)}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  showVacancy ? 'bg-savanna-chip text-savanna-ink shadow-sm' : 'text-bark-muted hover:text-bark'
                }`}
              >
                Vacancy
              </button>
            </div>
          )}
          {openDates.map((d) => {
            const isActive = viewMode === 'day' && activeDate === d;
            return (
              <span
                key={d}
                className={`flex items-center gap-1 rounded-full text-sm font-semibold ${
                  isActive ? 'bg-bark-deep text-sand-card' : 'bg-bark-soft text-bark'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveDate(d);
                    setViewMode('day');
                  }}
                  className="min-h-10 rounded-l-full pl-4 pr-2 hover:opacity-80"
                >
                  {fmtDay(d)}
                </button>
                <button
                  type="button"
                  onClick={() => closeDate(d)}
                  className="min-h-10 rounded-r-full pr-3 text-xs opacity-70 hover:opacity-100"
                  aria-label={`Close ${fmtDay(d)}`}
                >
                  ✕
                </button>
              </span>
            );
          })}
          {viewMode === 'overview' && (
            <div className="flex items-center gap-2 ml-4">
              <label className="text-sm text-bark-muted">Zoom:</label>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
                disabled={zoomLevel === 1}
                className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off disabled:opacity-40 disabled:cursor-not-allowed text-lg font-semibold"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="w-16 text-center text-sm font-semibold text-bark">
                {zoomLevel === 1 && '7 days'}
                {zoomLevel === 2 && '4 days'}
                {zoomLevel === 3 && '2 days'}
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 1))}
                disabled={zoomLevel === 3}
                className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off disabled:opacity-40 disabled:cursor-not-allowed text-lg font-semibold"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-4 lg:flex-row">
          <section className="flex w-full min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-semibold">
                {showVacancy && viewMode !== 'monthly'
                  ? 'Vacancy'
                  : viewMode === 'overview'
                  ? zoomLevel === 1
                    ? 'Rooms, next 7 days'
                    : zoomLevel === 2
                    ? 'Rooms, next 4 days'
                    : 'Rooms, next 2 days'
                  : viewMode === 'hourly'
                  ? 'Today - Hourly Schedule'
                  : viewMode === 'day' && activeDate
                  ? `${fmtDay(activeDate)} - Hourly Schedule`
                  : 'Monthly View'}
              </h3>
              <span className="text-[13px] text-bark-muted">
                {showVacancy && viewMode !== 'monthly'
                  ? 'Rooms free in this period'
                  : viewMode === 'overview'
                  ? zoomLevel > 1
                    ? 'Zoomed view - use slider to adjust'
                    : 'Check-out is always 10:00 AM'
                  : viewMode === 'hourly'
                  ? 'Click room name for detailed view'
                  : viewMode === 'day'
                  ? `Schedule for ${activeDate ?? ''}`
                  : 'Click a day to open its schedule'}
              </span>
            </div>
            {viewMode === 'overview' ? (
              showVacancy ? (
                <VacancyView
                  rooms={rooms}
                  bars={GRID_BARS}
                  mode="days"
                  dayLabels={DAYS.slice(0, zoomLevel === 1 ? 7 : zoomLevel === 2 ? 4 : 2)}
                />
              ) : (
                <RoomGrid
                  days={DAYS}
                  rooms={rooms}
                  bars={GRID_BARS}
                  onRoomClick={(roomNumber) => {
                    const room = rooms[roomNumber - 1];
                    setSelectedRoom({ name: room.name, number: roomNumber });
                  }}
                  zoomLevel={zoomLevel}
                  canAct
                />
              )
            ) : viewMode === 'hourly' ? (
              showVacancy ? (
                <VacancyView rooms={rooms} bars={barsForDate(selectedDate)} mode="hours" />
              ) : (
                <HourlyGrid
                  date={selectedDate}
                  rooms={rooms}
                  bookings={barsForDate(selectedDate)}
                  onDateChange={openDate}
                  canAct
                />
              )
            ) : viewMode === 'day' && activeDate ? (
              showVacancy ? (
                <VacancyView rooms={rooms} bars={barsForDate(activeDate)} mode="hours" />
              ) : (
                <HourlyGrid
                  date={activeDate}
                  rooms={rooms}
                  bookings={barsForDate(activeDate)}
                  onDateChange={(newD) => {
                    setOpenDates((p) => [...new Set(p.map((x) => (x === activeDate ? newD : x)))]);
                    setActiveDate(newD);
                  }}
                  canAct
                />
              )
            ) : (
              <MonthlyGrid
                rooms={rooms}
                selected={activeDate}
                onDateSelect={openDate}
              />
            )}

            {viewMode !== 'monthly' && (
              <FinanceCard
                items={
                  viewMode === 'overview'
                    ? GRID_BARS
                    : barsForDate(viewMode === 'day' && activeDate ? activeDate : selectedDate)
                }
                title={
                  viewMode === 'overview'
                    ? `Financials — next ${zoomLevel === 1 ? 7 : zoomLevel === 2 ? 4 : 2} days`
                    : viewMode === 'day' && activeDate
                    ? `Financials — ${fmtDay(activeDate)}`
                    : 'Financials — today'
                }
              />
            )}
          </section>
        </div>
      </div>

      {selectedRoom && (
        <RoomDetailView
          roomName={selectedRoom.name}
          roomNumber={selectedRoom.number}
          bookings={GRID_BARS}
          onClose={() => setSelectedRoom(null)}
          date={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
    </div>
  );
}
