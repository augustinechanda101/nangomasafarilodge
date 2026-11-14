import { supabase } from './supabase';
import type { AlertItem, BookingDraft, BookingRecord, GridBar, GridRoom, Kpi, LogEvent, RevenuePoint } from './staffTypes';

export interface LocationWithRooms {
  id: number;
  name: string;
  rooms: GridRoom[];
}

const DAY_MS = 86_400_000;

// PostgREST returns many-to-one embeds (stay→room, room→location, log→user)
// as single OBJECTS, not arrays — handle both shapes defensively
const firstOf = <T,>(v: T[] | T | null | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined);

// Fetch locations with their rooms, mapped to the UI's GridRoom shape
export async function fetchLocationsWithRooms(): Promise<LocationWithRooms[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, rooms (id, number, type, nightly_rate, housekeeping)')
    .order('id');
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    rooms: (l.rooms ?? [])
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      .map((r) => ({
        id: r.id,
        name: r.number,
        state: r.housekeeping === 'ready' ? 'Available' : r.housekeeping,
        type: r.type ?? undefined,
        rate: Number(r.nightly_rate) || undefined,
        location: l.name,
      })),
  }));
}

// Currently signed-in staff member — stamped onto every activity log entry
let currentUser: { id: string; name: string } | null = null;
export function setCurrentUser(u: { id: string; name: string } | null) {
  currentUser = u;
}

// Ping live panels (activity/logs) that new entries exist
const pingActivity = () => window.dispatchEvent(new Event('nangoma-activity-changed'));

// Create a booking via the atomic DB function (booking + stays + payment + log)
export async function createBooking(
  locationId: number,
  draft: BookingDraft,
): Promise<{ booking_id: number; invoice: string } | { error: string }> {
  const arrival = new Date(draft.arrival + 'T' + (draft.arrivalTime || '14:00'));
  const { data, error } = await supabase.rpc('create_booking', {
    p_location_id: locationId,
    p_room_numbers: draft.rooms,
    p_guest_name: draft.guestName,
    p_guest_phone: draft.phone,
    p_expected_arrival: arrival.toISOString(),
    p_nights: draft.nights,
    p_amount: Number(draft.amount) || 0,
    p_method: draft.method,
    p_reference: draft.reference || null,
    p_invoice: draft.invoice || null,
    p_created_by: currentUser?.name ?? null,
  });
  if (error) return { error: error.message };
  pingActivity();
  return data;
}

interface BookingRow {
  id: number;
  invoice: string | null;
  guest_name: string;
  status: string;
  expected_arrival: string;
  checkout_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  stays: {
    room_id: number;
    starts_at: string;
    ends_at: string;
    rooms: { number: string; locations: { name: string } | null } | null;
  }[];
  payments: { amount: number; method: string; voided: boolean }[] | null;
}

async function fetchBookingRows(): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, invoice, guest_name, status, expected_arrival, checkout_at, checked_in_at, checked_out_at, stays (room_id, starts_at, ends_at, rooms ( number )), payments (amount, method, voided)')
    .neq('status', 'cancelled');
  if (error) throw error;
  // Runtime embeds are objects (many-to-one); Supabase's typegen says arrays — cast
  return (data ?? []) as unknown as BookingRow[];
}

function kindFor(status: string): GridBar['kind'] {
  return status === 'checked_in' ? 'checkedIn'
    : status === 'booked' ? 'awaiting'
    : status === 'checked_out' ? 'inspect'
    : 'hold';
}

const lusakaTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lusaka', hour: '2-digit', minute: '2-digit' });

function labelFor(b: BookingRow): string {
  if (b.status === 'booked') return `${b.guest_name} · awaiting arrival`;
  if (b.status === 'checked_in') {
    return b.checked_in_at ? `${b.guest_name} · checked in ${lusakaTime(b.checked_in_at)}` : `${b.guest_name} · checked in`;
  }
  if (b.status === 'checked_out') {
    return b.checked_out_at ? `${b.guest_name} · checked out ${lusakaTime(b.checked_out_at)}` : `${b.guest_name} · checked out`;
  }
  return `${b.guest_name} · ${b.status.replace('_', ' ')}`;
}

function paymentOf(b: BookingRow): { amount?: number; method?: string } {
  const p = (b.payments ?? []).find((x) => !x.voided);
  return p ? { amount: Number(p.amount), method: p.method } : {};
}

