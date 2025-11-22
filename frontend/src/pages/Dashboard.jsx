"use client"

import { useState } from "react"
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
import InvoiceDashboard from "../components/pages/InvoiceDashboard"
import InvoiceDetail from "../components/pages/InvoiceDetail"

export default function Dashboard({ currentPage, setCurrentPage, userInfo, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderPage = () => {
    if (currentPage === "receipt-create") {
      return <ReceiptForm setCurrentPage={setCurrentPage} />
    }
    if (currentPage.startsWith("receipt-edit-")) {
      const receiptId = currentPage.replace("receipt-edit-", "")
      return <ReceiptForm setCurrentPage={setCurrentPage} receiptId={receiptId} />
    }
    if (currentPage.startsWith("invoice-detail-")) {
      const invoiceId = currentPage.replace("invoice-detail-", "")
      return <InvoiceDetail setCurrentPage={setCurrentPage} invoiceId={invoiceId} />
    }

    switch (currentPage) {
      case "dashboard":
        return <DashboardHome setCurrentPage={setCurrentPage} />
      case "stock":
        return <StockPage />
      case "move-history":
        return <MoveHistory />
      case "receipts":
        return <ReceiptsDashboard setCurrentPage={setCurrentPage} />
      case "invoices":
        return <InvoiceDashboard setCurrentPage={setCurrentPage} />
      case "delivery":
        return <DeliveryDashboard setCurrentPage={setCurrentPage} />
      case "warehouse":
        return <WarehouseSettings />
      case "location":
        return <LocationSettings setCurrentPage={setCurrentPage} />
      case "profile":
        return <Profile userInfo={userInfo} onLogout={onLogout} />
      default:
        return <DashboardHome setCurrentPage={setCurrentPage} />
    }
  }

  return (
    <div className="flex h-screen bg-grey-50">
      {/* Sidebar Navigation */}
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userInfo={userInfo}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div
        className={`flex-1 overflow-auto pt-16 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}
        style={{ backgroundColor: "#F9FAFB" }}
      >
        <div className="p-6">{renderPage()}</div>
      </div>
    </div>
  )
}
