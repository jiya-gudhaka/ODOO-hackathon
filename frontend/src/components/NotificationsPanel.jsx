"use client"

import { useState, useEffect } from "react"
import { FiAlertTriangle, FiCheck, FiBell } from "react-icons/fi"
import { useSocket } from "../context/SocketContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const socket = useSocket()

  useEffect(() => {
    fetchNotifications()

    // Listen for real-time low stock alerts
    if (socket) {
      socket.on("lowStock", (data) => {
        const newNotification = {
          id: Date.now(),
          type: "low_stock",
          title: "Low Stock Alert",
          message: `${data.productName} (${data.sku}) is below minimum quantity in ${data.warehouseName}. Current: ${data.quantity}, Min: ${data.minQuantity}`,
          product_id: data.productId,
          warehouse_id: data.warehouseId,
          is_read: false,
          created_at: new Date().toISOString(),
        }
        setNotifications((prev) => [newNotification, ...prev])
      })
    }

    return () => {
      if (socket) {
        socket.off("lowStock")
      }
    }
  }, [socket])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setNotifications(data)
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-odoo-lavender rounded-lg flex items-center justify-center flex-shrink-0">
            <FiBell className="w-6 h-6 text-odoo-purple" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-odoo-dark">Notifications</h2>
            {unreadCount > 0 && <p className="text-sm text-odoo-medium">{unreadCount} unread</p>}
          </div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <FiCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-odoo-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all ${
                notification.is_read ? "bg-gray-50 border-gray-200" : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <FiAlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    notification.is_read ? "text-gray-400" : "text-yellow-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-odoo-dark">{notification.title}</h3>
                  <p className="text-sm text-odoo-medium mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-sm text-odoo-purple hover:text-odoo-plum font-medium flex-shrink-0"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
