import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import MediaClient from './MediaClient';
import { deleteMedia } from './actions';
import { isAllowedMediaPublicId } from '@/lib/upload-security';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== 'admin') {
    redirect('/admin');
  }

  let images: any[] = [];
  let error = null;

  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 100,
      resource_type: 'image',
    });
    images = (result.resources || []).filter((img: { public_id?: string }) =>
      isAllowedMediaPublicId(img.public_id)
    );
  } catch (err: any) {
    console.error("Failed to fetch Cloudinary media:", err);
    error = "Failed to load media from Cloudinary. Make sure your Cloudinary keys are configured.";
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Media Library</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">Manage all images uploaded to your store.</p>
        </div>
        <div className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">
          Total Assets: {images.length}
        </div>
      </div>

      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {error ? (
          <div className="text-red-500 font-bold text-sm uppercase tracking-wider p-8 border-2 border-dashed border-red-500 text-center">
            {error}
          </div>
        ) : images.length === 0 ? (
          <div className="text-gray-400 font-bold text-sm uppercase tracking-wider p-12 text-center border-2 border-dashed border-gray-300">
            No images uploaded yet.
          </div>
        ) : (
          <MediaClient initialImages={images} deleteMedia={deleteMedia} />
        )}
      </div>
    </div>
  );
}
