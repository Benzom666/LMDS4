"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase, type Order } from "@/lib/supabase"
import { Route, MapPin, Clock, Navigation, Shuffle, Package, AlertCircle } from "lucide-react"

interface RouteStop {
  order: Order
  estimatedTime: number
  distance: number
  type: "pickup" | "delivery"
}

export default function RouteOptimizerPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[]>([])
  const [totalDistance, setTotalDistance] = useState(0)
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchActiveOrders()
    }
  }, [profile])

  const fetchActiveOrders = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", profile.user_id)
        .in("status", ["assigned", "picked_up"])
        .order("priority", { ascending: false })

      if (error) throw error

      setOrders(data as Order[])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const optimizeRoute = async () => {
    if (orders.length === 0) return

    setOptimizing(true)
    try {
      // Simulate route optimization algorithm
      const stops: RouteStop[] = []

      // Add pickup stops for assigned orders
      orders
        .filter((order) => order.status === "assigned")
        .forEach((order, index) => {
          stops.push({
            order,
            estimatedTime: 10 + index * 5, // Simulate travel time
            distance: 2 + index * 1.5, // Simulate distance in miles
            type: "pickup",
          })
        })

      // Add delivery stops for picked up orders
      orders
        .filter((order) => order.status === "picked_up")
        .forEach((order, index) => {
          stops.push({
            order,
            estimatedTime: 15 + index * 7, // Simulate travel time
            distance: 3 + index * 2, // Simulate distance in miles
            type: "delivery",
          })
        })

      // Sort by priority and estimated time
      stops.sort((a, b) => {
        // Prioritize urgent orders
        if (a.order.priority === "urgent" && b.order.priority !== "urgent") return -1
        if (b.order.priority === "urgent" && a.order.priority !== "urgent") return 1

        // Then by estimated time
        return a.estimatedTime - b.estimatedTime
      })

      setOptimizedRoute(stops)
      setTotalDistance(stops.reduce((sum, stop) => sum + stop.distance, 0))
      setTotalTime(stops.reduce((sum, stop) => sum + stop.estimatedTime, 0))

      toast({
        title: "Route Optimized",
        description: `Optimized route for ${stops.length} stops`,
      })
    } catch (error) {
      console.error("Error optimizing route:", error)
      toast({
        title: "Error",
        description: "Failed to optimize route. Please try again.",
        variant: "destructive",
      })
    } finally {
      setOptimizing(false)
    }
  }

  const startNavigation = () => {
    if (optimizedRoute.length === 0) return

    const firstStop = optimizedRoute[0]
    const address = firstStop.type === "pickup" ? firstStop.order.pickup_address : firstStop.order.delivery_address

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge variant="destructive" className="text-xs">
            Urgent
          </Badge>
        )
      case "high":
        return (
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
            High
          </Badge>
        )
      case "normal":
        return (
          <Badge variant="outline" className="text-xs">
            Normal
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="text-xs text-gray-600">
            Low
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Normal
          </Badge>
        )
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Route Optimizer</h1>
            <p className="text-muted-foreground">Plan the most efficient route for your deliveries</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={optimizeRoute} disabled={orders.length === 0 || optimizing}>
              {optimizing ? (
                "Optimizing..."
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Optimize Route
                </>
              )}
            </Button>
            {optimizedRoute.length > 0 && (
              <Button onClick={startNavigation}>
                <Navigation className="mr-2 h-4 w-4" />
                Start Navigation
              </Button>
            )}
          </div>
        </div>

        {/* Route Summary */}
        {optimizedRoute.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{optimizedRoute.length}</div>
                <p className="text-xs text-muted-foreground">Pickup and delivery stops</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                <Route className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDistance.toFixed(1)} mi</div>
                <p className="text-xs text-muted-foreground">Estimated total distance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(totalTime)} min</div>
                <p className="text-xs text-muted-foreground">Including stops and traffic</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Available Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Available Orders ({orders.length})</CardTitle>
              <CardDescription>Orders assigned to you for delivery</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active orders</p>
                  <p className="text-sm text-muted-foreground mt-2">Orders will appear here when assigned to you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">#{order.order_number}</h4>
                          {getPriorityBadge(order.priority)}
                          <Badge variant={order.status === "assigned" ? "outline" : "secondary"}>
                            {order.status === "assigned" ? "Pickup" : "Delivery"}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.status === "assigned" ? order.pickup_address : order.delivery_address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimized Route */}
          <Card>
            <CardHeader>
              <CardTitle>Optimized Route</CardTitle>
              <CardDescription>
                {optimizedRoute.length > 0
                  ? "Follow this route for maximum efficiency"
                  : "Click 'Optimize Route' to generate an efficient path"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizedRoute.length === 0 ? (
                <div className="text-center py-8">
                  <Route className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No route optimized yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Optimize your route to see the most efficient path
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {optimizedRoute.map((stop, index) => (
                    <div key={`${stop.order.id}-${stop.type}`} className="border rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={stop.type === "pickup" ? "outline" : "secondary"}>
                            {stop.type === "pickup" ? "Pickup" : "Delivery"}
                          </Badge>
                          {getPriorityBadge(stop.order.priority)}
                        </div>
                      </div>

                      <div className="ml-9 space-y-1">
                        <p className="font-medium text-sm">#{stop.order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{stop.order.customer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {stop.type === "pickup" ? stop.order.pickup_address : stop.order.delivery_address}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {stop.estimatedTime} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {stop.distance.toFixed(1)} mi
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Route Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Route Optimization Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Efficiency Tips:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Complete pickups before deliveries when possible</li>
                  <li>• Prioritize urgent orders first</li>
                  <li>• Group nearby addresses together</li>
                  <li>• Consider traffic patterns and peak hours</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Safety Reminders:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Always verify customer identity</li>
                  <li>• Take photos for proof of delivery</li>
                  <li>• Report any issues immediately</li>
                  <li>• Keep your location services enabled</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
