"use client"

import { useState } from "react"
import { FiPlus, FiEdit2 } from "react-icons/fi"

export default function WarehouseSettings() {
  const [warehouses, setWarehouses] = useState([
    { id: 1, name: "Main Warehouse", shortCode: "WH", address: "123 Main St, City" },
    { id: 2, name: "Branch Warehouse", shortCode: "BRH", address: "456 Branch Ave, Town" },
  ])

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: "", shortCode: "", address: "" })

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#2E2E2E" }}>
          Warehouse Settings
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "#8F8F9F" }}>
          This page contains the warehouse details & location.
        </p>
      </div>

      {/* Add Form */}
      <div className="card mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{ color: "#2E2E2E" }}>
          Add New Warehouse
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: "#4A4A4A" }}>
                Name
              </label>
              <input type="text" className="input-field w-full text-sm sm:text-base" placeholder="Warehouse name" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: "#4A4A4A" }}>
                Short Code
              </label>
              <input type="text" className="input-field w-full text-sm sm:text-base" placeholder="WH" />
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: "#4A4A4A" }}>
              Address
            </label>
            <textarea
              className="input-field w-full text-sm sm:text-base"
              placeholder="Full address"
              rows="3"
            ></textarea>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Add Warehouse</span>
          </button>
        </div>
      </div>

      {/* Warehouse List */}
      <div className="card">
        <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{ color: "#2E2E2E" }}>
          Existing Warehouses
        </h2>
        <div className="space-y-3 sm:space-y-4">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#E5E5E7" }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate" style={{ color: "#2E2E2E" }}>
                    {wh.name}
                  </h3>
                  <p className="text-xs sm:text-sm mt-1" style={{ color: "#8F8F9F" }}>
                    Code: {wh.shortCode}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
                    Address: {wh.address}
                  </p>
                </div>
                <button
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold self-start sm:self-auto"
                  style={{ color: "#714B67" }}
                >
                  <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs sm:text-sm mt-4 px-4 sm:px-0" style={{ color: "#8F8F9F" }}>
        This holds the multiple locations of warehouse, rooms etc..
      </p>
    </div>
  )
}
