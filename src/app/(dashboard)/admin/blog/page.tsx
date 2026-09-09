"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/playshelf/Toast";
import { Megaphone, Plus, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

type Blog = {
  _id: string;
  title: string;
  excerpt: string;
  category: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  slug: string;
  featuredImage?: { url: string };
};

export default function AdminBlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ALL blogs (published + draft) for admin view
      const res = await fetch("/api/admin/blogs");
      const data = await res.json();
      setBlogs(data);
    } catch {
      showToast("Failed to load blog posts", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleTogglePublish = async (blog: Blog) => {
    setActionLoading(blog._id);
    try {
      const res = await fetch(`/api/blogs/${blog._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !blog.isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update");
      showToast(
        blog.isPublished ? "Post moved to Draft" : "Post Published!",
        "success"
      );
      fetchBlogs();
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (blog: Blog) => {
    if (!confirm(`Are you sure you want to permanently delete "${blog.title}"?`)) return;
    setActionLoading(blog._id);
    try {
      const res = await fetch(`/api/blogs/${blog._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Post deleted", "success");
      setBlogs((prev) => prev.filter((b) => b._id !== blog._id));
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center border border-gray-200">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Blog Posts</h1>
            <p className="text-sm text-gray-500 mt-1">
              {blogs.length} total · {blogs.filter((b) => b.isPublished).length} published · {blogs.filter((b) => !b.isPublished).length} drafts
            </p>
          </div>
        </div>
        <Link
          href="/admin/blog/add"
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          New Post
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">Loading posts...</div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-sm">No blog posts yet.</p>
            <Link href="/admin/blog/add" className="mt-4 inline-block text-sm text-gray-900 underline font-medium">
              Write your first post →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Post</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blogs.map((blog) => (
                <tr key={blog._id} className="hover:bg-gray-50 transition-colors">
                  {/* Title + excerpt */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {blog.featuredImage?.url && (
                        <img
                          src={blog.featuredImage.url}
                          alt={blog.title}
                          className="w-10 h-10 object-cover rounded-md flex-shrink-0 bg-gray-100"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{blog.title}</p>
                        <p className="text-gray-400 text-xs truncate max-w-[200px]">{blog.excerpt}</p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {blog.category || "—"}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        blog.isPublished
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${blog.isPublished ? "bg-green-500" : "bg-yellow-500"}`} />
                      {blog.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View on site */}
                      <a
                        href={`/blogs/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="View on site"
                      >
                        <ExternalLink size={15} />
                      </a>

                      {/* Publish / Draft toggle */}
                      <button
                        onClick={() => handleTogglePublish(blog)}
                        disabled={actionLoading === blog._id}
                        className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
                          blog.isPublished
                            ? "text-green-600 hover:bg-green-50"
                            : "text-yellow-600 hover:bg-yellow-50"
                        }`}
                        title={blog.isPublished ? "Move to Draft" : "Publish"}
                      >
                        {blog.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(blog)}
                        disabled={actionLoading === blog._id}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Delete post"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
