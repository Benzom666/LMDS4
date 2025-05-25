"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/contexts/auth-context"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Menu,
  Home,
  Package,
  Users,
  Settings,
  LogOut,
  BarChart3,
  UserCheck,
  Mail,
  User,
  Shield,
  Truck,
  ChevronRight,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getNavigationItems = () => {
    if (!profile) return []

    const baseItems = [
      {
        name: "Dashboard",
        href:
          profile.role === "super_admin"
            ? "/super-admin"
            : profile.role === "admin"
              ? "/admin/dashboard"
              : "/driver/home",
        icon: Home,
        gradient: "from-blue-500 to-cyan-500",
      },
    ]

    if (profile.role === "super_admin") {
      return [
        ...baseItems,
        { name: "Admins", href: "/super-admin/admins", icon: UserCheck, gradient: "from-purple-500 to-pink-500" },
        { name: "All Drivers", href: "/super-admin/drivers", icon: Users, gradient: "from-green-500 to-emerald-500" },
        { name: "System Stats", href: "/super-admin/stats", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
      ]
    }

    if (profile.role === "admin") {
      return [
        ...baseItems,
        { name: "Orders", href: "/admin/orders", icon: Package, gradient: "from-indigo-500 to-purple-500" },
        { name: "Drivers", href: "/admin/drivers", icon: Users, gradient: "from-green-500 to-teal-500" },
      ]
    }

    if (profile.role === "driver") {
      return [
        ...baseItems,
        { name: "Orders", href: "/driver/orders", icon: Package, gradient: "from-blue-500 to-indigo-500" },
        { name: "Invitations", href: "/driver/invitations", icon: Mail, gradient: "from-pink-500 to-rose-500" },
        { name: "Profile", href: "/driver/profile", icon: User, gradient: "from-cyan-500 to-blue-500" },
      ]
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  const getRoleIcon = () => {
    switch (profile?.role) {
      case "super_admin":
        return <Shield className="h-4 w-4 text-yellow-400" />
      case "admin":
        return <UserCheck className="h-4 w-4 text-blue-400" />
      case "driver":
        return <Truck className="h-4 w-4 text-green-400" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex h-full flex-col ${mobile ? "w-full" : "w-72"} premium-card border-r border-white/10`}>
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
        <Link
          className="flex items-center gap-3 font-bold text-xl group"
          href={
            profile?.role === "super_admin"
              ? "/super-admin"
              : profile?.role === "admin"
                ? "/admin/dashboard"
                : "/driver/orders"
          }
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
          </div>
          <span className="gradient-text text-shadow">DeliveryOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navigationItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover-lift ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
              onClick={() => mobile && setSidebarOpen(false)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`p-2 rounded-lg bg-gradient-to-r ${item.gradient} group-hover:scale-110 transition-transform duration-300`}
              >
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-blue-400" />}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm">
          <Avatar className="h-10 w-10 ring-2 ring-blue-500/30">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {profile?.first_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <div className="flex items-center gap-1">
              {getRoleIcon()}
              <p className="text-xs text-slate-400 capitalize truncate">{profile?.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="premium-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block relative z-10">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 bg-slate-900/95 backdrop-blur-xl border-white/10">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden hover:bg-white/10 rounded-xl transition-all duration-300"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <NotificationsDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-blue-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                      {profile.first_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 premium-card border-white/10" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium leading-none text-white">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-xs leading-none text-slate-400">{profile.email}</p>
                    <div className="flex items-center gap-2">
                      {getRoleIcon()}
                      <p className="text-xs leading-none text-slate-400 capitalize">{profile.role.replace("_", " ")}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => router.push(profile.role === "driver" ? "/driver/profile" : "/profile")}
                  className="hover:bg-white/10 text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="animate-slide-in-up">{children}</div>
        </main>
      </div>
    </div>
  )
}
