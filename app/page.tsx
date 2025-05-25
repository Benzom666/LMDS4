"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Loader2,
  Settings,
  Eye,
  EyeOff,
  Truck,
  Zap,
  Shield,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Globe,
  Lock,
  Users,
  BarChart3,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div
            className={`text-center lg:text-left space-y-8 transition-all duration-1000 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-float">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold gradient-text">DeliveryOS</h1>
                  <p className="text-slate-400 text-lg font-light">Next-generation delivery management</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white">
                  Revolutionize Your <span className="gradient-text-gold">Delivery Operations</span>
                </h2>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Experience the future of logistics with our AI-powered platform that streamlines every aspect of your
                  delivery workflow.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="premium-card p-4 hover-lift">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-3">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Global Reach</h3>
                  <p className="text-sm text-slate-400">Worldwide delivery network</p>
                </div>
                <div className="premium-card p-4 hover-lift">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Secure</h3>
                  <p className="text-sm text-slate-400">Enterprise-grade security</p>
                </div>
                <div className="premium-card p-4 hover-lift">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Team Management</h3>
                  <p className="text-sm text-slate-400">Efficient team coordination</p>
                </div>
                <div className="premium-card p-4 hover-lift">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-3">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Analytics</h3>
                  <p className="text-sm text-slate-400">Real-time insights</p>
                </div>
              </div>

              {/* Demo Access Cards */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Quick Demo Access</h3>
                <div className="grid gap-3">
                  <button
                    onClick={() => handleDemoLogin("admin")}
                    disabled={isLoading}
                    className="premium-card p-3 hover-lift text-left transition-all duration-300 hover:border-blue-500/50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">Admin Demo</div>
                        <div className="text-sm text-slate-400">Management dashboard</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDemoLogin("driver")}
                    disabled={isLoading}
                    className="premium-card p-3 hover-lift text-left transition-all duration-300 hover:border-green-500/50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="font-medium text-white">Driver Demo</div>
                        <div className="text-sm text-slate-400">Delivery interface</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div
            className={`transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
          >
            <Card className="premium-card border-white/10 shadow-2xl">
              <CardContent className="p-8">
                {/* Role Selector */}
                <div className="flex mb-8 bg-slate-900/50 rounded-xl p-1 backdrop-blur-sm">
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`flex-1 py-4 px-6 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === "admin"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Portal
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("driver")}
                    className={`flex-1 py-4 px-6 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === "driver"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg transform scale-105"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      Driver Hub
                    </div>
                  </button>
                </div>

                {!showSignup ? (
                  // Login Form
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                      <p className="text-slate-400">Sign in to your {activeTab} account</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="premium-input h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="premium-input h-12 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSignIn(activeTab)}
                      disabled={isLoading}
                      className="premium-button w-full h-12 text-base font-semibold"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-5 h-5 mr-2" />
                      )}
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToSignup}
                        className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-300 font-medium"
                      >
                        Don't have an account? <span className="text-blue-400">Create one</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Signup Form
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <button
                        onClick={switchToLogin}
                        className="text-slate-400 hover:text-white transition-colors mr-3 p-1 rounded-lg hover:bg-white/10"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Create Account</h2>
                        <p className="text-slate-400">Join the delivery network</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-300 text-sm font-medium">
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="premium-input h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-300 text-sm font-medium">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="premium-input h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-slate-300 text-sm font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="premium-input h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-slate-300 text-sm font-medium">
                        Password *
                      </Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="premium-input h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-300 text-sm font-medium">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="premium-input h-12"
                      />
                    </div>

                    <Button
                      onClick={() => handleSignUp(activeTab)}
                      disabled={isLoading}
                      className="premium-button w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-5 h-5 mr-2" />
                      )}
                      {isLoading
                        ? "Creating Account..."
                        : `Create ${activeTab === "admin" ? "Admin" : "Driver"} Account`}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={switchToLogin}
                        className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-300 font-medium"
                      >
                        Already have an account? <span className="text-blue-400">Sign in</span>
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                    <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Developer/Super Admin Mode */}
      <Dialog open={devModeOpen} onOpenChange={setDevModeOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-6 right-6 opacity-30 hover:opacity-100 transition-all duration-300 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
            onClick={() => {
              setDevModeOpen(true)
              clearDevForm()
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md premium-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5 text-cyan-400" />
              Developer Mode
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter super admin credentials to access system administration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dev-email" className="text-slate-300">
                Email Address
              </Label>
              <Input
                id="dev-email"
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={devLoading}
                className="premium-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-password" className="text-slate-300">
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
                  className="premium-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowDevPassword(!showDevPassword)}
                  disabled={devLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showDevPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {devError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{devError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleDevModeLogin}
                disabled={devLoading || !devEmail || !devPassword}
                className="premium-button flex-1"
              >
                {devLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Super Admin"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDevModeOpen(false)
                  clearDevForm()
                }}
                disabled={devLoading}
                className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center">
              Developer/Super Admin access only. All login attempts are logged.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
