/**
 * Transitional compatibility export.
 *
 * Database queries, RPC calls, Auth, and realtime now use the project Supabase
 * client directly. File uploads remain on the dedicated R2 helpers in
 * `src/lib/storage.ts` until the Pages Functions signing endpoints are live.
 */
import { supabase as authoritativeClient } from '@/integrations/supabase/client'

// Existing pages were written against an untyped compatibility client. Keep
// that surface temporarily so the cutover can happen without weakening the
// actual Supabase session or request handling.
export const supabase: any = authoritativeClient
