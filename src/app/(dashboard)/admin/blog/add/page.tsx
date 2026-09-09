"use client";

import React, { useState } from "react"
import { Megaphone, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/components/playshelf/Toast"
import { useRouter } from "next/navigation"

export default function BlogUploadPage() {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !file) {
      showToast("Please fill all required fields including image.", "error");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Upload image to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload image');
      const imageUrl = uploadData.url;

      // 2. Save blog to DB
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const blogRes = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          category,
          tags: tagArray,
          featuredImage: { url: imageUrl, alt: title },
          isPublished: true,
          publishedAt: new Date()
        })
      });
      
      if (!blogRes.ok) {
        const blogData = await blogRes.json();
        throw new Error(blogData.error || 'Failed to publish post');
      }

      showToast("Blog post published successfully!", "success");
      // Reset form
      setTitle("");
      setExcerpt("");
      setContent("");
      setTags("");
      setFile(null);
      setPreview("");
      // router.push('/admin/blog'); // Redirect if list page exists
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center border border-gray-200">
          <Megaphone size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Upload Blog Post</h1>
          <p className="text-sm text-gray-500 mt-1">Publish new content to the storefront</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form className="space-y-6" onSubmit={handlePublish}>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Post Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
              placeholder="Enter an engaging title..." 
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Excerpt</label>
            <textarea 
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 min-h-[80px] text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y placeholder:text-gray-400" 
              placeholder="A short summary of the post..." 
              required
            ></textarea>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Cover Image</label>
            <div className="relative w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors cursor-pointer bg-gray-50 overflow-hidden min-h-[200px]">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                required
              />
              {preview ? (
                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
              ) : null}
              <div className="z-10 flex flex-col items-center bg-white/80 p-4 rounded-xl shadow-sm pointer-events-none">
                <ImageIcon size={32} className="mb-3 text-gray-800" />
                <p className="font-medium text-sm text-gray-900">Click or drag image to upload</p>
                <p className="text-xs text-gray-600 mt-1">Recommended size: 1200x630px</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 min-h-[300px] text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y placeholder:text-gray-400" 
              placeholder="Write your blog post content here. Markdown is supported..."
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">Category</label>
              <input 
                type="text" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
                placeholder="e.g. Technology, Fashion, Education" 
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">Tags (comma separated)</label>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
                placeholder="toys, kids, education" 
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white border border-transparent text-sm font-medium py-3 rounded-md hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50">
              {loading ? "Publishing..." : "Publish Post"}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
