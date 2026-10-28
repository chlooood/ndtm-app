import type { TripScan } from '@/lib/scanner/schema';

export type BookingLinkKind = 'transport' | 'lodging' | 'map' | 'activity';

/** An external booking page. ndtm never takes payments itself. */
export type BookingLink = {
  label: string;
  url: string;
  kind: BookingLinkKind;
};

export type Place = {
  name: string;
  lat: number;
  lng: number;
};

export type Logistics =
  | {
      mode: 'rail';
      publicTransitFeasible: true;
      links: BookingLink[];
    }
  | {
      mode: 'driving_carpool';
      publicTransitFeasible: false;
      /** Why we are routing by road, shown to the user. */
      reason: string;
      links: BookingLink[];
    };

export type TripStop = {
  id: string;
  scan: TripScan;
  /** ISO calendar date (YYYY-MM-DD), inclusive. */
  startDate: string;
  /** Number of nights. The stop ends on startDate + nights. */
  nights: number;
  logistics: Logistics;
};

export type Trip = {
  id: string;
  title: string;
  stops: TripStop[];
  createdAt: string;
  /** Set when the trip was opened from a friend's share link. */
  mirroredFrom?: string;
};
