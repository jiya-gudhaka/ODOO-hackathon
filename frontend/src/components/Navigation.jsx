"use client"

import { useState } from "react"
import {
  FiHome,
  FiPackage,
  FiDownload,
  FiUpload,
  FiClock,
  FiSettings,
  FiUser,
  FiMenu,
  FiX,
  FiMapPin,
  FiLogOut,
  FiChevronDown,
  FiFileText,
} from "react-icons/fi"
import { MdWarehouse } from "react-icons/md"

export default function Navigation({ currentPage, setCurrentPage, userInfo, onLogout, sidebarOpen, setSidebarOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(null)

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: FiHome },
    { id: "stock", label: "Stock", icon: FiPackage },
    { id: "receipts", label: "Receipts", icon: FiDownload },
    { id: "invoices", label: "Invoices", icon: FiFileText },
    { id: "delivery", label: "Delivery", icon: FiUpload },
    { id: "move-history", label: "Move History", icon: FiClock },
    { id: "settings", label: "Settings", icon: FiSettings, submenu: true },
  ]

  const settings = [
    { id: "warehouse", label: "Warehouse", icon: MdWarehouse },
    { id: "location", label: "Location", icon: FiMapPin },
  ]

  return (
    <>
      {/* Header Bar */}
      <div
        className="bg-white border-b h-16 flex items-center justify-between px-6 fixed top-0 right-0 left-0 z-50 shadow-sm"
        style={{ borderColor: "#E5E5E7" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            style={{ color: "#714B67" }}
          >
            {sidebarOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
          <h2 className="text-xl font-bold" style={{ color: "#714B67" }}>
            Stock Master
          </h2>
        </div>

        <button
          onClick={() => setCurrentPage("profile")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          style={{ color: "#4A4A4A" }}
        >
          <FiUser className="w-5 h-5" />
          {userInfo?.name && <span className="text-sm font-medium">{userInfo.name}</span>}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-white border-r pt-20 transition-all duration-300 fixed left-0 top-0 bottom-0 overflow-y-auto shadow-sm`}
        style={{ borderColor: "#E5E5E7" }}
      >
        <nav className="space-y-1 p-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.submenu) {
                      setDropdownOpen(dropdownOpen === item.id ? null : item.id)
                    } else {
                      setCurrentPage(item.id)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentPage === item.id ? "font-semibold shadow-sm" : "hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor: currentPage === item.id ? "#E4D8F5" : "transparent",
                    color: currentPage === item.id ? "#714B67" : "#4A4A4A",
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  {item.submenu && sidebarOpen && (
                    <FiChevronDown
                      className={`ml-auto w-4 h-4 transition-transform ${dropdownOpen === item.id ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {item.submenu && dropdownOpen === item.id && sidebarOpen && (
                  <div className="ml-4 space-y-1 mt-1">
                    {settings.map((setting) => {
                      const SettingIcon = setting.icon
                      return (
                        <button
                          key={setting.id}
                          onClick={() => setCurrentPage(setting.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                            currentPage === setting.id ? "font-semibold" : "hover:bg-gray-50"
                          }`}
                          style={{
                            backgroundColor: currentPage === setting.id ? "#E4D8F5" : "transparent",
                            color: currentPage === setting.id ? "#714B67" : "#8F8F9F",
                          }}
                        >
                          <SettingIcon className="w-4 h-4" />
                          {setting.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout Button */}
        {sidebarOpen && (
          <div className="p-3 mt-auto border-t" style={{ borderColor: "#E5E5E7" }}>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-red-50"
              style={{ color: "#DC2626" }}
            >
              <FiLogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
