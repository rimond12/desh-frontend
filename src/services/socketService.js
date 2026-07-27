import { io } from "socket.io-client";

let socket = null;

const getSocketUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  // Strip trailing /api or /api/
  return apiUrl.replace(/\/api\/?$/, "");
};

/**
 * Initialize and connect Socket.IO client instance
 */
export function initSocketClient() {
  if (!socket) {
    const url = getSocketUrl();
    console.log(`[Socket.IO Client] Connecting to ${url}...`);
    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log(`[Socket.IO Client] Connected! Socket ID: ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO Client] Disconnected (${reason})`);
    });

    socket.on("connect_error", (error) => {
      console.warn(`[Socket.IO Client] Connection error:`, error.message);
    });
  }
  return socket;
}

/**
 * Register active userId(s) to join real-time user channel rooms (user_<userId>)
 */
export function registerSocketUser(userKeys) {
  const s = initSocketClient();
  const keys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [userKeys].filter(Boolean);
  if (!keys.length) return;

  const doRegister = () => {
    s.emit("register_user", keys.map(String));
  };

  if (s.connected) {
    doRegister();
  } else {
    s.once("connect", doRegister);
  }
}

/**
 * Leave user room channels on logout
 */
export function unregisterSocketUser(userKeys) {
  const keys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [userKeys].filter(Boolean);
  if (socket && keys.length) {
    socket.emit("leave_user", keys.map(String));
  }
}

/**
 * Get active socket instance
 */
export function getSocketClient() {
  return socket || initSocketClient();
}

/**
 * Disconnect socket cleanly
 */
export function disconnectSocketClient() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
