// parse-notes: turns pasted Notes-app text into an ordered list of places.
//
//   POST { text, today }  ->  { nodes: ParsedNoteNode[] }
//
// Claude reads the text and fills a strict schema (structured outputs). The
// worker then drops anything malformed and turns empty dates into "absent".
// The app decides what to do with the places; nothing here books anything.
//
// Secret: ANTHROPIC_API_KEY.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { NotesExtractionSchema, NotesRequestSchema, type ParsedNoteNode, ParsedNoteNodeSchema } from '../_shared/notes.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You read travel notes that a student pasted from their phone's Notes app and list the places in them, in the order the trip would happen.

For each place:
- placeName: the specific venue or spot as written ("Pacha", "Paradiso", "Refuge du Lac Blanc"). If the note only names a city with no venue, use the city.
- inferredRegion: the city or area it is in ("Ibiza", "Barcelona", "Chamonix").
- activityType: "clubbing" for clubs and bars, "beach", "restaurant" for food and drink spots, "alpine_backpacking" for hikes, huts, refuges and trailheads, otherwise "general".
- inferredDate: the date in YYYY-MM-DD if the notes give or imply one, using the user's date to fill in the month and year ("the 12th" after "Nov 9" means the 12th of November). Use an empty string if there is no date.

Keep travel legs like "fly to Barcelona" only as the region of the next places; don't list the flight itself. Don't invent places that aren't in the text.`;

const anthropic = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = NotesRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: 'Body must be { text, today }' }, 400);

  try {
    const message = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: zodOutputFormat(NotesExtractionSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Today is ${body.data.today}.\n\nNotes:\n${body.data.text}` }],
    });
    if (message.stop_reason === 'refusal') return json({ error: 'These notes could not be read' }, 422);
    if (message.stop_reason === 'max_tokens') return json({ error: 'Those notes are too long; paste one trip at a time' }, 413);

    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'No places found' }, 502);
    const raw = NotesExtractionSchema.parse(JSON.parse(text.text));

    const nodes: ParsedNoteNode[] = [];
    for (const n of raw.nodes) {
      const parsed = ParsedNoteNodeSchema.safeParse({ ...n, inferredDate: n.inferredDate || undefined });
      if (parsed.success) nodes.push(parsed.data);
    }
    return json({ nodes }, 200);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Busy, try again in a moment' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API error', error.status, error.message);
      return json({ error: 'Could not read the notes' }, 502);
    }
    console.error(error);
    return json({ error: 'Could not read the notes' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
