'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { isAllowedMediaPublicId } from '@/lib/upload-security';

export async function deleteMedia(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; email?: string; role?: string } | undefined;

    if (!session || !sessionUser) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    if (sessionUser.role !== 'admin') {
      return { success: false, error: 'Forbidden: Administrator role required' };
    }

    await connectToDatabase();
    const dbUser = sessionUser.email
      ? (await User.findOne({ email: sessionUser.email.toLowerCase() }).select('role').lean() as {
          role?: string;
        } | null)
      : null;

    if (!dbUser || dbUser.role !== 'admin') {
      return { success: false, error: 'Forbidden: Active administrator privileges required' };
    }

    if (!isAllowedMediaPublicId(publicId)) {
      return {
        success: false,
        error: 'Invalid or protected media path. Only authorized storefront media folders can be deleted.',
      };
    }

    const result = await cloudinary.uploader.destroy(publicId.trim(), {
      resource_type: 'image',
      invalidate: true,
    });

    if (result?.result !== 'ok' && result?.result !== 'not found') {
      return { success: false, error: 'Media provider rejected deletion request' };
    }

    revalidatePath('/admin/media');
    return { success: true };
  } catch (error) {
    console.error('[Admin Media] Failed to delete media:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Failed to delete media asset' };
  }
}
