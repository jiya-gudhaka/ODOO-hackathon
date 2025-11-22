"use client"

import { useState, useEffect } from "react"
import { FiSearch, FiList, FiGrid, FiTrendingUp, FiTrendingDown, FiRepeat } from "react-icons/fi"
import { useSocket } from "../../context/SocketContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function MoveHistory() {
  const socket = useSocket()
  const [moves, setMoves] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState("list")

  const [filters, setFilters] = useState({
    product_id: "",
    warehouse_id: "",
    type: "",
    search: "",
  })

  useEffect(() => {
    fetchMoveHistory()
    fetchProducts()
    fetchWarehouses()

    if (socket) {
      socket.on("stockUpdated", () => fetchMoveHistory())
      socket.on("transferCreated", () => fetchMoveHistory())
      socket.on("receiptValidated", () => fetchMoveHistory())
      socket.on("deliveryValidated", () => fetchMoveHistory())
    }

    return () => {
      if (socket) {
        socket.off("stockUpdated")
        socket.off("transferCreated")
        socket.off("receiptValidated")
        socket.off("deliveryValidated")
      }
    }
  }, [socket, filters])

  const fetchMoveHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_URL}/api/move-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setMoves(data)
    } catch (err) {
      console.error("[v0] Failed to fetch move history:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      setProducts(data)
    } catch (err) {
      console.error("[v0] Failed to fetch products:", err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (err) {
      console.error("[v0] Failed to fetch warehouses:", err)
    }
  }

  const getMoveIcon = (type) => {
    if (type === "receipt" || type === "scan_add" || type === "initial_stock") {
      return <FiTrendingUp className="w-5 h-5 text-green-600" />
    } else if (type === "delivery" || type === "scan_remove") {
      return <FiTrendingDown className="w-5 h-5 text-red-600" />
    } else if (type === "transfer") {
      return <FiRepeat className="w-5 h-5 text-blue-600" />
    }
    return <FiList className="w-5 h-5 text-gray-600" />
  }

  const getMoveColor = (changeQty) => {
    if (changeQty > 0) return "text-green-600 font-semibold"
    if (changeQty < 0) return "text-red-600 font-semibold"
    return "text-gray-600"
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-odoo-dark">Move History / Ledger</h1>
        <p className="text-sm sm:text-base text-odoo-medium">Complete audit trail of all inventory movements</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odoo-medium" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by SKU or product..."
              className="input-field pl-10 w-full"
            />
          </div>

          <select
            value={filters.product_id}
            onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
            className="input-field w-full"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <select
            value={filters.warehouse_id}
            onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
            className="input-field w-full"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="input-field w-full"
          >
            <option value="">All Types</option>
            <option value="receipt">Receipt</option>
            <option value="delivery">Delivery</option>
            <option value="transfer">Transfer</option>
            <option value="adjustment">Adjustment</option>
            <option value="scan_add">Scan Add</option>
            <option value="scan_remove">Scan Remove</option>
          </select>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              viewMode === "list" ? "bg-odoo-purple text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <FiList className="w-5 h-5" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              viewMode === "kanban" ? "bg-odoo-purple text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <FiGrid className="w-5 h-5" />
            <span className="hidden sm:inline">Group by Type</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-odoo-purple text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">From</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">To</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Reference</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((move, idx) => (
                <tr key={move.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{new Date(move.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-odoo-dark">{move.product_name}</div>
                    <div className="text-xs text-odoo-medium font-mono">{move.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getMoveIcon(move.type)}
                      <span className="text-sm capitalize">{move.type.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{move.from_warehouse_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{move.to_warehouse_name || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={getMoveColor(move.change_qty)}>
                      {move.change_qty > 0 ? "+" : ""}
                      {move.change_qty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-odoo-purple">{move.ref_no || "-"}</td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{move.user_name || "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {moves.length === 0 && !loading && (
            <div className="text-center py-12">
              <FiList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-odoo-medium">No move history found</p>
            </div>
          )}
        </div>
      )}

      {/* Kanban View - Grouped by Type */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["receipt", "delivery", "transfer", "adjustment", "scan_add", "scan_remove"].map((type) => (
            <div key={type} className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-semibold text-odoo-dark mb-4 flex items-center gap-2 capitalize">
                {getMoveIcon(type)}
                {type.replace("_", " ")}
                <span className="ml-auto text-sm text-odoo-medium">
                  ({moves.filter((m) => m.type === type).length})
                </span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {moves
                  .filter((m) => m.type === type)
                  .map((move) => (
                    <div
                      key={move.id}
                      className="bg-odoo-lavender p-3 rounded-lg border border-odoo-purple border-opacity-20"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-mono text-sm text-odoo-purple">{move.ref_no || "N/A"}</p>
                        <span className={`text-sm font-semibold ${getMoveColor(move.change_qty)}`}>
                          {move.change_qty > 0 ? "+" : ""}
                          {move.change_qty}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-odoo-dark">{move.product_name}</p>
                      <p className="text-xs text-odoo-medium mt-1">{move.sku}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-odoo-medium">
                        <span>{move.to_warehouse_name || move.from_warehouse_name || "-"}</span>
                        <span>{new Date(move.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                {moves.filter((m) => m.type === type).length === 0 && (
                  <p className="text-sm text-odoo-medium text-center py-4">No movements</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="text-odoo-medium">Loading move history...</div>
        </div>
      )}
    </div>
  )
}
