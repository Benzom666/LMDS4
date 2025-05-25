"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase, type Order, type UserProfile } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { OrderTemplateGenerator } from "@/components/order-template-generator"
import {
  Plus,
  MoreVertical,
  Eye,
  UserPlus,
  Package,
  Users,
  Upload,
  Download,
  Edit,
  FileText,
  Settings,
} from "lucide-react"

export default function AdminOrdersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<UserProfile[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    orderNumber: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    pickupAddress: "",
    deliveryAddress: "",
    deliveryNotes: "",
    driverId: "",
    priority: "normal", // Add priority field
  })

  // Bulk actions state
  const [bulkAction, setBulkAction] = useState("")
  const [bulkDriverId, setBulkDriverId] = useState("")
  const [bulkStatus, setBulkStatus] = useState("")

  useEffect(() => {
    if (profile) {
      fetchOrders()
      fetchDrivers()
    }
  }, [profile])

  const fetchOrders = async () => {
    if (!profile) return

    try {
      console.log("🔄 Fetching orders for admin:", profile.user_id)

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("created_by", profile.user_id)
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("❌ Error fetching orders:", ordersError)
        throw ordersError
      }

      console.log("✅ Orders fetched:", ordersData?.length || 0)
      setOrders(ordersData as Order[])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchDrivers = async () => {
    if (!profile) return

    try {
      console.log("🔄 Fetching drivers for admin:", profile.user_id)

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("role", "driver")
        .eq("admin_id", profile.user_id)

      if (error) {
        console.error("❌ Error fetching drivers:", error)
        throw error
      }

      console.log("✅ Drivers fetched:", data?.length || 0)
      setDrivers(data as UserProfile[])
    } catch (error) {
      console.error("Error fetching drivers:", error)
      toast({
        title: "Error",
        description: "Failed to load drivers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }

  const handleCreateOrder = async () => {
    if (!profile) return

    if (!formData.customerName || !formData.pickupAddress || !formData.deliveryAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const orderNumber = formData.orderNumber || generateOrderNumber()

      if (formData.orderNumber) {
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", orderNumber)
          .maybeSingle()

        if (existingOrder) {
          toast({
            title: "Duplicate Order Number",
            description:
              "An order with this number already exists. Please use a different number or leave blank to auto-generate.",
            variant: "destructive",
          })
          setSubmitting(false)
          return
        }
      }

      const orderData = {
        order_number: orderNumber,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail || null,
        pickup_address: formData.pickupAddress,
        delivery_address: formData.deliveryAddress,
        pickup_latitude: 0,
        pickup_longitude: 0,
        delivery_latitude: 0,
        delivery_longitude: 0,
        status: formData.driverId ? "assigned" : "pending",
        driver_id: formData.driverId || null,
        created_by: profile.user_id,
        assigned_at: formData.driverId ? new Date().toISOString() : null,
        delivery_notes: formData.deliveryNotes || null,
        priority: formData.priority, // Add priority to order data
      }

      const { data, error } = await supabase.from("orders").insert(orderData).select().single()

      if (error) throw error

      toast({
        title: "Order Created",
        description: `Order ${orderNumber} has been created successfully.`,
      })

      setFormData({
        orderNumber: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        pickupAddress: "",
        deliveryAddress: "",
        deliveryNotes: "",
        driverId: "",
        priority: "normal", // Reset priority
      })
      setCreateDialogOpen(false)
      fetchOrders()
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkFile || !profile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", bulkFile)
      formData.append("adminId", profile.user_id)

      const response = await fetch("/api/upload-orders", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      toast({
        title: "Import Successful",
        description: `${result.imported} orders imported successfully.`,
      })

      setBulkFile(null)
      setBulkImportOpen(false)
      fetchOrders()
    } catch (error) {
      console.error("Error importing orders:", error)
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import orders",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleBulkActions = async () => {
    if (selectedOrders.length === 0) return

    setSubmitting(true)
    try {
      let updateData: any = {}

      if (bulkAction === "assign" && bulkDriverId) {
        updateData = {
          driver_id: bulkDriverId,
          status: "assigned",
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      } else if (bulkAction === "status" && bulkStatus) {
        updateData = {
          status: bulkStatus,
          updated_at: new Date().toISOString(),
        }
      } else if (bulkAction === "delete") {
        const { error } = await supabase.from("orders").delete().in("id", selectedOrders)

        if (error) throw error

        toast({
          title: "Orders Deleted",
          description: `${selectedOrders.length} orders deleted successfully.`,
        })

        setSelectedOrders([])
        setBulkActionsOpen(false)
        fetchOrders()
        setSubmitting(false)
        return
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from("orders").update(updateData).in("id", selectedOrders)

        if (error) throw error

        toast({
          title: "Orders Updated",
          description: `${selectedOrders.length} orders updated successfully.`,
        })
      }

      setSelectedOrders([])
      setBulkActionsOpen(false)
      setBulkAction("")
      setBulkDriverId("")
      setBulkStatus("")
      fetchOrders()
    } catch (error) {
      console.error("Error performing bulk action:", error)
      toast({
        title: "Error",
        description: "Failed to perform bulk action. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map((order) => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const exportOrders = () => {
    const csvContent = [
      [
        "Order Number",
        "Customer Name",
        "Customer Phone",
        "Pickup Address",
        "Delivery Address",
        "Status",
        "Created Date",
      ],
      ...orders.map((order) => [
        order.order_number,
        order.customer_name,
        order.customer_phone,
        order.pickup_address,
        order.delivery_address,
        order.status,
        new Date(order.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Pending
          </Badge>
        )
      case "assigned":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Assigned
          </Badge>
        )
      case "picked_up":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Picked Up
          </Badge>
        )
      case "in_transit":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            In Transit
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Delivered
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "Unassigned"
    const driver = drivers.find((d) => d.user_id === driverId)
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown Driver"
  }

  const pendingOrders = orders.filter((order) => order.status === "pending")
  const activeOrders = orders.filter((order) => ["assigned", "picked_up", "in_transit"].includes(order.status))
  const completedOrders = orders.filter((order) => ["delivered", "cancelled"].includes(order.status))

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Order Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" onClick={exportOrders}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import Orders</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to import multiple orders at once. Make sure your file follows the template
                    format.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <OrderTemplateGenerator />
                  <div className="space-y-2">
                    <Label htmlFor="bulk-file">Select CSV File</Label>
                    <Input
                      id="bulk-file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkImport} disabled={!bulkFile || uploading}>
                    {uploading ? "Importing..." : "Import Orders"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {selectedOrders.length > 0 && (
              <Dialog open={bulkActionsOpen} onOpenChange={setBulkActionsOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Edit className="mr-2 h-4 w-4" />
                    Bulk Actions ({selectedOrders.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Actions</DialogTitle>
                    <DialogDescription>Perform actions on {selectedOrders.length} selected orders.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select value={bulkAction} onValueChange={setBulkAction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assign">Assign to Driver</SelectItem>
                          <SelectItem value="status">Update Status</SelectItem>
                          <SelectItem value="delete">Delete Orders</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bulkAction === "assign" && (
                      <div className="space-y-2">
                        <Label>Driver</Label>
                        <Select value={bulkDriverId} onValueChange={setBulkDriverId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.user_id}>
                                {driver.first_name} {driver.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {bulkAction === "status" && (
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="picked_up">Picked Up</SelectItem>
                            <SelectItem value="in_transit">In Transit</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkActionsOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkActions}
                      disabled={
                        submitting ||
                        !bulkAction ||
                        (bulkAction === "assign" && !bulkDriverId) ||
                        (bulkAction === "status" && !bulkStatus)
                      }
                      variant={bulkAction === "delete" ? "destructive" : "default"}
                    >
                      {submitting ? "Processing..." : bulkAction === "delete" ? "Delete Orders" : "Apply Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Fill in the order details. Orders can be assigned to drivers immediately or left pending for later
                    assignment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Order Number (Optional)</Label>
                      <Input
                        id="orderNumber"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverId">Assign Driver (Optional)</Label>
                      <Select
                        value={formData.driverId}
                        onValueChange={(value) => setFormData({ ...formData, driverId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No drivers available</div>
                          ) : (
                            drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.user_id}>
                                {driver.first_name} {driver.last_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Customer Phone</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pickupAddress">Pickup Address *</Label>
                    <Input
                      id="pickupAddress"
                      value={formData.pickupAddress}
                      onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                    <Input
                      id="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryNotes">Delivery Notes</Label>
                    <Textarea
                      id="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                      placeholder="Special instructions for the driver..."
                      rows={3}
                    />
                  </div>

                  {drivers.length === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">No Drivers Available</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            You don't have any drivers assigned to your team yet. Orders can still be created but will
                            remain pending until drivers are available.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setCreateDialogOpen(false)
                              router.push("/admin/drivers")
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Manage Drivers
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} disabled={submitting}>
                    {submitting ? "Creating..." : "Create Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {drivers.length === 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                  <Users className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">No drivers assigned to your team</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Use the invitation system to invite existing drivers or create new driver accounts.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/drivers")}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage Drivers
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          </TabsList>

          {["pending", "active", "completed"].map((tabValue) => {
            const tabOrders =
              tabValue === "pending" ? pendingOrders : tabValue === "active" ? activeOrders : completedOrders

            return (
              <TabsContent key={tabValue} value={tabValue} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {tabValue.charAt(0).toUpperCase() + tabValue.slice(1)} Orders
                      {selectedOrders.length > 0 && ` (${selectedOrders.length} selected)`}
                    </CardTitle>
                    <CardDescription>
                      {tabValue === "pending" && "Orders waiting for driver assignment"}
                      {tabValue === "active" && "Orders currently being processed"}
                      {tabValue === "completed" && "Delivered and cancelled orders"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">Loading orders...</div>
                    ) : tabOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No {tabValue} orders</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedOrders.length === tabOrders.length && tabOrders.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            {tabValue !== "pending" && <TableHead>Driver</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead>
                              {tabValue === "pending" ? "Created" : tabValue === "active" ? "Assigned" : "Completed"}
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tabOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedOrders.includes(order.id)}
                                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{order.order_number}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.customer_name}</p>
                                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                                </div>
                              </TableCell>
                              {tabValue !== "pending" && <TableCell>{getDriverName(order.driver_id)}</TableCell>}
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                {tabValue === "pending" && new Date(order.created_at).toLocaleDateString()}
                                {tabValue === "active" &&
                                  order.assigned_at &&
                                  new Date(order.assigned_at).toLocaleDateString()}
                                {tabValue === "completed" && new Date(order.updated_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {order.status === "delivered" && (
                                      <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/pod`)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        View POD
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
