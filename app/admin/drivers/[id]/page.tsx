"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"
import { supabase, type UserProfile, type Driver, type Order } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, User, Truck, MapPin, Package, Phone, Mail, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DriverDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [driverProfile, setDriverProfile] = useState<UserProfile | null>(null)
  const [driverDetails, setDriverDetails] = useState<Driver | null>(null)
  const [driverOrders, setDriverOrders] = useState<Order[]>([])

  const driverId = params.id as string

  useEffect(() => {
    if (driverId && profile) {
      fetchDriverData()
    }
  }, [driverId, profile])

  const fetchDriverData = async () => {
    if (!profile) return

    try {
      setLoading(true)

      // Fetch driver profile using user_id instead of id
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", driverId)
        .eq("role", "driver")
        .maybeSingle()

      if (profileError) {
        console.error("Error fetching driver profile:", profileError)
        throw profileError
      }

      if (!profileData) {
        console.error("Driver profile not found")
        toast({
          title: "Error",
          description: "Driver profile not found.",
          variant: "destructive",
        })
        return
      }

      setDriverProfile(profileData as UserProfile)

      // Fetch driver details using user_id
      const { data: detailsData, error: detailsError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", driverId)
        .maybeSingle()

      if (detailsError && detailsError.code !== "PGRST116") {
        console.error("Error fetching driver details:", detailsError)
      } else if (detailsData) {
        setDriverDetails(detailsData as Driver)
      }

      // Fetch driver's orders using driver_id
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Error fetching driver orders:", ordersError)
      } else {
        setDriverOrders(ordersData as Order[])
      }
    } catch (error) {
      console.error("Error fetching driver data:", error)
      toast({
        title: "Error",
        description: "Failed to load driver details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
          >
            Pending
          </Badge>
        )
      case "assigned":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
          >
            Assigned
          </Badge>
        )
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
          >
            In Progress
          </Badge>
        )
      case "delivered":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
          >
            Delivered
          </Badge>
        )
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
          >
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status.replace("_", " ")}</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground">Loading driver details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!driverProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <User className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Driver Not Found</h3>
              <p className="text-muted-foreground">The requested driver profile could not be found.</p>
            </div>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const completedOrders = driverOrders.filter((order) => order.status === "delivered").length
  const totalOrders = driverOrders.length
  const successRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {driverProfile.first_name} {driverProfile.last_name}
            </h1>
            <p className="text-muted-foreground">Driver Profile & Performance</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="glass-card border-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time deliveries</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
              <p className="text-xs text-muted-foreground">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
              <p className="text-xs text-muted-foreground">Delivery success rate</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <User className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {driverDetails?.is_active ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Current status</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="glass-card border-0">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p className="text-lg font-semibold">{driverProfile.first_name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p className="text-lg font-semibold">{driverProfile.last_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </p>
                    <p className="text-lg font-semibold">{driverProfile.email}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </p>
                    <p className="text-lg font-semibold">{driverProfile.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </p>
                  <p className="text-lg font-semibold">
                    {new Date(driverProfile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverDetails ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">License Number</p>
                        <p className="text-lg font-semibold">{driverDetails.license_number || "Not provided"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Vehicle Plate</p>
                        <p className="text-lg font-semibold">{driverDetails.vehicle_plate || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Vehicle Model</p>
                      <p className="text-lg font-semibold">{driverDetails.vehicle_model || "Not provided"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Availability Status</p>
                      <p className="text-lg font-semibold">{driverDetails.availability_status || "Unknown"}</p>
                    </div>
                    {driverDetails.current_latitude && driverDetails.current_longitude && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Last Known Location
                        </p>
                        <p className="text-lg font-semibold">
                          {driverDetails.current_latitude}, {driverDetails.current_longitude}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated: {new Date(driverDetails.last_location_update || "").toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No vehicle information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>All orders assigned to this driver</CardDescription>
              </CardHeader>
              <CardContent>
                {driverOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders assigned to this driver yet.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Order #</TableHead>
                          <TableHead className="font-semibold">Customer</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {driverOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                                className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 dark:hover:border-blue-800"
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