// Overview window: bars positioned by day offset within the visible window.
// Rooms are indexed by database ID — room NAMES repeat across locations
// (Dam Lodge and Farm House both have "Room 1"), so name-based maps collide.
export async function fetchWindowBars(
  windowStartISO: string,
  numDays: number,
  roomIndexById: Map<number, number>,
): Promise<GridBar[]> {
  const rows = await fetchBookingRows();
  const windowStart = new Date(windowStartISO + 'T00:00:00').getTime();
  // Day indexes come from LUSAKA CALENDAR DATES: a bar spans [arrival date,
  // checkout date) — 1 night = exactly 1 column, and the checkout day's
  // column stays sellable (the guest is gone by 10:00).
  const dayIndex = (iso: string) => {
    const d = lusakaDate(iso);
    return Math.round((new Date(d + 'T00:00:00').getTime() - windowStart) / DAY_MS);
  };
  const bars: GridBar[] = [];

  for (const b of rows) {
    for (const stay of b.stays ?? []) {
      const idx = roomIndexById.get(stay.room_id);
      if (idx === undefined) continue;

      const start = Math.max(0, dayIndex(stay.starts_at));
      const end = Math.min(numDays, dayIndex(stay.ends_at));
      if (end <= start) continue;

      bars.push({
        room: idx + 1,
        start,
        end,
        kind: kindFor(b.status),
        label: labelFor(b),
        invoice: b.invoice ?? undefined,
        bookingId: b.id,
        ...paymentOf(b),
      });
    }
  }
  return bars;
}

// Real booking records from the DB (empty until bookings exist)
export async function fetchRecords(): Promise<BookingRecord[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, invoice, guest_name, guest_phone, status, expected_arrival, checkout_at, stays (room_id, rooms ( number, locations ( name ) )), payments (amount, method, voided)')
    .neq('status', 'cancelled')
    .order('expected_arrival', { ascending: false });
  if (error) throw error;

  const records: BookingRecord[] = [];
  for (const b of data ?? []) {
    for (const stay of b.stays ?? []) {
      const room = firstOf(stay.rooms);
      const p = (b.payments ?? []).find((x) => !x.voided);
      const nights = Math.max(1, Math.round(
        (new Date(b.checkout_at).getTime() - new Date(b.expected_arrival).getTime()) / DAY_MS,
      ));
      records.push({
        guest: b.guest_name,
        phone: b.guest_phone ?? '',
        room: room?.number ?? `#${stay.room_id}`,
        location: firstOf(room?.locations)?.name ?? '',
        checkIn: `${new Date(b.expected_arrival).toLocaleDateString('en-CA', { timeZone: 'Africa/Lusaka' })} ${lusakaTime(b.expected_arrival)}`,
        nights,
        amount: p ? Number(p.amount) : 0,
        method: p?.method ?? '',
        invoice: b.invoice ?? '',
        status: b.status === 'checked_in' ? 'In house' : b.status === 'checked_out' ? 'Completed' : 'Booked',
      });
    }
  }
  return records;
}

