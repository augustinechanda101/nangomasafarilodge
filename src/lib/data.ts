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
  const bars: GridBar[] = [];

  for (const b of rows) {
    for (const stay of b.stays ?? []) {
      const idx = roomIndexById.get(stay.room_id);
      if (idx === undefined) continue;

      const startDay = Math.floor((new Date(stay.starts_at).getTime() - windowStart) / DAY_MS);
      const endDay = Math.ceil((new Date(stay.ends_at).getTime() - windowStart) / DAY_MS);
      const start = Math.max(0, startDay);
      const end = Math.min(numDays, endDay);
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

export interface StaffActions { name: string; actions: number }
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
  staffTotals: StaffActions[];
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
  return res?.error ?? null;
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
  const [roomsRes, bookingsRes, paymentsRes, logsRes] = await Promise.all([
    supabase.from('rooms').select('id, housekeeping'),
    supabase
      .from('bookings')
      .select('id, status, expected_arrival, checkout_at, stays (room_id, starts_at, ends_at)')
      .neq('status', 'cancelled'),
    supabase.from('payments').select('amount, recorded_at, voided'),
    supabase.from('activity_log').select('id, action, at').order('at', { ascending: false }),
  ]);
  if (roomsRes.error) throw roomsRes.error;
  if (bookingsRes.error) throw bookingsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (logsRes.error) throw logsRes.error;

  const rooms = roomsRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const payments = (paymentsRes.data ?? []) as { amount: number; recorded_at: string; voided: boolean }[];
  const logs = logsRes.data ?? [];

  const today = lusakaDate(new Date().toISOString());
  const live = payments.filter((p) => !p.voided);

  // --- KPIs ---
  const inHouse = bookings.filter((b) => b.status === 'checked_in').length;
  const arrivalsToday = bookings.filter(
    (b) => b.status === 'booked' && lusakaDate(b.expected_arrival) === today,
  ).length;
  const departuresToday = bookings.filter(
    (b) => b.status === 'checked_in' && lusakaDate(b.checkout_at) === today,
  ).length;

  const paidOn = (dateStr: string) =>
    live.filter((p) => lusakaDate(p.recorded_at) === dateStr);
  const revToday = paidOn(today).reduce((s, p) => s + Number(p.amount), 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthPayments = live.filter((p) => lusakaDate(p.recorded_at) >= monthStart);
  const revMonth = monthPayments.reduce((s, p) => s + Number(p.amount), 0);

  // Occupancy month-to-date: nights slept (arrival day .. day before checkout)
  const totalRooms = rooms.length || 1;
  const daysElapsed = Number(today.slice(8)) ; // day-of-month, "2026-11-14" → 14
  let occupiedNights = 0;
  for (let d = 1; d <= daysElapsed; d++) {
    const day = `${monthStart.slice(0, 8)}${String(d).padStart(2, '0')}`;
    for (const b of bookings) {
      for (const st of b.stays ?? []) {
        const a = lusakaDate(st.starts_at);
        const c = lusakaDate(st.ends_at);
        if (a <= day && day < c) occupiedNights++;
      }
    }
  }
  const occupancy = Math.round((occupiedNights / (totalRooms * daysElapsed)) * 100);

  const kpis: Kpi[] = [
    { label: 'Revenue this month', value: `K${revMonth.toLocaleString()}`, note: `${monthPayments.length} payments · K${revToday.toLocaleString()} today` },
    { label: 'Occupancy', value: `${occupancy}%`, note: 'month to date' },
    { label: 'In house', value: String(inHouse), note: `${departuresToday} due out today` },
    { label: 'Arrivals today', value: String(arrivalsToday), note: 'expected today' },
  ];

  // --- Revenue, last 7 days (payments by recorded date, zero-filled) ---
  const revenue: RevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const day = lusakaDate(d.toISOString());
    const amount = paidOn(day).reduce((s, p) => s + Number(p.amount), 0);
    revenue.push({ day: day.slice(5), amount, today: i === 0 });
  }

  // --- Actions by staff, last 7 days (desk actions only — staff-account
  //     actions belong to the management Logs, not here) ---
  const weekAgo = lusakaDate(new Date(now.getTime() - 7 * DAY_MS).toISOString());
  const byStaff = new Map<string, number>();
  for (const l of logs) {
    if (lusakaDate(l.at) < weekAgo) continue;
    if (l.action.startsWith('staff ')) continue;
    const m = l.action.match(/— by (.+)$/);
    if (m) byStaff.set(m[1], (byStaff.get(m[1]) ?? 0) + 1);
  }
  const staffTotals: StaffActions[] = [...byStaff.entries()]
    .map(([name, actions]) => ({ name, actions }))
    .sort((a, b) => b.actions - a.actions);

  return { kpis, revenue, staffTotals };
}
