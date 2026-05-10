export { default as FloatingChatWidget, SUPPORT_OPEN_EVENT } from "./FloatingChatWidget";

// Helper to open the support chat from anywhere in the app
export function openSupportChat() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-support-chat"));
  }
}

