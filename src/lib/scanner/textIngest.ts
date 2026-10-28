import { NotesResponseSchema, type ParsedNoteNode } from '../../../supabase/functions/_shared/notes';
import { localToday } from '@/lib/dates';
import { assertSupabaseConfigured, supabase } from '@/lib/supabase';

export type { NoteActivity, ParsedNoteNode } from '../../../supabase/functions/_shared/notes';

export type ParsedNotes = {
  nodes: ParsedNoteNode[];
  /** The cities in the order the notes visit them. */
  regions: string[];
  /** True when the notes cover more than one city: offer to chain them into a route. */
  isMultiCityRoute: boolean;
};

const regionKey = (r: string) => r.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Reads pasted Notes-app text ("Ibiza Nov 9, clubbing at Pacha, then fly to
 * Barcelona on the 12th for dinner at Paradiso") into places. The parse-notes
 * worker does the reading; the multi-city check runs here, on the device.
 */
export async function parseRawNotesText(rawText: string): Promise<ParsedNotes> {
  const text = rawText.trim();
  if (text.length < 3) throw new Error('Paste a few words of notes first.');
  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke('parse-notes', { body: { text, today: localToday() } });
  if (error) {
    const context = (error as { context?: unknown }).context;
    const detail = context instanceof Response ? ((await context.json().catch(() => null)) as { error?: string } | null)?.error : null;
    throw new Error(detail ?? 'Couldn’t read those notes.');
  }
  const { nodes } = NotesResponseSchema.parse(data);
  if (nodes.length === 0) throw new Error('No places found in those notes.');

  const regions: string[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    const key = regionKey(n.inferredRegion);
    if (!seen.has(key)) {
      seen.add(key);
      regions.push(n.inferredRegion.trim());
    }
  }
  return { nodes, regions, isMultiCityRoute: regions.length > 1 };
}

export { regionKey };
