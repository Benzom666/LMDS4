"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Loader2,
  Settings,
  Eye,
  EyeOff,
  Truck,
  Shield,
  ArrowRight,
  ChevronLeft,
  Building2,
  CheckCircle,
} from "lucide-react"
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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Super Admin Access - Top Right Corner */}
      <button
        onClick={() => {
          setDevModeOpen(true)
          clearDevForm()
        }}
        className="fixed top-4 right-4 w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 opacity-60 hover:opacity-100 z-50 shadow-sm"
        aria-label="Super Admin Access"
      >
        <Settings className="w-4 h-4 text-slate-500 hover:text-slate-700 mx-auto" />
      </button>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Professional Branding */}
          <div
            className={`text-center lg:text-left space-y-8 transition-all duration-700 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
          >
            <div className="space-y-6">
              {/* Logo and Brand */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">DeliveryOS</h1>
                  <p className="text-slate-600 text-sm font-medium">Enterprise Logistics Platform</p>
                </div>
              </div>

              {/* Value Proposition */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
                  Professional delivery management for modern businesses
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Streamline operations, optimize routes, and manage your delivery fleet with enterprise-grade tools
                  designed for efficiency and reliability.
                </p>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Real-time Tracking</h3>
                    <p className="text-sm text-slate-600">Monitor deliveries and fleet status in real-time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Route Optimization</h3>
                    <p className="text-sm text-slate-600">AI-powered routing for maximum efficiency</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Analytics Dashboard</h3>
                    <p className="text-sm text-slate-600">Comprehensive reporting and performance metrics</p>
                  </div>
                </div>
              </div>

              {/* Demo Access */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Demo Access</h3>
                <div className="grid gap-2">
                  <button
                    onClick={() => handleDemoLogin("admin")}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-left disabled:opacity-50"
                  >
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-medium text-slate-900 text-sm">Admin Dashboard</div>
                      <div className="text-xs text-slate-500">Management interface</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDemoLogin("driver")}
                    disabled={isLoading}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-left disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-medium text-slate-900 text-sm">Driver Interface</div>
                      <div className="text-xs text-slate-500">Mobile-optimized delivery app</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Clean Auth Form */}
          <div
            className={`transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
          >
            <Card className="bg-white border border-slate-200 shadow-lg">
              <CardContent className="p-8">
                {/* Role Selector */}
                <div className="flex mb-8 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === "admin"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrator
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("driver")}
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === "driver"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Truck className="w-4 h-4" />
                      Driver
                    </div>
                  </button>
                </div>

                {!showSignup ? (
                  // Login Form
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-semibold text-slate-900">Sign In</h2>
                      <p className="text-slate-600 text-sm">
                        Access your {activeTab === "admin" ? "administrator" : "driver"} account
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSignIn(activeTab)}
                      disabled={isLoading}
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToSignup}
                        className="text-slate-600 hover:text-slate-900 text-sm transition-colors duration-200 font-medium"
                      >
                        Need an account? <span className="text-slate-900">Create one</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Signup Form
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <button
                        onClick={switchToLogin}
                        className="text-slate-600 hover:text-slate-900 transition-colors mr-3 p-1 rounded-md hover:bg-slate-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Create Account</h2>
                        <p className="text-slate-600 text-sm">Join the delivery network</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-700 text-sm font-medium">
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="h-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-700 text-sm font-medium">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="h-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-slate-700 text-sm font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-slate-700 text-sm font-medium">
                        Password *
                      </Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-700 text-sm font-medium">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="h-11 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>

                    <Button
                      onClick={() => handleSignUp(activeTab)}
                      disabled={isLoading}
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {isLoading
                        ? "Creating Account..."
                        : `Create ${activeTab === "admin" ? "Administrator" : "Driver"} Account`}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToLogin}
                        className="text-slate-600 hover:text-slate-900 text-sm transition-colors duration-200 font-medium"
                      >
                        Already have an account? <span className="text-slate-900">Sign in</span>
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm text-center font-medium">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Developer/Super Admin Mode */}
      <Dialog open={devModeOpen} onOpenChange={setDevModeOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Settings className="h-5 w-5 text-slate-600" />
              System Administration
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Enter super administrator credentials to access system management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dev-email" className="text-slate-700">
                Email Address
              </Label>
              <Input
                id="dev-email"
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={devLoading}
                className="border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-password" className="text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="dev-password"
                  type={showDevPassword ? "text" : "password"}
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={devLoading}
                  className="border-slate-300 focus:border-slate-500 focus:ring-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDevPassword(!showDevPassword)}
                  disabled={devLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
              >
                {devLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access System"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDevModeOpen(false)
                  clearDevForm()
                }}
                disabled={devLoading}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center">
              Super administrator access only. All login attempts are logged.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
