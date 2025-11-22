import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
})

// Join warehouse room
export const joinWarehouse = (warehouseId) => {
  if (socket.connected && warehouseId) {
    socket.emit("join-warehouse", warehouseId)
    console.log("[v0] Joined warehouse room:", warehouseId)
  }
}

// Connect socket
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect()
    console.log("[v0] Socket connecting...")
  }
}

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect()
    console.log("[v0] Socket disconnected")
  }
}

export default socket
