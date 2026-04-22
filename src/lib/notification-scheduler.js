// ==============================
// TELKO.STORE — Notification Scheduler
// Delayed WhatsApp notification with cancellation
// ==============================

const DELAY_MS = 10_000; // 10 seconds

// In-memory map: orderId → { timer, type }
const pendingNotifications = new Map();

/**
 * Schedule a WhatsApp notification with a delay.
 * If the notification is cancelled before the delay expires, it won't be sent.
 *
 * @param {string} orderId - Order ID used as the cancellation key
 * @param {number} delayMs - Delay in milliseconds (default 10s)
 * @param {() => Promise<void>} sendFn - Async function that sends the notification
 */
export function scheduleNotification(orderId, delayMs = DELAY_MS, sendFn) {
  // Cancel any existing pending notification for this order
  cancelNotification(orderId);

  const timer = setTimeout(async () => {
    pendingNotifications.delete(orderId);
    try {
      await sendFn();
    } catch (err) {
      console.error(`❌ Scheduled notification failed for ${orderId}:`, err.message);
    }
  }, delayMs);

  // Prevent the timer from keeping the process alive
  timer.unref?.();

  pendingNotifications.set(orderId, { timer });
  console.log(`⏳ Notification scheduled for ${orderId} (${delayMs / 1000}s delay)`);
}

/**
 * Cancel a pending notification for an order.
 * Returns true if a notification was cancelled, false if none was pending.
 *
 * @param {string} orderId - Order ID
 * @returns {boolean} Whether a notification was cancelled
 */
export function cancelNotification(orderId) {
  const pending = pendingNotifications.get(orderId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingNotifications.delete(orderId);
    console.log(`🚫 Pending notification cancelled for ${orderId} (payment received quickly)`);
    return true;
  }
  return false;
}
