"use client"

import { useState } from "react"
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react"

export default function AddUserPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("customer")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!fullName) {
      setError("Please provide a name")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          role,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      setSuccess(`User ${data.user?.name || fullName} created successfully!`)
      setFirstName("")
      setLastName("")
      setEmail("")
      setPassword("")
      setRole("customer")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating user")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center border border-gray-200">
          <UserPlus size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add New User</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new admin, manager, or customer account</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-5 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-5 font-medium flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full bg-white text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors placeholder:text-gray-400"
                placeholder="John"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors placeholder:text-gray-400"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors placeholder:text-gray-400"
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors appearance-none cursor-pointer"
            >
              <option value="customer">Customer</option>
              <option value="manager">Store Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors placeholder:text-gray-400"
              placeholder="•••••••• (min 6 characters)"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-black transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating User...
                </>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
