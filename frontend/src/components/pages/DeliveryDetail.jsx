"use client"

import { useState, useEffect } from "react"
import { FiTruck, FiPackage, FiCheck, FiX } from "react-icons/fi"
import { useSocket } from "../../context/SocketContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function DeliveryDetail({ deliveryId, setCurrentPage }) {
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const socket = useSocket()

  useEffect(() => {
    fetchDelivery()

    if (socket) {
      socket.on("deliveryLineUpdated", (data) => {
        if (data.deliveryId === deliveryId) {
          fetchDelivery()
        }
      })

      socket.on("deliveryValidated", (data) => {
        if (data.id === deliveryId) {
          fetchDelivery()
        }
      })
    }

    return () => {
      if (socket) {
        socket.off("deliveryLineUpdated")
        socket.off("deliveryValidated")
      }
    }
  }, [socket, deliveryId])

  const fetchDelivery = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/deliveries/${deliveryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setDelivery(data)
    } catch (err) {
      console.error("Failed to fetch delivery:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateLineStatus = async (lineId, newStatus) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/deliveries/${deliveryId}/lines/${lineId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ line_status: newStatus }),
      })

      if (response.ok) {
        fetchDelivery()
      } else {
        alert("Failed to update line status")
      }
    } catch (err) {
      console.error("Error updating line status:", err)
    }
  }

  const validateDelivery = async () => {
    if (!confirm("Validate this delivery? This will decrease stock and cannot be undone.")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/deliveries/${deliveryId}/validate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (response.ok) {
        alert("Delivery validated successfully!")
        fetchDelivery()
      } else {
        alert(data.error || "Failed to validate delivery")
      }
    } catch (err) {
      alert("Error validating delivery")
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      Draft: "bg-gray-100 text-gray-800",
      Waiting: "bg-yellow-100 text-yellow-800",
      Ready: "bg-blue-100 text-blue-800",
      Done: "bg-green-100 text-green-800",
      Canceled: "bg-red-100 text-red-800",
    }
    return colors[status] || colors.Draft
  }

  const getLineStatusColor = (status) => {
    const colors = {
      Pending: "bg-gray-100 text-gray-800",
      Picked: "bg-blue-100 text-blue-800",
      Packed: "bg-purple-100 text-purple-800",
      Done: "bg-green-100 text-green-800",
    }
    return colors[status] || colors.Pending
  }

  if (loading) {
    return <div className="text-center py-12">Loading delivery...</div>
  }

  if (!delivery) {
    return <div className="text-center py-12 text-red-600">Delivery not found</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiTruck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-odoo-dark">Delivery Order</h2>
              <p className="text-sm text-odoo-medium">{delivery.ref_no}</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(delivery.status)}`}>{delivery.status}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-odoo-medium">Warehouse</p>
            <p className="font-semibold text-odoo-dark">{delivery.warehouse_name}</p>
          </div>
          <div>
            <p className="text-sm text-odoo-medium">Customer/Contact</p>
            <p className="font-semibold text-odoo-dark">{delivery.contact || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-odoo-medium">Created</p>
            <p className="font-semibold text-odoo-dark">{new Date(delivery.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold text-odoo-dark mb-4">Delivery Lines - Pick/Pack Workflow</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-odoo-dark">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-odoo-dark">SKU</th>
                  <th className="text-center py-3 px-4 font-semibold text-odoo-dark">Qty Ordered</th>
                  <th className="text-center py-3 px-4 font-semibold text-odoo-dark">Status</th>
                  {delivery.status !== "Done" && (
                    <th className="text-center py-3 px-4 font-semibold text-odoo-dark">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {delivery.lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{line.product_name}</td>
                    <td className="py-3 px-4 text-odoo-medium">{line.sku}</td>
                    <td className="py-3 px-4 text-center font-semibold">{line.qty_ordered}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getLineStatusColor(line.line_status)}`}
                      >
                        {line.line_status || "Pending"}
                      </span>
                    </td>
                    {delivery.status !== "Done" && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {(line.line_status === "Pending" || !line.line_status) && (
                            <button
                              onClick={() => updateLineStatus(line.id, "Picked")}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <FiCheck className="w-4 h-4" />
                              Pick
                            </button>
                          )}
                          {line.line_status === "Picked" && (
                            <button
                              onClick={() => updateLineStatus(line.id, "Packed")}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                            >
                              <FiPackage className="w-4 h-4" />
                              Pack
                            </button>
                          )}
                          {line.line_status === "Packed" && (
                            <button
                              onClick={() => updateLineStatus(line.id, "Done")}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                              <FiCheck className="w-4 h-4" />
                              Done
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
          <button onClick={() => setCurrentPage("delivery")} className="btn-secondary flex items-center gap-2">
            <FiX className="w-5 h-5" />
            Close
          </button>
          {delivery.status !== "Done" && delivery.status !== "Canceled" && (
            <button
              onClick={validateDelivery}
              className="ml-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <FiCheck className="w-5 h-5" />
              Validate Delivery
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Pick/Pack/Done Workflow:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Pending</strong> - Line item waiting to be picked
            </li>
            <li>
              • <strong>Picked</strong> - Item picked from warehouse, ready for packing
            </li>
            <li>
              • <strong>Packed</strong> - Item packed and ready for shipment
            </li>
            <li>
              • <strong>Done</strong> - Line item completed
            </li>
            <li>• Click "Validate Delivery" when all lines are ready to decrease stock</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
