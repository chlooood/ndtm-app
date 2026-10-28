/** Lets ndtm create and edit events it makes in your Google Calendar, nothing else. */
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export type GoogleAccount = {
  email: string;
  name: string | null;
  photo: string | null;
};
