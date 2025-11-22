"use client"

import { useState } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import Navigation from "../components/Navigation"
import DashboardHome from "../components/pages/DashboardHome"
import StockPage from "../components/pages/StockPage"
import MoveHistory from "../components/pages/MoveHistory"
import ReceiptsDashboard from "../components/pages/ReceiptsDashboard"
import ReceiptForm from "../components/pages/ReceiptForm"
import DeliveryDashboard from "../components/pages/DeliveryDashboard"
import WarehouseSettings from "../components/pages/WarehouseSettings"
import LocationSettings from "../components/pages/LocationSettings"
import Profile from "../components/pages/Profile"
import BarcodeScanner from "../components/BarcodeScanner"
import NotificationsPanel from "../components/NotificationsPanel"
import TransferForm from "../components/pages/TransferForm"
import StockAdjustment from "../components/pages/StockAdjustment"
import ProductManagement from "../components/pages/ProductManagement"

export default function Dashboard({ userInfo, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  const setCurrentPage = (page) => {
    navigate(`/dashboard/${page}`)
  }

  return (
    <div className="flex h-screen bg-grey-50">
      {/* Sidebar Navigation */}
      <Navigation
        userInfo={userInfo}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navigate={navigate}
      />

      {/* Main Content */}
      <div
        className={`flex-1 overflow-auto pt-16 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}
        style={{ backgroundColor: "#F9FAFB" }}
      >
        <div className="p-6">
          <Routes>
            <Route path="/" element={<DashboardHome setCurrentPage={setCurrentPage} />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/move-history" element={<MoveHistory />} />
            <Route path="/receipts" element={<ReceiptsDashboard setCurrentPage={setCurrentPage} />} />
            <Route path="/receipt-create" element={<ReceiptForm setCurrentPage={setCurrentPage} />} />
            <Route path="/receipt-edit/:id" element={<ReceiptForm setCurrentPage={setCurrentPage} />} />
            <Route path="/delivery" element={<DeliveryDashboard setCurrentPage={setCurrentPage} />} />
            <Route path="/warehouse" element={<WarehouseSettings />} />
            <Route path="/location" element={<LocationSettings setCurrentPage={setCurrentPage} />} />
            <Route path="/profile" element={<Profile userInfo={userInfo} onLogout={onLogout} />} />
            <Route path="/scanner" element={<BarcodeScanner warehouseId={null} />} />
            <Route path="/notifications" element={<NotificationsPanel />} />
            <Route path="/transfers" element={<TransferForm />} />
            <Route path="/adjustments" element={<StockAdjustment />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
