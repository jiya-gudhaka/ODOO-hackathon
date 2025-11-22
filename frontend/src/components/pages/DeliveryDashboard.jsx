"use client"

import { useState } from "react"
import { FiPlus, FiSearch } from "react-icons/fi"

export default function DeliveryDashboard({ setCurrentPage }) {
  const [deliveries, setDeliveries] = useState([
    {
      id: 1,
      reference: "WH/OUT/0001",
      from: "WH/Stock1",
      to: "vendor",
      contact: "Azure Interior",
      scheduleDate: "12/1/2001",
      status: "Ready",
    },
    {
      id: 2,
      reference: "WH/OUT/0002",
      from: "WH/Stock1",
      to: "vendor",
      contact: "Azure Interior",
      scheduleDate: "12/1/2001",
      status: "Ready",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#2E2E2E" }}>
          Delivery
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "#8F8F9F" }}>
          When user click on Delivery operations
        </p>
      </div>

      {/* Warehouse Label */}
      <div className="mb-4 sm:mb-6 text-sm sm:text-base font-semibold" style={{ color: "#8F8F9F" }}>
        Chirag
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button className="btn-primary flex items-center justify-center gap-2">
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span>NEW</span>
        </button>
        <div className="relative flex-1">
          <FiSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 flex-shrink-0"
            style={{ color: "#8F8F9F" }}
          />
          <input
            type="text"
            placeholder="Search by reference or contact..."
            className="input-field pl-10 w-full text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[768px]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "#714B67" }}>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  Reference
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  From
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  To
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  Contact
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  Schedule Date
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#714B67" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="table-row">
                  <td className="py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm" style={{ color: "#714B67" }}>
                    {delivery.reference}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm" style={{ color: "#4A4A4A" }}>
                    {delivery.from}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm" style={{ color: "#4A4A4A" }}>
                    {delivery.to}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm" style={{ color: "#4A4A4A" }}>
                    {delivery.contact}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
                    {delivery.scheduleDate}
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {delivery.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs sm:text-sm mt-4 px-4 sm:px-0" style={{ color: "#8F8F9F" }}>
        Populate all delivery orders
      </p>
    </div>
  )
}
