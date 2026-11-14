export type BarKind = 'checkedIn' | 'awaiting' | 'hold' | 'overdue' | 'inspect';

export interface GridRoom { id?: number; name: string; state: string; type?: string; rate?: number; location?: string }
// room is 1-based; start/end are day indexes (end exclusive); invoice links group bookings;
// bookingId is the Supabase booking row this bar represents
export interface GridBar {
  room: number; start: number; end: number; kind: BarKind; label: string;
  invoice?: string; amount?: number; method?: string; bookingId?: number;
}
export interface AlertItem { id: number; tag: string; tone: 'bad' | 'warn'; text: string; action: string; location?: string }

export interface BookingDraft {
  location: string;
  guestName: string;
  phone: string;
  rooms: string[]; // one booking per room is created, all sharing this draft's invoice
  nights: number;
  arrival: string; // date (YYYY-MM-DD)
  arrivalTime?: string; // optional (HH:MM) — for odd-hours arrivals
  amount: string;
  method: string;
  reference: string;
  invoice: string;
}

export interface Kpi { label: string; value: string; note: string }
export interface RevenuePoint { day: string; amount: number; today?: boolean }
export interface StaffTotal { name: string; bookings: number; amount: number }
export interface PendingStaff { id: number; name: string }
export interface FeedItem { id: number; title: string; meta: string; unread: boolean }

export interface BookingRecord {
  guest: string;
  phone: string;
  room: string;
  location: string;
  checkIn: string;
  nights: number;
  amount: number;
  method: string;
  invoice: string;
  status: string;
}

export interface LogEvent {
  time: string;
  text: string;
  tone: 'in' | 'out' | 'money' | 'info';
}