// Real event log from the activity_log table, filtered to the selected Lusaka date.
// scope 'reception': desk operations only (bookings, check-ins/outs, room states, payments)
// scope 'management': everything, including staff management actions
export async function fetchLogs(dateStr: string, scope: 'reception' | 'management' = 'reception'): Promise<LogEvent[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, at, users ( name )')
    .order('at', { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .filter((l) => new Date(l.at).toLocaleDateString('en-CA', { timeZone: 'Africa/Lusaka' }) === dateStr)
    .filter((l) => scope === 'management' || !l.action.startsWith('staff '))
    .map((l) => {
      const row = l as { id: number; action: string; at: string; users?: { name?: string } | null };
      const m = row.action.match(/ — by (.+)$/);
      const action = row.action.toLowerCase();
      const tone: LogEvent['tone'] =
        action.startsWith('checkin') ? 'in'
        : action.startsWith('checkout') ? 'out'
        : action.includes('payment') ? 'money'
        : 'info';
      return {
        time: new Date(row.at).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lusaka', hour: '2-digit', minute: '2-digit' }),
        text: row.action,
        tone,
        who: firstOf(row.users)?.name ?? m?.[1] ?? undefined,
      };
    })
    .reverse(); // chronological order
}

export async function bookingAction(verb: string, bookingId: number, label: string): Promise<string | null> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (verb === 'checkin') {
    patch.status = 'checked_in';
    patch.checked_in_at = now;
  } else if (verb === 'checkout') {
    patch.status = 'checked_out';
    patch.checked_out_at = now;
  } else if (verb === 'mark-ready') {
    patch.status = 'booked';
  } else if (verb === 'release') {
    patch.status = 'cancelled';
  }
  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
  if (error) return error.message;
  await supabase.from('activity_log').insert({
    action: `${verb}: ${label}${currentUser ? ` — by ${currentUser.name}` : ''}`,
    booking_id: bookingId,
    user_id: currentUser?.id,
  });
  pingActivity();
  return null;
}

// Room state actions: processing / maintenance / unavailable / back to ready
export async function setRoomState(roomId: number, housekeeping: string, roomLabel: string): Promise<string | null> {
  const { error } = await supabase.from('rooms').update({ housekeeping }).eq('id', roomId);
  if (error) return error.message;
  await supabase.from('activity_log').insert({
    action: `room ${housekeeping}: ${roomLabel}${currentUser ? ` — by ${currentUser.name}` : ''}`,
    user_id: currentUser?.id,
  });
  pingActivity();
  return null;
}

// Hold room(s) for 3 hours: room state 'hold' + a holds row with expiry + log.
// A hold is NOT a booking — the room reads "held" everywhere.
export async function holdRooms(roomIds: number[], note: string, roomLabel: string): Promise<string | null> {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 3 * 3_600_000).toISOString();
  for (const id of roomIds) {
    const err = await setRoomState(id, 'hold', roomLabel);
    if (err) return err;
    const { error } = await supabase.from('holds').insert({
      room_id: id,
      starts_at: now,
      ends_at: expires,
      expires_at: expires,
      note: note || null,
      set_by: currentUser?.id,
      released: false,
    });
    if (error) return error.message;
  }
  pingActivity();
  return null;
}

