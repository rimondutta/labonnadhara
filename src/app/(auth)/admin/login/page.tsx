"use client"

import { Suspense, useEffect, useState } from "react"
import { getSession, signIn, signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

function getSafeAdminCallbackUrl(raw: string | null): string {
  if (!raw) return "/admin"
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw.startsWith("/admin") && !raw.startsWith("/admin/login") ? raw : "/admin"
  }
  try {
    const parsed = new URL(raw)
    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/admin") &&
      !parsed.pathname.startsWith("/admin/login")
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Ignore malformed callbackUrl and fall back to /admin
  }
  return "/admin"
}

function getInitialAuthError(errorCode: string | null): string {
  if (!errorCode) return ""
  if (errorCode === "AccessDenied") return "Access denied. Admin or manager privileges are required."
  if (errorCode === "Configuration") return "Server authentication is misconfigured. Please check NEXTAUTH_SECRET and NEXTAUTH_URL."
  if (errorCode === "CredentialsSignin") return "Invalid email or password"
  return "Unable to sign in. Please try again."
}

function AdminLoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(() => getInitialAuthError(searchParams.get("error")))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    getSession().then((session) => {
      if (!mounted) return
      const role = (session?.user as { role?: string } | undefined)?.role
      if (role === "admin" || role === "manager") {
        const targetUrl = getSafeAdminCallbackUrl(searchParams.get("callbackUrl"))
        window.location.assign(targetUrl)
      }
    })
    return () => {
      mounted = false
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (!res || res.error || !res.ok) {
        if (res?.status === 429) {
          setError("Too many login attempts. Please wait a minute and try again.")
        } else if (res?.error === "Configuration") {
          setError("Server authentication is misconfigured. Please check NEXTAUTH_SECRET and NEXTAUTH_URL.")
        } else {
          setError("Invalid email or password")
        }
        setIsLoading(false)
        return
      }

      const session = await getSession()
      const role = (session?.user as { role?: string } | undefined)?.role

      if (!session?.user) {
        setError("Login succeeded, but your session could not be established. Check NEXTAUTH_URL and NEXTAUTH_SECRET.")
        setIsLoading(false)
        return
      }

      if (role !== "admin" && role !== "manager") {
        await signOut({ redirect: false })
        setError("Access denied. Admin or manager privileges are required.")
        setIsLoading(false)
        return
      }

      const targetUrl = getSafeAdminCallbackUrl(searchParams.get("callbackUrl"))
      window.location.assign(targetUrl)
    } catch {
      setError("Unable to sign in right now. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-xl mb-4">
            <img src="/logo/labonnadhara-logo.png" alt="Labonnadhara" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Labonnadhara Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your store</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium mb-5">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow placeholder:text-gray-400"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Password</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow placeholder:text-gray-400"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  )
}
