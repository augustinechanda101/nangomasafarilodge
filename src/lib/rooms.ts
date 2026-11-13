import type { Room } from '../types';

const SAMPLE: Room[] = [
  { id: 1, number: '1', type: null, nightlyRate: null, status: 'available' },
  { id: 2, number: '2', type: null, nightlyRate: null, status: 'booked' },
  { id: 3, number: '3', type: null, nightlyRate: null, status: 'available' },
  { id: 4, number: '4', type: null, nightlyRate: null, status: 'processing' },
  { id: 5, number: '5', type: null, nightlyRate: null, status: 'available' },
  { id: 6, number: '6', type: null, nightlyRate: null, status: 'booked' },
  { id: 7, number: '7', type: null, nightlyRate: null, status: 'available' },
  { id: 8, number: '8', type: null, nightlyRate: null, status: 'available' },
];

// Swap the body for the Express call when the backend is ready:
//   const res = await fetch(`/api/rooms/availability?from=${checkIn}&to=${checkOut}`);
//   return res.json();
export async function fetchRooms(_checkIn: string, _checkOut: string): Promise<Room[]> {
  return SAMPLE;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function whatsappLink(room: Room, checkIn: string, checkOut: string): string {
  const number = import.meta.env.VITE_WHATSAPP_NUMBER ?? '';
  const text = `Hi, I'd like Room ${room.number} from ${fmt(checkIn)} to ${fmt(checkOut)}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
