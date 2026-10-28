import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { ScanResponseSchema, type ScanResponse } from '@/lib/scanner/schema';
import { assertSupabaseConfigured, supabase } from '@/lib/supabase';

export const SCANS_BUCKET = 'scans';

export type ScanSource = 'library' | 'camera';

export class ScanCancelledError extends Error {
  constructor() {
    super('No image selected');
  }
}

/** Opens the camera roll or camera. Throws ScanCancelledError if the user backs out. */
export async function pickScanImage(source: ScanSource): Promise<ImagePicker.ImagePickerAsset> {
  // quality < 1 re-encodes to JPEG, which also converts iOS HEIC photos
  // into a format the vision API accepts.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8 };

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera access is off. Enable it in Settings to scan with the camera.');
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) throw new ScanCancelledError();
  return result.assets[0];
}

/** Uploads the picked file to Supabase Storage and returns its object path. */
export async function uploadScanImage(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  assertSupabaseConfigured();
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${Crypto.randomUUID()}.${extension}`;

  const body = await (await fetch(asset.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(SCANS_BUCKET).upload(path, body, { contentType });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Runs the scan-trip vision worker on an uploaded screenshot and validates its output. */
export async function parseTripFromImage(storagePath: string): Promise<ScanResponse> {
  const { data, error } = await supabase.functions.invoke('scan-trip', { body: { storagePath } });
  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? 'The vision engine could not read this screenshot.');
  }
  return ScanResponseSchema.parse(data);
}

/**
 * Asset upload -> vision parser, end to end. `onStage` reports progress so
 * the UI can switch from "uploading" to "analyzing".
 */
export async function scanTripFromAsset(
  asset: ImagePicker.ImagePickerAsset,
  onStage?: (stage: 'uploading' | 'analyzing') => void,
): Promise<ScanResponse> {
  onStage?.('uploading');
  const storagePath = await uploadScanImage(asset);
  onStage?.('analyzing');
  return parseTripFromImage(storagePath);
}

// FunctionsHttpError carries the worker's JSON error body in `context`.
async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;
  try {
    const body = (await context.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}
