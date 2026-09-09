import cloudinary from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import MediaClient from './MediaClient';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  let images: any[] = [];
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 100,
      resource_type: 'image',
      direction: 'desc',
    });
    images = result.resources;
  } catch (error) {
    console.error('Error fetching media from Cloudinary:', error);
  }

  async function deleteMedia(publicId: string) {
    'use server';
    try {
      await cloudinary.uploader.destroy(publicId);
      revalidatePath('/admin/media');
      return { success: true };
    } catch (error) {
      console.error("Failed to delete media:", error);
      return { success: false };
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Media Library</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">Manage all images uploaded to your store.</p>
        </div>
      </div>
      
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 min-h-[400px]">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-16 h-16 border-4 border-black border-dashed rounded-none flex items-center justify-center">
                <span className="font-black text-2xl">?</span>
             </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">No media found. Upload images while adding products.</p>
          </div>
        ) : (
          <MediaClient initialImages={images} deleteMedia={deleteMedia} />
        )}
      </div>
    </div>
  );
}
