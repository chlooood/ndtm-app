// Contract for the parse-notes worker, shared by the app and the edge function.
import { z } from 'zod';

export const NOTE_ACTIVITIES = ['clubbing', 'beach', 'restaurant', 'alpine_backpacking', 'general'] as const;
export type NoteActivity = (typeof NOTE_ACTIVITIES)[number];

/** What the model returns. Empty strings stand for "not stated", since structured outputs need every field. */
export const NotesExtractionSchema = z.object({
  nodes: z.array(
    z.object({
      placeName: z.string(),
      inferredRegion: z.string(),
      activityType: z.enum(NOTE_ACTIVITIES),
      inferredDate: z.string(),
    }),
  ),
});

/** One place found in pasted notes. */
export const ParsedNoteNodeSchema = z.object({
  placeName: z.string().min(1),
  /** The city or area, e.g. "Ibiza" or "Barcelona". */
  inferredRegion: z.string().min(1),
  activityType: z.enum(NOTE_ACTIVITIES),
  /** ISO date (YYYY-MM-DD) when the notes give one. */
  inferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type ParsedNoteNode = z.infer<typeof ParsedNoteNodeSchema>;

export const NotesRequestSchema = z.object({
  text: z.string().min(3).max(8000),
  /** The user's local date, so "the 12th" resolves to the right month and year. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const NotesResponseSchema = z.object({ nodes: z.array(ParsedNoteNodeSchema) });
export type NotesResponse = z.infer<typeof NotesResponseSchema>;
