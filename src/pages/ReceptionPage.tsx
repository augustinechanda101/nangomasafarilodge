import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALERTS, GRID_BARS, LOCATIONS } from '../lib/sampleStaff';
import { bookingAction, fetchAlerts, fetchLocationsWithRooms, fetchWindowBars, setRoomState, type LocationWithRooms } from '../lib/data';
import type { AlertItem, GridBar, GridRoom } from '../lib/staffTypes';
import AlertCard from '../components/AlertCard';
import RoomGrid from '../components/RoomGrid';
import RoomDetailView from '../components/RoomDetailView';
import MonthlyGrid from '../components/MonthlyGrid';
import FinanceCard from '../components/FinanceCard';
import ActivitySummary from '../components/ActivitySummary';
import CompactDayGrid from '../components/CompactDayGrid';
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

// Next N day labels from today, e.g. "Fri 14"
function nextDayLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  });
}

export default function ReceptionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedRoom, setSelectedRoom] = useState<{
    name: string; number: number; room?: GridRoom; bars: GridBar[]; dayLabels: string[];
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 7 days, 2 = 4 days, 3 = 2 days
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('all');

  // Start empty (no sample flash); sample data only as fallback on fetch failure
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
  const roomIndexByNumber = useMemo(() => new Map(rooms.map((r, i) => [r.name, i])), [rooms]);
  const numColumns = zoomLevel === 1 ? 7 : zoomLevel === 2 ? 4 : 2;
  const dayLabels = nextDayLabels(numColumns);
  const isOneDay = viewMode === 'today' || viewMode === 'day';
  const splitByLocation = isOneDay && location === 'all' && locations.length > 1;

  const [bars, setBars] = useState<GridBar[]>([]);

  // Availability per location for the current window, incl. family rooms
  // (hold/maintenance/unavailable rooms are not bookable, so not free)
  const locationInfo = locations.map((l) => {
    const isFree = (r: GridRoom) => r.state === 'Available' && !bars.some((b) => rooms[b.room - 1]?.name === r.name);
    const free = l.rooms.filter(isFree).length;
    const familyRooms = l.rooms.filter((r) => r.type === 'Family Room');
    const familyFree = familyRooms.filter(isFree).length;
    return { name: l.name, free, total: l.rooms.length, familyFree, familyTotal: familyRooms.length };
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Per-location sub-grids for the compact one-day view (re-indexed bars)
  const locationGroups = locations.map((l) => {
    const subIndex = new Map(l.rooms.map((r, i) => [r.name, i]));
    const subBars = bars
      .filter((b) => {
        const roomName = rooms[b.room - 1]?.name;
        return roomName !== undefined && subIndex.has(roomName);
      })
      .map((b) => ({ ...b, room: (subIndex.get(rooms[b.room - 1].name) ?? 0) + 1 }));
    return { name: l.name, rooms: l.rooms, bars: subBars };
  });

  const loadAlerts = useCallback(() => {
    fetchAlerts()
      .then(setAlerts)
      .catch((e) => {
        console.error('alerts fetch failed', e);
        setAlerts(ALERTS);
      });
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const loadBars = useCallback(() => {
    const windowStart = viewMode === 'day' && activeDate ? activeDate : localISO(new Date());
    const windowDays = viewMode === 'overview' ? numColumns : 1;
    fetchWindowBars(windowStart, windowDays, roomIndexByNumber)
      .then((next) => setBars(next))
      .catch((e) => {
        console.error('bars fetch failed', e);
        setBars(GRID_BARS);
      });
  }, [viewMode, activeDate, numColumns, roomIndexByNumber]);

  useEffect(() => {
    loadBars();
  }, [loadBars]);

  const handleAction = async (verb: string, bar: GridBar) => {
    if (!bar.bookingId) return;
    const err = await bookingAction(verb, bar.bookingId, bar.label);
    if (err) console.error('action failed', err);
    loadBars();
  };

  const handleSetState = async (state: string) => {
    if (!selectedRoom?.room?.id) return;
    const err = await setRoomState(selectedRoom.room.id, state, selectedRoom.name);
    if (err) console.error('room state failed', err);
    setSelectedRoom(null);
    fetchLocationsWithRooms().then(setLocations).catch(() => {});
    loadBars();
    loadAlerts();
  };

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

  // Alert actions: room alerts (id >= 30000) release the room; others log for now
  const handleAlert = async (id: number) => {
    if (id >= 30000) {
      const err = await setRoomState(id - 30000, 'ready', 'held room');
      if (err) console.error('release failed', err);
      fetchLocationsWithRooms().then(setLocations).catch(() => {});
      loadBars();
    }
    loadAlerts();
  };

  if (locLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <StaffHeader
          role="Reception"
          who="[Receptionist name]"
          locations={locations}
          location={location}
          onLocationChange={setLocation}
          menuItems={
            <>
              <Link
                to="/reception/finance"
                className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-bark hover:bg-sand-line"
              >
                Finance
              </Link>
              <Link
                to="/reception/logs"
                className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-bark hover:bg-sand-line"
              >
                Logs
              </Link>
              <Link
                to="/reception/records"
                className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-bark hover:bg-sand-line"
              >
                Records
              </Link>
            </>
          }
        />

        <div className="flex gap-3 overflow-x-auto pb-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-bark-muted">No alerts — all clear</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="flex-shrink-0 min-w-[280px]">
                <AlertCard item={a} onAction={handleAlert} />
              </div>
            ))
          )}
        </div>

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
          <Link
            to="/reception/booking"
            className="ml-auto min-h-10 rounded-xl bg-ochre px-4 text-sm font-semibold text-sand-card hover:bg-bark-deep transition-colors flex items-center justify-center"
          >
            New Booking
          </Link>
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
                            canAct
                            onAction={handleAction}
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
                zoomLevel={zoomLevel}
                canAct
                onAction={handleAction}
                summary={false}
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
                      canAct
                      onAction={handleAction}
                      onRoomClick={(roomNumber) => {
                        const room = rooms[roomNumber - 1];
                        setSelectedRoom({ name: room.name, number: roomNumber, room, bars, dayLabels: [dayLabels[0]] });
                      }}
                    />
                  </div>
                </section>
              </div>
            )}

            {viewMode !== 'monthly' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ActivitySummary
                  bars={bars}
                  rooms={rooms}
                  dayLabels={viewMode === 'overview' ? dayLabels : [dayLabels[0]]}
                  numColumns={viewMode === 'overview' ? numColumns : 1}
                  title={
                    viewMode === 'overview'
                      ? `Activities — next ${numColumns} days`
                      : viewMode === 'day' && activeDate
                      ? `Activities — ${fmtDay(activeDate)}`
                      : "Activities — today"
                  }
                />
                <FinanceCard
                  items={bars}
                  title={
                    viewMode === 'overview'
                      ? `Financials — next ${numColumns} days`
                      : viewMode === 'day' && activeDate
                      ? `Financials — ${fmtDay(activeDate)}`
                      : 'Financials — today'
                  }
                />
              </div>
            )}
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
          onSetState={handleSetState}
          canBook
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}
