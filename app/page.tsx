"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Settings, Eye, EyeOff, Truck, ArrowRight, ChevronLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("admin")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)

  // Developer/Super Admin mode state
  const [devModeOpen, setDevModeOpen] = useState<boolean>(false)
  const [devEmail, setDevEmail] = useState<string>("")
  const [devPassword, setDevPassword] = useState<string>("")
  const [showDevPassword, setShowDevPassword] = useState<boolean>(false)
  const [devLoading, setDevLoading] = useState<boolean>(false)
  const [devError, setDevError] = useState<string | null>(null)

  // Animation states
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDevModeLogin = async () => {
    setDevError(null)
    setDevLoading(true)

    try {
      console.log("🔧 Developer mode: Attempting super admin login...")

      if (!devEmail || !devPassword) {
        setDevError("Email and password are required")
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      })

      if (signInError) {
        if (devEmail === "super.admin@delivery-system.com" && devPassword === "superadmin123") {
          console.log("🔧 Creating super admin account...")

          try {
            const createResponse = await fetch("/api/create-super-admin")
            const createData = await createResponse.json()

            if (!createResponse.ok) {
              throw new Error(createData.error || "Failed to create super admin account")
            }

            console.log("✅ Super admin account created, attempting login...")

            const { data: retryData, error: retrySignInError } = await supabase.auth.signInWithPassword({
              email: devEmail,
              password: devPassword,
            })

            if (retrySignInError) {
              throw new Error(retrySignInError.message || "Failed to sign in after account creation")
            }

            if (retryData.user) {
              console.log("✅ Super admin login successful after creation")
              window.location.href = "/super-admin"
              return
            }
          } catch (createError) {
            console.error("Failed to create super admin:", createError)
            throw new Error("Failed to create super admin account")
          }
        } else {
          throw new Error(signInError.message || "Invalid credentials")
        }
      }

      if (data.user) {
        console.log("✅ Authentication successful, checking role...")

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (profileError) {
          console.error("Profile fetch error:", profileError)
          if (devEmail === "super.admin@delivery-system.com") {
            console.log("🔧 Creating super admin profile...")

            const { error: insertError } = await supabase.from("user_profiles").insert({
              user_id: data.user.id,
              email: devEmail,
              first_name: "Super",
              last_name: "Admin",
              role: "super_admin",
            })

            if (insertError) {
              console.error("Failed to create profile:", insertError)
              throw new Error("Failed to create super admin profile")
            }

            console.log("✅ Super admin profile created, redirecting...")
            window.location.href = "/super-admin"
            return
          } else {
            throw new Error("User profile not found")
          }
        }

        if (profileData) {
          console.log("Profile data:", profileData)

          if (profileData.role === "super_admin") {
            console.log("✅ Super admin access granted")
            window.location.href = "/super-admin"
          } else if (profileData.role === "admin") {
            console.log("✅ Admin access granted")
            window.location.href = "/admin/dashboard"
          } else if (profileData.role === "driver") {
            console.log("✅ Driver access granted")
            window.location.href = "/driver/orders"
          } else {
            throw new Error("Invalid user role")
          }
        } else {
          throw new Error("No profile data found")
        }
      }
    } catch (err) {
      console.error("❌ Developer mode login error:", err)
      setDevError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setDevLoading(false)
    }
  }

  const handleSignIn = async (role: string) => {
    setError(null)
    setIsLoading(true)

    try {
      if (!email || !password) {
        setError("Email and password are required")
        return
      }

      console.log("🔐 Attempting sign in:", email)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message || "Failed to sign in")
        return
      }

      if (data.user) {
        console.log("✅ Sign in successful")

        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (profileData) {
          const dashboardPath =
            profileData.role === "admin" ? "/admin/dashboard" : profileData.role === "driver" ? "/driver/orders" : "/"

          window.location.href = dashboardPath
        } else {
          const dashboardPath = role === "admin" ? "/admin/dashboard" : role === "driver" ? "/driver/orders" : "/"
          window.location.href = dashboardPath
        }
      }
    } catch (err) {
      console.error("❌ Sign in error:", err)
      setError("An unexpected error occurred during sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (role: string) => {
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!email || !password || !firstName) {
      setError("Email, password, and first name are required")
      return
    }

    setIsLoading(true)

    try {
      console.log("📝 Attempting sign up:", email, role)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message || "Failed to sign up")
        return
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message || "Account created but failed to sign in")
          return
        }

        if (signInData.user) {
          console.log("✅ Sign up and sign in successful")
          const dashboardPath = role === "admin" ? "/admin/dashboard" : role === "driver" ? "/driver/orders" : "/"
          window.location.href = dashboardPath
        }
      }
    } catch (err) {
      console.error("❌ Sign up error:", err)
      setError("An unexpected error occurred during sign up")
    } finally {
      setIsLoading(false)
    }
  }

  // Demo account handlers
  const handleDemoLogin = async (demoType: string) => {
    setError(null)
    setIsLoading(true)

    const demoCredentials = {
      superadmin: { email: "super.admin@delivery-system.com", password: "superadmin123" },
      admin: { email: "admin@example.com", password: "admin123" },
      driver: { email: "driver@example.com", password: "driver123" },
    }

    const credentials = demoCredentials[demoType as keyof typeof demoCredentials]

    if (!credentials) {
      setError("Invalid demo account type")
      setIsLoading(false)
      return
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (signInError) {
        setError("Demo account not available. Please contact administrator.")
        return
      }

      if (data.user) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (profileData) {
          const dashboardPath =
            profileData.role === "super_admin"
              ? "/super-admin"
              : profileData.role === "admin"
                ? "/admin/dashboard"
                : profileData.role === "driver"
                  ? "/driver/orders"
                  : "/"

          window.location.href = dashboardPath
        }
      }
    } catch (err) {
      console.error("❌ Demo login error:", err)
      setError("Failed to access demo account")
    } finally {
      setIsLoading(false)
    }
  }

  const clearForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFirstName("")
    setLastName("")
    setError(null)
  }

  const clearDevForm = () => {
    setDevEmail("")
    setDevPassword("")
    setDevError(null)
    setShowDevPassword(false)
  }

  const switchToSignup = () => {
    setShowSignup(true)
    clearForm()
  }

  const switchToLogin = () => {
    setShowSignup(false)
    clearForm()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Super Admin Access Button */}
      <button
        onClick={() => {
          setDevModeOpen(true)
          clearDevForm()
        }}
        className="fixed top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200 opacity-50 hover:opacity-100 z-50 flex items-center justify-center"
        aria-label="Super Admin Access"
      >
        <Settings className="w-4 h-4 text-gray-600" />
      </button>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Simple Branding */}
          <div
            className={`text-center lg:text-left space-y-8 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
          >
            {/* Logo */}
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-black">DeliveryOS</h1>
                <p className="text-gray-500 text-sm">Delivery Management</p>
              </div>
            </div>

            {/* Simple Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-black">Simple. Efficient. Reliable.</h2>
              <p className="text-gray-600 leading-relaxed">
                Streamline your delivery operations with our clean and intuitive platform.
              </p>
            </div>
          </div>

          {/* Right Side - Clean Auth Form */}
          <div className={`transition-opacity duration-500 delay-200 ${mounted ? "opacity-100" : "opacity-0"}`}>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-8">
                {/* Role Selector */}
                <div className="flex mb-8 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "admin" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setActiveTab("driver")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "driver" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"
                    }`}
                  >
                    Driver
                  </button>
                </div>

                {!showSignup ? (
                  // Login Form
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h2 className="text-xl font-semibold text-black">Sign In</h2>
                      <p className="text-gray-600 text-sm">Welcome back</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 text-sm">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="h-10 border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700 text-sm">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="h-10 border-gray-300 focus:border-black focus:ring-black pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSignIn(activeTab)}
                      disabled={isLoading}
                      className="w-full h-10 bg-black hover:bg-gray-800 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToSignup}
                        className="text-gray-600 hover:text-black text-sm transition-colors"
                      >
                        Don't have an account? <span className="font-medium">Sign up</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Signup Form
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <button
                        onClick={switchToLogin}
                        className="text-gray-600 hover:text-black transition-colors mr-3 p-1 rounded-md hover:bg-gray-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-semibold text-black">Create Account</h2>
                        <p className="text-gray-600 text-sm">Get started today</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-gray-700 text-sm">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="h-10 border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-gray-700 text-sm">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="h-10 border-gray-300 focus:border-black focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-gray-700 text-sm">
                        Email
                      </Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="h-10 border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-gray-700 text-sm">
                        Password
                      </Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="h-10 border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 text-sm">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="h-10 border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>

                    <Button
                      onClick={() => handleSignUp(activeTab)}
                      disabled={isLoading}
                      className="w-full h-10 bg-black hover:bg-gray-800 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToLogin}
                        className="text-gray-600 hover:text-black text-sm transition-colors"
                      >
                        Already have an account? <span className="font-medium">Sign in</span>
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm text-center">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Clean Developer/Super Admin Mode */}
      <Dialog open={devModeOpen} onOpenChange={setDevModeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Admin Access
            </DialogTitle>
            <DialogDescription>Enter super admin credentials to access system administration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dev-email">Email</Label>
              <Input
                id="dev-email"
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Enter email"
                disabled={devLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-password">Password</Label>
              <div className="relative">
                <Input
                  id="dev-password"
                  type={showDevPassword ? "text" : "password"}
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={devLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDevPassword(!showDevPassword)}
                  disabled={devLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showDevPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {devError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{devError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleDevModeLogin}
                disabled={devLoading || !devEmail || !devPassword}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                {devLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Access Admin"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDevModeOpen(false)
                  clearDevForm()
                }}
                disabled={devLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
