'use client';

import { useState } from 'react';
import { Copy, Trash, Check, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface MediaClientProps {
  initialImages: any[];
  deleteMedia: (publicId: string) => Promise<{ success: boolean }>;
}

export default function MediaClient({ initialImages, deleteMedia }: MediaClientProps) {
  const [images, setImages] = useState(initialImages);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDelete = async (publicId: string) => {
    if (!confirm("Are you sure you want to delete this image? It might be used by a product.")) return;
    
    setDeletingId(publicId);
    const res = await deleteMedia(publicId);
    if (res.success) {
      setImages(images.filter(img => img.public_id !== publicId));
    } else {
      alert("Failed to delete image.");
    }
    setDeletingId(null);
  };

  const handleCopy = (url: string, publicId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {images.map((img) => (
        <div key={img.public_id} className="group relative aspect-square border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
          <div className="absolute inset-0 p-2">
             <div className="relative w-full h-full border-2 border-transparent group-hover:border-black transition-colors">
                <Image 
                    src={img.secure_url} 
                    alt={img.public_id} 
                    fill 
                    className="object-contain p-1"
                    sizes="(max-width: 768px) 50vw, 25vw"
                />
             </div>
          </div>
          
          <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
            <div className="flex gap-2">
              <a 
                href={img.secure_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                title="Open Original"
              >
                <ExternalLink size={18} />
              </a>
              <button 
                onClick={() => handleCopy(img.secure_url, img.public_id)}
                className="w-10 h-10 border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                title="Copy URL"
              >
                {copiedId === img.public_id ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
              </button>
            </div>
            
            <button 
              onClick={() => handleDelete(img.public_id)}
              disabled={deletingId === img.public_id}
              className="w-full py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors disabled:bg-gray-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-2"
            >
              {deletingId === img.public_id ? "Deleting..." : "Delete"}
            </button>
          </div>
          
          <div className="absolute -bottom-2 -left-2 bg-black text-white text-[8px] font-bold px-2 py-0.5 uppercase tracking-tighter max-w-[90%] truncate border border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:hidden transition-all">
            {img.public_id.split('/').pop()}
          </div>
        </div>
      ))}
    </div>
  );
}
