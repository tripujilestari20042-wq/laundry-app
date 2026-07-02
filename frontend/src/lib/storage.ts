import { createClient } from '@/lib/supabase/client';

const BUCKET = 'service-images';
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format file harus JPG, PNG, WebP, atau GIF';
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Ukuran file maksimal ${MAX_SIZE_MB}MB`;
  }
  return null;
}

export async function uploadServiceImage(file: File): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `services/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Gagal upload gambar: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteServiceImage(imageUrl: string): Promise<void> {
  try {
    const supabase = createClient();
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;

    const filePath = decodeURIComponent(imageUrl.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([filePath]);
  } catch {
    // Non-blocking — old image cleanup is best-effort
  }
}
