"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase, type Order } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package,
  Clock,
  CheckCircle,
  MapPin,
  Phone,
  Navigation,
  Search,
  Camera,
  MessageSquare,
  AlertTriangle,
  Play,
  RotateCcw,
  Calendar,
  User,
  Truck,
  Edit,
} from "lucide-react"

interface OrderWithActions extends Order {
  canStart?: boolean
  canPickup?: boolean
  canDeliver?: boolean
  canComplete?: boolean
}

export default function DriverOrdersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithActions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    if (profile) {
      fetchOrders()
    }
  }, [profile])

  const fetchOrders = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", profile.user_id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Add action flags to orders
      const ordersWithActions = (data as Order[]).map((order) => ({
        ...order,
        canStart: order.status === "assigned",
        canDeliver: order.status === "assigned",
        canComplete: order.status === "in_transit",
      }))

      setOrders(ordersWithActions)
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

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      // Create order update record
      if (profile) {
        await supabase.from("order_updates").insert({
          order_id: orderId,
          driver_id: profile.user_id,
          status: newStatus,
          notes: notes || `Order status updated to ${newStatus.replace("_", " ")}`,
          latitude: null,
          longitude: null,
        })
      }

      // Update local state
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updatedOrder = { ...order, status: newStatus }
            return {
              ...updatedOrder,
              canStart: updatedOrder.status === "assigned",
              canDeliver: updatedOrder.status === "assigned",
              canComplete: updatedOrder.status === "in_transit",
            }
          }
          return order
        }),
      )

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus.replace("_", " ")}`,
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: Clock, label: "Pending" },
      assigned: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "Assigned" },
      in_transit: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: Navigation, label: "In Transit" },
      delivered: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" },
      failed: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, label: "Failed" },
      cancelled: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: AlertTriangle, label: "Cancelled" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-50 text-gray-700 border-gray-200",
      icon: Package,
      label: status.replace("_", " "),
    }

    const Icon = config.icon

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      urgent: { color: "bg-red-100 text-red-800 border-red-200", label: "Urgent" },
      high: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High" },
      normal: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Normal" },
      low: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Low" },
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal

    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const getOrdersByTab = (tab: string) => {
    switch (tab) {
      case "active":
        return filteredOrders.filter((order) => !["delivered", "failed"].includes(order.status))
      case "completed":
        return filteredOrders.filter((order) => order.status === "delivered")
      case "failed":
        return filteredOrders.filter((order) => order.status === "failed")
      default:
        return filteredOrders
    }
  }

  const getTabCount = (tab: string) => {
    return getOrdersByTab(tab).length
  }

  if (!profile) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">Manage all your delivery orders in one place</p>
          </div>
          <Button onClick={() => router.push("/driver/route-optimizer")} variant="outline">
            <Navigation className="mr-2 h-4 w-4" />
            Optimize Route
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders by number, customer, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Active ({getTabCount("active")})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({getTabCount("completed")})
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Failed ({getTabCount("failed")})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <OrdersList
              orders={getOrdersByTab("active")}
              loading={loading}
              onStatusUpdate={updateOrderStatus}
              onNavigate={(address) =>
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
              }
              onContact={(phone) => window.open(`tel:${phone}`)}
              onViewDetails={(orderId) => router.push(`/driver/orders/${orderId}`)}
              onStartPOD={(orderId) => router.push(`/driver/orders/${orderId}/pod`)}
              onCommunicate={(orderId) => router.push(`/driver/communication/${orderId}`)}
              showActions={true}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <OrdersList
              orders={getOrdersByTab("completed")}
              loading={loading}
              onNavigate={(address) =>
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
              }
              onContact={(phone) => window.open(`tel:${phone}`)}
              onViewDetails={(orderId) => router.push(`/driver/orders/${orderId}`)}
              onViewPOD={(orderId) => router.push(`/driver/orders/${orderId}/pod-view`)}
              showActions={false}
            />
          </TabsContent>

          <TabsContent value="failed" className="mt-6">
            <OrdersList
              orders={getOrdersByTab("failed")}
              loading={loading}
              onNavigate={(address) =>
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
              }
              onContact={(phone) => window.open(`tel:${phone}`)}
              onViewDetails={(orderId) => router.push(`/driver/orders/${orderId}`)}
              onRetry={(orderId) => updateOrderStatus(orderId, "assigned", "Order retry requested by driver")}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )

  function OrdersList({
    orders,
    loading,
    onStatusUpdate,
    onNavigate,
    onContact,
    onViewDetails,
    onStartPOD,
    onViewPOD,
    onCommunicate,
    onRetry,
    showActions,
  }: {
    orders: OrderWithActions[]
    loading: boolean
    onStatusUpdate?: (orderId: string, status: string) => void
    onNavigate: (address: string) => void
    onContact: (phone: string) => void
    onViewDetails: (orderId: string) => void
    onStartPOD?: (orderId: string) => void
    onViewPOD?: (orderId: string) => void
    onCommunicate?: (orderId: string) => void
    onRetry?: (orderId: string) => void
    showActions: boolean
  }) {
    if (loading) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading orders...</div>
          </CardContent>
        </Card>
      )
    }

    if (orders.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {activeTab === "active"
                  ? "No active orders at the moment"
                  : activeTab === "completed"
                    ? "No completed deliveries yet"
                    : "No failed orders"}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                    {getStatusBadge(order.status)}
                    {getPriorityBadge(order.priority)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Customer & Address Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <button
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => onContact(order.customer_phone!)}
                        >
                          {order.customer_phone}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Delivery Address</p>
                        <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Notes */}
                {order.delivery_notes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Notes:</span> {order.delivery_notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(order.id)}>
                    View Details
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => onNavigate(order.delivery_address)}>
                    <MapPin className="mr-1 h-3 w-3" />
                    Navigate
                  </Button>

                  {showActions && onCommunicate && (
                    <Button variant="outline" size="sm" onClick={() => onCommunicate(order.id)}>
                      <MessageSquare className="mr-1 h-3 w-3" />
                      Contact
                    </Button>
                  )}

                  {/* Status-specific actions */}
                  {showActions && onStatusUpdate && (
                    <>
                      {order.canStart && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onStatusUpdate!(order.id, "in_transit")
                          }}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Start Delivery
                        </Button>
                      )}

                      {order.canComplete && onStartPOD && (
                        <Button size="sm" onClick={() => onStartPOD(order.id)}>
                          <Camera className="mr-1 h-3 w-3" />
                          Complete Delivery
                        </Button>
                      )}
                    </>
                  )}

                  {/* Completed order actions */}
                  {order.status === "delivered" && onViewPOD && (
                    <Button variant="outline" size="sm" onClick={() => onViewPOD(order.id)}>
                      <Camera className="mr-1 h-3 w-3" />
                      View POD
                    </Button>
                  )}

                  {/* Status Change Actions for Completed/Failed Orders */}
                  {(order.status === "delivered" || order.status === "failed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/driver/orders/${order.id}/change-status`)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Change Status
                    </Button>
                  )}

                  {/* Failed order actions */}
                  {order.status === "failed" && onRetry && (
                    <Button variant="outline" size="sm" onClick={() => onRetry(order.id)}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
}
