export type RoomStatus = 'available' | 'processing' | 'booked';

export interface Room {
  id: number;
  number: string;
  type: string | null;
  nightlyRate: number | null;
  status: RoomStatus; // for the dates the guest picked
}
