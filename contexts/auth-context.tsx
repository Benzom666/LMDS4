"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  user_id: string
  email: string
  role: "super_admin" | "admin" | "driver"
  status: "active" | "suspended" | "pending"
  full_name?: string
  phone?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes with debouncing
    let timeoutId: NodeJS.Timeout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Clear any pending timeout
      if (timeoutId) clearTimeout(timeoutId)

      // Debounce auth state changes
      timeoutId = setTimeout(async () => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }, 100)
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      // Add exponential backoff for rate limiting
      const delay = Math.min(1000 * Math.pow(2, 0), 5000)
      await new Promise((resolve) => setTimeout(resolve, delay))

      const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

      if (error) {
        console.error("Supabase error:", error)

        // Handle specific error cases
        if (error.code === "PGRST116") {
          console.log("User profile not found, user may need to complete registration")
          setProfile(null)
          setLoading(false)
          return
        }

        // Handle rate limiting
        if (error.message?.includes("Too Many") || error.message?.includes("rate limit")) {
          console.log("Rate limited, retrying in 2 seconds...")
          setTimeout(() => fetchUserProfile(userId), 2000)
          return
        }

        throw error
      }

      setProfile(data)

      // Only redirect if we're on login/home pages to avoid infinite redirects
      const currentPath = window.location.pathname
      if (currentPath === "/" || currentPath === "/login") {
        // Redirect based on role and status
        if (data.status === "pending") {
          if (data.role === "driver") {
            router.push("/driver/pending")
          }
        } else if (data.status === "active") {
          switch (data.role) {
            case "super_admin":
              router.push("/super-admin")
              break
            case "admin":
              router.push("/admin/dashboard")
              break
            case "driver":
              router.push("/driver/orders")
              break
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)

      // Don't clear profile on network errors to prevent auth loops
      if (error instanceof Error && !error.message.includes("network")) {
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      // Force clear state even if signOut fails
      setUser(null)
      setProfile(null)
      router.push("/")
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
