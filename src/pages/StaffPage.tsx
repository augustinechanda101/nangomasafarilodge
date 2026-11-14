import { useCallback, useEffect, useMemo, useState } from 'react';
import { LOCATIONS } from '../lib/sampleStaff';
import { fetchLocationsWithRooms, fetchWindowBars, type LocationWithRooms } from '../lib/data';
import type { GridBar, GridRoom } from '../lib/staffTypes';
import RoomGrid from '../components/RoomGrid';
import RoomDetailView from '../components/RoomDetailView';
import MonthlyGrid from '../components/MonthlyGrid';
import ActivityPanel from '../components/ActivityPanel';
import CompactDayGrid from '../components/CompactDayGrid';
import Legend from '../components/Legend';
import LoadingScreen from '../components/LoadingScreen';
import StaffHeader from '../components/StaffHeader';

type ViewMode = 'overview' | 'today' | 'monthly' | 'day';

function fmtDay(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function nextDayLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  });
}

// View-only page for general staff (bartenders, etc.) — no booking, no desk actions.
export default function StaffPage() {
  // Desk state persists across navigation
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (sessionStorage.getItem('staff.viewMode') as ViewMode) ?? 'overview',
  );
  const [selectedRoom, setSelectedRoom] = useState<{
    name: string; number: number; room?: GridRoom; bars: GridBar[]; dayLabels: string[];
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(() => Number(sessionStorage.getItem('staff.zoom')) || 1);
  const [openDates, setOpenDates] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('staff.openDates') ?? '[]'); } catch { return []; }
  });
  const [activeDate, setActiveDate] = useState<string | null>(() => sessionStorage.getItem('staff.activeDate') || null);
  const [location, setLocation] = useState<string>(() => sessionStorage.getItem('staff.location') ?? 'all');

  // Persist desk state so navigation restores everything
  useEffect(() => { sessionStorage.setItem('staff.viewMode', viewMode); }, [viewMode]);
  useEffect(() => { sessionStorage.setItem('staff.zoom', String(zoomLevel)); }, [zoomLevel]);
  useEffect(() => { sessionStorage.setItem('staff.openDates', JSON.stringify(openDates)); }, [openDates]);
  useEffect(() => { sessionStorage.setItem('staff.activeDate', activeDate ?? ''); }, [activeDate]);
  useEffect(() => { sessionStorage.setItem('staff.location', location); }, [location]);

  const [locations, setLocations] = useState<LocationWithRooms[]>([]);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    fetchLocationsWithRooms()
      .then(setLocations)
      .catch((e) => {
        console.error('locations fetch failed', e);
        setLocations(LOCATIONS.filter((l) => l.id !== 'all').map((l) => ({ id: 0, name: l.name, rooms: l.rooms })));
      })
      .finally(() => setLocLoading(false));
  }, []);

  const rooms = useMemo(
    () => (location === 'all'
      ? locations.flatMap((l) => l.rooms)
      : locations.find((l) => l.name === location)?.rooms ?? []),
    [location, locations],
  );
  // Index rooms by database ID — room names repeat across locations
  const roomIndexById = useMemo(() => {
    const m = new Map<number, number>();
    rooms.forEach((r, i) => { if (r.id !== undefined) m.set(r.id, i); });
    return m;
  }, [rooms]);
  const numColumns = zoomLevel === 1 ? 7 : zoomLevel === 2 ? 4 : 2;
  const dayLabels = nextDayLabels(numColumns);
  const isOneDay = viewMode === 'today' || viewMode === 'day';
  const splitByLocation = isOneDay && location === 'all' && locations.length > 1;

  const [bars, setBars] = useState<GridBar[]>([]);

  // Availability per location for the current window, incl. family rooms
  // (hold/maintenance/unavailable rooms are not bookable, so not free)
  const locationInfo = locations.map((l) => {
    const isFree = (r: GridRoom) =>
      r.state === 'Available' && !bars.some((b) => {
        const br = rooms[b.room - 1];
        if (!br) return false;
        return br.id !== undefined && r.id !== undefined ? br.id === r.id : br.name === r.name;
      });
    const free = l.rooms.filter(isFree).length;
    const familyRooms = l.rooms.filter((r) => r.type === 'Family Room');
    const familyFree = familyRooms.filter(isFree).length;
    return { name: l.name, free, total: l.rooms.length, familyFree, familyTotal: familyRooms.length };
  });

  // Per-location sub-grids for the compact one-day view (re-indexed bars).
  // Grouped by room ID — names repeat across locations, so name matching
  // would copy the same booking into both lodges' panels.
  const locationGroups = locations.map((l) => {
    const subIndex = new Map<string | number, number>();
    l.rooms.forEach((r, i) => subIndex.set(r.id ?? r.name, i));
    const subBars = bars
      .filter((b) => {
        const br = rooms[b.room - 1];
        return br !== undefined && subIndex.has(br.id ?? br.name);
      })
      .map((b) => {
        const br = rooms[b.room - 1];
        return { ...b, room: (subIndex.get(br.id ?? br.name) ?? 0) + 1 };
      });
    return { name: l.name, rooms: l.rooms, bars: subBars };
  });

  const loadBars = useCallback(() => {
    const windowStart = viewMode === 'day' && activeDate ? activeDate : localISO(new Date());
    const windowDays = viewMode === 'overview' ? numColumns : 1;
    fetchWindowBars(windowStart, windowDays, roomIndexById)
      .then((next) => setBars(next))
      .catch((e) => console.error('bars fetch failed', e));
  }, [viewMode, activeDate, numColumns, roomIndexById]);

  useEffect(() => {
    loadBars();
  }, [loadBars]);

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

  if (locLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <StaffHeader
          role="Staff"
          who="[Staff name]"
          locations={locations}
          location={location}
          onLocationChange={setLocation}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setViewMode('today');
            }}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${
              viewMode === 'today'
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
            {(viewMode === 'monthly' || viewMode === 'overview') && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xl font-semibold">
                  {viewMode === 'monthly'
                    ? 'Monthly View'
                    : zoomLevel === 1
                    ? 'Rooms, next 7 days'
                    : zoomLevel === 2
                    ? 'Rooms, next 4 days'
                    : 'Rooms, next 2 days'}
                </h3>
                {viewMode === 'overview' && (
                  <span className="text-[13px] font-semibold text-savanna-ink">
                    {location === 'all'
                      ? locationInfo.map((a) => `${a.name} ${a.free}/${a.total}`).join(' · ')
                      : (() => {
                          const info = locationInfo.find((x) => x.name === location);
                          return info
                            ? `${info.free}/${info.total} free${info.familyTotal > 0 ? ` · Family ${info.familyFree}/${info.familyTotal}` : ''}`
                            : '';
                        })()}
                  </span>
                )}
                <span className="text-[13px] text-bark-muted">
                  {viewMode === 'monthly'
                    ? 'Click a day to open its schedule'
                    : zoomLevel > 1
                    ? 'Zoomed view - use slider to adjust'
                    : 'Check-out is always 10:00 AM'}
                </span>
              </div>
            )}
            {viewMode === 'monthly' ? (
              <MonthlyGrid
                rooms={rooms}
                selected={activeDate}
                onDateSelect={openDate}
              />
            ) : splitByLocation ? (
              /* One-day views on All Locations: info above each panel, panels side by side */
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {locationGroups.map((g, gi) => {
                  const info = locationInfo[gi];
                  return (
                    <div key={g.name} className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-bark-muted">{g.name}</h4>
                        <span className="text-[11px] font-semibold text-savanna-ink">{info.free}/{info.total} free</span>
                        {info.familyTotal > 0 && (
                          <span className="text-[11px] font-semibold text-ochre-ink">
                            Family {info.familyFree}/{info.familyTotal}
                          </span>
                        )}
                      </div>
                      <section className="flex flex-col gap-2 rounded-2xl border border-sand-line bg-sand-card p-3 xl:h-80">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          <CompactDayGrid
                            rooms={g.rooms}
                            bars={g.bars}
                            onRoomClick={(roomNumber) => {
                              const room = g.rooms[roomNumber - 1];
                              setSelectedRoom({ name: room.name, number: roomNumber, room, bars: g.bars, dayLabels: [dayLabels[0]] });
                            }}
                          />
                        </div>
                      </section>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === 'overview' ? (
              <RoomGrid
                days={dayLabels}
                rooms={rooms}
                bars={bars}
                onRoomClick={(roomNumber) => {
                  const room = rooms[roomNumber - 1];
                  setSelectedRoom({ name: room.name, number: roomNumber, room, bars, dayLabels });
                }}
                onDayClick={(dayIndex) => openDate(localISO(new Date(Date.now() + dayIndex * 86_400_000)))}
                zoomLevel={zoomLevel}
              />
            ) : (
              /* One-day view, single location: info above the panel, compact 2-by-2 grid */
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-bark-muted">
                    {locationInfo.find((x) => x.name === location)?.name ?? location}
                  </h4>
                  {(() => {
                    const info = locationInfo.find((x) => x.name === location);
                    return info ? (
                      <>
                        <span className="text-[11px] font-semibold text-savanna-ink">{info.free}/{info.total} free</span>
                        {info.familyTotal > 0 && (
                          <span className="text-[11px] font-semibold text-ochre-ink">
                            Family {info.familyFree}/{info.familyTotal}
                          </span>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
                <section className="flex flex-col gap-2 rounded-2xl border border-sand-line bg-sand-card p-3 xl:h-80">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <CompactDayGrid
                      rooms={rooms}
                      bars={bars}
                      onRoomClick={(roomNumber) => {
                        const room = rooms[roomNumber - 1];
                        setSelectedRoom({ name: room.name, number: roomNumber, room, bars, dayLabels: [dayLabels[0]] });
                      }}
                    />
                  </div>
                </section>
              </div>
            )}

            {(viewMode === 'today' || viewMode === 'day') && <Legend />}

            {viewMode !== 'monthly' && <ActivityPanel />}
          </section>
        </div>
      </div>

      {selectedRoom && (
        <RoomDetailView
          roomName={selectedRoom.name}
          roomNumber={selectedRoom.number}
          room={selectedRoom.room}
          bars={selectedRoom.bars}
          dayLabels={selectedRoom.dayLabels}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}
