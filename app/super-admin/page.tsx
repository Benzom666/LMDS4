"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { Users, Truck, Package, TrendingUp, RefreshCw, Activity, Globe, Zap, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface DashboardStats {
  totalAdmins: number
  totalDrivers: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  assignedOrders: number
  inTransitOrders: number
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAdmins: 0,
    totalDrivers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    assignedOrders: 0,
    inTransitOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("🔄 Fetching super admin dashboard stats...")

      // Fetch all user profiles
      const { data: allProfiles, error: profilesError } = await supabase.from("user_profiles").select("role")

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        throw profilesError
      }

      console.log("Fetched profiles:", allProfiles)

      // Fetch all orders
      const { data: allOrders, error: ordersError } = await supabase.from("orders").select("status")

      if (ordersError) {
        console.error("Error fetching orders:", ordersError)
        throw ordersError
      }

      console.log("Fetched orders:", allOrders)

      // Count by role and status
      const adminCount = allProfiles?.filter((p) => p.role === "admin").length || 0
      const driverCount = allProfiles?.filter((p) => p.role === "driver").length || 0
      const totalOrderCount = allOrders?.length || 0
      const completedOrderCount = allOrders?.filter((o) => o.status === "delivered").length || 0
      const pendingOrderCount = allOrders?.filter((o) => o.status === "pending").length || 0
      const assignedOrderCount = allOrders?.filter((o) => o.status === "assigned").length || 0
      const inTransitOrderCount = allOrders?.filter((o) => o.status === "in_transit").length || 0

      const newStats: DashboardStats = {
        totalAdmins: adminCount,
        totalDrivers: driverCount,
        totalOrders: totalOrderCount,
        completedOrders: completedOrderCount,
        pendingOrders: pendingOrderCount,
        assignedOrders: assignedOrderCount,
        inTransitOrders: inTransitOrderCount,
      }

      console.log("📊 Calculated stats:", newStats)
      setStats(newStats)

      toast({
        title: "Dashboard Updated",
        description: `Found ${allProfiles?.length || 0} profiles and ${allOrders?.length || 0} orders`,
      })
    } catch (error: any) {
      console.error("❌ Error fetching stats:", error)
      setError(`Failed to load dashboard statistics: ${error.message}`)
      toast({
        title: "Error",
        description: `Failed to load dashboard statistics: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Set up real-time subscriptions
    const profilesSubscription = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
        },
        (payload) => {
          console.log("👤 Profile change detected:", payload)
          fetchStats()
        },
      )
      .subscribe()

    const ordersSubscription = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("📦 Order change detected:", payload)
          fetchStats()
        },
      )
      .subscribe()

    return () => {
      profilesSubscription.unsubscribe()
      ordersSubscription.unsubscribe()
    }
  }, [])

  const completionRate = stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : "0"

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold gradient-text">System Command Center</h1>
            <p className="text-slate-400 text-lg">Real-time oversight of your delivery ecosystem</p>
          </div>
          <Button onClick={fetchStats} disabled={loading} className="premium-button hover-glow">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {error && (
          <div className="premium-card border-red-500/30 bg-red-500/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-300">System Alert</h3>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="premium-card hover-lift group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Admins</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {loading ? <div className="loading-shimmer h-8 w-16 rounded"></div> : stats.totalAdmins}
              </div>
              <p className="text-xs text-slate-400">Registered admin users</p>
              <div className="mt-2 flex items-center text-xs text-emerald-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active management
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card hover-lift group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Drivers</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {loading ? <div className="loading-shimmer h-8 w-16 rounded"></div> : stats.totalDrivers}
              </div>
              <p className="text-xs text-slate-400">Registered driver users</p>
              <div className="mt-2 flex items-center text-xs text-blue-400">
                <Zap className="w-3 h-3 mr-1" />
                Fleet ready
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card hover-lift group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Orders</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {loading ? <div className="loading-shimmer h-8 w-16 rounded"></div> : stats.totalOrders}
              </div>
              <p className="text-xs text-slate-400">All delivery orders</p>
              <div className="mt-2 flex items-center text-xs text-green-400">
                <Globe className="w-3 h-3 mr-1" />
                Global network
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card hover-lift group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Success Rate</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-text-gold mb-1">
                {loading ? <div className="loading-shimmer h-8 w-16 rounded"></div> : `${completionRate}%`}
              </div>
              <p className="text-xs text-slate-400">Completion rate</p>
              <div className="mt-2 flex items-center text-xs text-orange-400">
                <Shield className="w-3 h-3 mr-1" />
                Performance metric
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="premium-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                Order Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="premium-card p-4 bg-yellow-500/10 border-yellow-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-300">Pending</span>
                    <span className="text-2xl font-bold text-yellow-400">{loading ? "..." : stats.pendingOrders}</span>
                  </div>
                  <div className="mt-2 h-2 bg-yellow-500/20 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalOrders > 0 ? `${(stats.pendingOrders / stats.totalOrders) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="premium-card p-4 bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-300">Assigned</span>
                    <span className="text-2xl font-bold text-blue-400">{loading ? "..." : stats.assignedOrders}</span>
                  </div>
                  <div className="mt-2 h-2 bg-blue-500/20 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalOrders > 0 ? `${(stats.assignedOrders / stats.totalOrders) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="premium-card p-4 bg-purple-500/10 border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-300">In Transit</span>
                    <span className="text-2xl font-bold text-purple-400">
                      {loading ? "..." : stats.inTransitOrders}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-purple-500/20 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalOrders > 0 ? `${(stats.inTransitOrders / stats.totalOrders) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="premium-card p-4 bg-green-500/10 border-green-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-300">Delivered</span>
                    <span className="text-2xl font-bold text-green-400">{loading ? "..." : stats.completedOrders}</span>
                  </div>
                  <div className="mt-2 h-2 bg-green-500/20 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalOrders > 0 ? `${(stats.completedOrders / stats.totalOrders) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-medium text-green-300">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-green-400">Connected</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-medium text-green-300">Real-time</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-green-400">Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-sm font-medium text-blue-300">Last Update</span>
                  <span className="text-sm font-semibold text-blue-400">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h4 className="font-semibold text-white mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <a href="/super-admin/admins">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Admins
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <a href="/super-admin/drivers">
                      <Truck className="mr-2 h-4 w-4" />
                      Manage Drivers
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <a href="/super-admin/stats">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Analytics
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Overview */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              Global System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold text-white text-lg">User Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">Super Admins</span>
                    </div>
                    <span className="text-lg font-bold gradient-text-gold">1</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">Admins</span>
                    </div>
                    <span className="text-lg font-bold text-purple-400">{stats.totalAdmins}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">Drivers</span>
                    </div>
                    <span className="text-lg font-bold text-cyan-400">{stats.totalDrivers}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-white text-lg">Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <span className="text-sm font-medium text-white">Success Rate</span>
                    <span className="text-lg font-bold text-green-400">{completionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
                    <span className="text-sm font-medium text-white">Active Orders</span>
                    <span className="text-lg font-bold text-blue-400">
                      {stats.assignedOrders + stats.inTransitOrders}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <span className="text-sm font-medium text-white">Pending Orders</span>
                    <span className="text-lg font-bold text-yellow-400">{stats.pendingOrders}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