// Live alerts derived from real data:
//  - overdue checkout: checked-in booking past its checkout time
//  - awaiting check-in: booked guest whose arrival time has passed
//  - needs inspection / awaiting cleaning: room housekeeping state
export async function fetchAlerts(): Promise<AlertItem[]> {
  const now = new Date().toISOString();
  const alerts: AlertItem[] = [];
  const todayStr = lusakaDate(now);
  // "Today" when it's today, otherwise just the date — never a time
  const dayLabel = (iso: string) =>
    lusakaDate(iso) === todayStr
      ? 'Today'
      : new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Lusaka', day: 'numeric', month: 'short' });

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, invoice, guest_name, status, expected_arrival, checkout_at, stays (room_id, rooms ( number, locations ( name ) ))')
    .in('status', ['checked_in', 'booked']);
  if (error) throw error;

  for (const b of bookings ?? []) {
    for (const stay of b.stays ?? []) {
      const room = firstOf(stay.rooms);
      const roomNumber = room?.number ?? `#${stay.room_id}`;
      const locName = firstOf(room?.locations)?.name;
      // Alert text: guest name · room number · expected/checkout date.
      // Location shows in the card's corner — no invoice in alerts.
      if (b.status === 'checked_in' && b.checkout_at < now) {
        alerts.push({
          id: 10000 + b.id,
          tag: 'Overdue checkout',
          tone: 'bad',
          text: `${b.guest_name} · ${roomNumber} · checkout was ${dayLabel(b.checkout_at)}`,
          action: 'Check out',
          location: locName,
          status: 'in house',
        });
      } else if (b.status === 'booked' && b.expected_arrival <= now) {
        alerts.push({
          id: 20000 + b.id,
          tag: 'Awaiting check-in',
          tone: 'warn',
          text: `${b.guest_name} · ${roomNumber} · awaiting arrival`,
          action: 'Check in',
          location: locName,
          status: 'booked',
        });
      }
    }
  }

  // Rooms on hold — awaiting payment, follow up
  const { data: heldRooms } = await supabase
    .from('rooms')
    .select('id, number, locations ( name )')
    .eq('housekeeping', 'hold');
  for (const r of heldRooms ?? []) {
    alerts.push({
      id: 30000 + r.id,
      tag: 'Room on hold',
      tone: 'warn',
      text: `${r.number} · awaiting payment`,
      action: 'Mark Available',
      location: (r.locations as unknown as { name: string } | null)?.name ?? undefined,
      status: 'held',
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// GM dashboard — everything computed from real tables, Lusaka time
// ---------------------------------------------------------------------------

const lusakaDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lusaka' });

export interface ActivityEntry { id: number; text: string; date: string; time: string; who?: string }
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'reception' | 'gm';
  status: string;
  department: string;
}
export interface GmData {
  kpis: Kpi[];
  revenue: RevenuePoint[];
  revenueMonths: RevenuePoint[];
}

// Activity entries for a Lusaka date range (inclusive), chronological.
// scope 'reception': desk activities only — staff-account actions live in management Logs.
export async function fetchActivityRange(
  fromStr: string,
  toStr: string,
  scope: 'reception' | 'management' = 'reception',
): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, at, users ( name )')
    .order('at', { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .filter((l) => {
      const d = lusakaDate(l.at);
      return d >= fromStr && d <= toStr;
    })
    .filter((l) => scope === 'management' || !l.action.startsWith('staff '))
    .map((l) => {
      const row = l as { id: number; action: string; at: string; users?: { name?: string } | null };
      const m = row.action.match(/ — by (.+)$/);
      return {
        id: row.id,
        text: row.action,
        date: lusakaDate(row.at),
        time: new Date(row.at).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lusaka', hour: '2-digit', minute: '2-digit' }),
        who: firstOf(row.users)?.name ?? m?.[1] ?? undefined,
      };
    })
    .reverse();
}

// Everything the booking form needs to compute per-date vacancies client-side
export interface VacancyRoom { id: number; number: string; state: string; locationName: string }
export interface VacancyData {
  rooms: VacancyRoom[];
  stays: { room_id: number; starts_at: string; ends_at: string }[];
}

export async function fetchVacancyData(): Promise<VacancyData> {
  const [roomsRes, bookingsRes] = await Promise.all([
    supabase.from('rooms').select('id, number, housekeeping, locations ( name )'),
    supabase
      .from('bookings')
      .select('stays (room_id, starts_at, ends_at)')
      .neq('status', 'cancelled'),
  ]);
  if (roomsRes.error) throw roomsRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  const rooms: VacancyRoom[] = (roomsRes.data ?? []).map((r) => {
    const row = r as { id: number; number: string; housekeeping: string; locations?: { name?: string } | { name?: string }[] | null };
    return {
      id: row.id,
      number: row.number,
      state: row.housekeeping,
      locationName: firstOf(row.locations)?.name ?? '',
    };
  });
  const stays = (bookingsRes.data ?? []).flatMap((b) => {
    const row = b as { stays?: { room_id: number; starts_at: string; ends_at: string }[] | null };
    return row.stays ?? [];
  });
  return { rooms, stays };
}

// Employee list for the GM's Staff tab (needs the "authenticated read users" policy)
export async function fetchStaffList(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, status, department')
    .order('department')
    .order('name');
  if (error) throw error;
  return (data ?? []) as StaffMember[];
}

// Add a staff member: creates the login + profile (GM only, via create_staff)
export async function addStaff(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_staff', {
    p_name: input.name,
    p_email: input.email,
    p_password: input.password,
    p_role: input.role,
    p_department: input.department,
  });
  if (error) return error.message;
  const res = data as { error?: string } | null;
  if (res?.error) return res.error;

  // Welcome email via the send-staff-welcome edge function (no-op if not deployed yet)
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && anonKey) {
    fetch(`${url}/functions/v1/send-staff-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ name: input.name, email: input.email }),
    }).catch(() => {});
  }
  return null;
}

// Suspend / reinstate a staff member (GM only, via set_staff_status)
export async function setStaffStatus(id: string, status: 'approved' | 'disabled'): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_staff_status', { p_id: id, p_status: status });
  if (error) return error.message;
  const res = data as { error?: string } | null;
  return res?.error ?? null;
}

// Permanently delete a staff member: login + profile (GM only, via delete_staff)
export async function deleteStaff(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('delete_staff', { p_id: id });
  if (error) return error.message;
  const res = data as { error?: string } | null;
  return res?.error ?? null;
}

export async function fetchGmData(): Promise<GmData> {
  const [roomsRes, bookingsRes, paymentsRes] = await Promise.all([
    supabase.from('rooms').select('id, housekeeping, locations ( name )'),
    supabase
      .from('bookings')
      .select('id, status, expected_arrival, checkout_at, stays (room_id, starts_at, ends_at)')
      .neq('status', 'cancelled'),
    supabase.from('payments').select('amount, recorded_at, voided'),
  ]);
  if (roomsRes.error) throw roomsRes.error;
  if (bookingsRes.error) throw bookingsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const rooms = (roomsRes.data ?? []) as { id: number; housekeeping: string; locations?: { name?: string } | { name?: string }[] | null }[];
  const bookings = bookingsRes.data ?? [];
  const payments = (paymentsRes.data ?? []) as { amount: number; recorded_at: string; voided: boolean }[];

  const today = lusakaDate(new Date().toISOString());
  const now = new Date();
  const live = payments.filter((p) => !p.voided);

  // --- KPIs: the four operating questions ---
  // Rooms per location (by database ID — names repeat across locations)
  const roomLoc = new Map<number, string>();
  const locTotals = new Map<string, number>();
  for (const r of rooms) {
    const loc = firstOf(r.locations)?.name ?? 'Rooms';
    roomLoc.set(r.id, loc);
    locTotals.set(loc, (locTotals.get(loc) ?? 0) + 1);
  }

  // 1. Tonight: rooms whose stay covers the night of today
  const soldRoomIds = new Set<number>();
  for (const b of bookings) {
    for (const st of (b as { stays?: { room_id: number; starts_at: string; ends_at: string }[] | null }).stays ?? []) {
      if (lusakaDate(st.starts_at) <= today && today < lusakaDate(st.ends_at)) soldRoomIds.add(st.room_id);
    }
  }
  const soldPerLoc = new Map<string, number>();
  for (const id of soldRoomIds) {
    const loc = roomLoc.get(id);
    if (loc) soldPerLoc.set(loc, (soldPerLoc.get(loc) ?? 0) + 1);
  }

  // 2. Today's money
  const todayPayments = live.filter((p) => lusakaDate(p.recorded_at) === today);
  const revToday = todayPayments.reduce((s, p) => s + Number(p.amount), 0);

  // 3. Due out tomorrow: rooms freeing up in the morning (the selling picture for tomorrow)
  const tomorrow = lusakaDate(new Date(now.getTime() + DAY_MS).toISOString());
  const dueOutTomorrow = bookings.filter(
    (b) => (b as { status: string }).status === 'checked_in' && lusakaDate((b as { checkout_at: string }).checkout_at) === tomorrow,
  ).length;

  // 4. Arrivals today: expected today (arrived or still awaited)
  const arrivalsToday = bookings.filter((b) => {
    const row = b as { status: string; expected_arrival: string };
    return lusakaDate(row.expected_arrival) === today && (row.status === 'booked' || row.status === 'checked_in');
  });
  const awaitedToday = arrivalsToday.filter((b) => (b as { status: string }).status === 'booked').length;

  const kpis: Kpi[] = [
    { label: 'Tonight', value: `${soldRoomIds.size} / ${rooms.length}`, note: 'rooms sold for tonight',
      columns: [...locTotals.entries()].map(([loc, n]) => ({ label: loc, value: `${soldPerLoc.get(loc) ?? 0}/${n}` })) },
    { label: "Today's money", value: `K${revToday.toLocaleString()}`, note: `${todayPayments.length} payments recorded` },
    { label: 'Guest flow', value: '', note: `${awaitedToday} still awaited today`,
      columns: [
        { label: 'Arrivals today', value: String(arrivalsToday.length), sub: `${awaitedToday} still awaited` },
        { label: 'Due out tomorrow', value: String(dueOutTomorrow), sub: 'rooms freeing up' },
      ] },
  ];

  // --- Revenue, last 7 days (payments by recorded date, zero-filled) ---
  const revenue: RevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const day = lusakaDate(d.toISOString());
    const amount = live.filter((p) => lusakaDate(p.recorded_at) === day).reduce((s, p) => s + Number(p.amount), 0);
    revenue.push({ day: day.slice(5), amount, today: i === 0 });
  }

  // --- Revenue, last 7 months (payments by recorded month, zero-filled) ---
  const revenueMonths: RevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const amount = live.filter((p) => lusakaDate(p.recorded_at).slice(0, 7) === prefix).reduce((s, p) => s + Number(p.amount), 0);
    const label = d.getFullYear() === now.getFullYear()
      ? d.toLocaleDateString('en-GB', { month: 'short' })
      : `${d.toLocaleDateString('en-GB', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
    revenueMonths.push({ day: label, amount, today: i === 0 });
  }

  return { kpis, revenue, revenueMonths };
}
