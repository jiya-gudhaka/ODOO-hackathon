"use client"

import { useState, useEffect } from "react"
import { FiPackage, FiAlertTriangle, FiDownload, FiUpload, FiRepeat } from "react-icons/fi"
import KPICard from "../KPICard"
import { useSocket } from "../../context/SocketContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function DashboardHome({ setCurrentPage }) {
  const socket = useSocket()
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
  })
  const [lowStockItems, setLowStockItems] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()

    if (socket) {
      socket.on("stockUpdated", handleStockUpdate)
      socket.on("lowStock", handleLowStock)
      socket.on("receiptCreated", () => fetchDashboardData())
      socket.on("deliveryCreated", () => fetchDashboardData())
      socket.on("transferCreated", () => fetchDashboardData())
    }

    return () => {
      if (socket) {
        socket.off("stockUpdated")
        socket.off("lowStock")
        socket.off("receiptCreated")
        socket.off("deliveryCreated")
        socket.off("transferCreated")
      }
    }
  }, [socket])

  const handleStockUpdate = (data) => {
    console.log("[v0] Stock updated:", data)
    fetchDashboardData()
  }

  const handleLowStock = (data) => {
    console.log("[v0] Low stock alert:", data)
    // Show toast notification
    showToast(`Low Stock: ${data.productName} (${data.sku}) - ${data.quantity} remaining`, "warning")
    fetchDashboardData()
  }

  const showToast = (message, type = "info") => {
    // Simple toast implementation
    const toast = document.createElement("div")
    toast.className = `fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-medium ${
      type === "warning" ? "bg-yellow-600" : "bg-blue-600"
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 5000)
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token")
      const headers = { Authorization: `Bearer ${token}` }

      const [statsRes, lowStockRes, receiptsRes, deliveriesRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`, { headers }),
        fetch(`${API_URL}/api/low-stock`, { headers }),
        fetch(`${API_URL}/api/receipts`),
        fetch(`${API_URL}/api/deliveries`),
      ])

      const stats = await statsRes.json()
      const lowStock = await lowStockRes.json()
      const receipts = await receiptsRes.json()
      const deliveries = await deliveriesRes.json()

      setKpis(stats)
      setLowStockItems(lowStock.slice(0, 5))
      setRecentReceipts(receipts.slice(0, 5))
      setRecentDeliveries(deliveries.slice(0, 5))

      setLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 mt-16">
        <div className="text-center text-odoo-medium">Loading dashboard data...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-odoo-dark">Dashboard</h1>
        <p className="text-sm sm:text-base text-odoo-medium">Real-time inventory operations overview</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <KPICard
          title="Total Products"
          value={kpis.totalProducts}
          color="purple"
          icon={FiPackage}
          onClick={() => setCurrentPage("stock")}
        />
        <KPICard
          title="Low Stock"
          value={kpis.lowStockCount}
          color="red"
          icon={FiAlertTriangle}
          onClick={() => setCurrentPage("stock")}
        />
        <KPICard
          title="Pending Receipts"
          value={kpis.pendingReceipts}
          color="blue"
          icon={FiDownload}
          onClick={() => setCurrentPage("receipts")}
        />
        <KPICard
          title="Pending Deliveries"
          value={kpis.pendingDeliveries}
          color="green"
          icon={FiUpload}
          onClick={() => setCurrentPage("delivery")}
        />
        <KPICard
          title="Transfers"
          value={kpis.scheduledTransfers}
          color="yellow"
          icon={FiRepeat}
          onClick={() => setCurrentPage("transfers")}
        />
      </div>

      {/* Summary Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-odoo-dark">Low Stock Alerts</h2>
            <button
              onClick={() => setCurrentPage("notifications")}
              className="text-sm font-semibold hover:underline self-start sm:self-auto text-odoo-purple"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-200">
                  <div className="flex-1">
                    <span className="font-medium text-sm sm:text-base text-odoo-dark">{item.name}</span>
                    <p className="text-xs text-odoo-medium">
                      {item.sku} - {item.warehouse_name}
                    </p>
                  </div>
                  <span className="badge bg-red-100 text-red-700">
                    {item.quantity} / {item.min_quantity}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-odoo-medium">No low stock items</p>
            )}
          </div>
        </div>

        {/* Recent Receipts */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-odoo-dark">Recent Receipts</h2>
            <button
              onClick={() => setCurrentPage("receipts")}
              className="text-sm font-semibold hover:underline self-start sm:self-auto text-odoo-purple"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {recentReceipts.length > 0 ? (
              recentReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex flex-col sm:flex-row sm:justify-between gap-2 py-3 border-b border-gray-200"
                >
                  <span className="font-medium text-sm sm:text-base text-odoo-dark">{receipt.ref_no}</span>
                  <span className={`badge badge-${receipt.status.toLowerCase()} self-start sm:self-auto`}>
                    {receipt.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-odoo-medium">No receipts found</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-odoo-dark">Recent Deliveries</h2>
          <button
            onClick={() => setCurrentPage("delivery")}
            className="text-sm font-semibold hover:underline self-start sm:self-auto text-odoo-purple"
          >
            View All →
          </button>
        </div>
        <div className="space-y-2">
          {recentDeliveries.length > 0 ? (
            recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex flex-col sm:flex-row sm:justify-between gap-2 py-3 border-b border-gray-200"
              >
                <span className="font-medium text-sm sm:text-base text-odoo-dark">{delivery.ref_no}</span>
                <span className={`badge badge-${delivery.status.toLowerCase()} self-start sm:self-auto`}>
                  {delivery.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-odoo-medium">No deliveries found</p>
          )}
        </div>
      </div>
    </div>
  )
}
