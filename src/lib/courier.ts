/**
 * Courier Integration Helper
 * Provides helper functions for courier tracking URLs and timeline status steps.
 */

export interface CourierInfo {
  name: string;
  code: string;
  trackingId?: string;
  trackingUrl?: string;
}

export interface TrackingStep {
  key: 'order_placed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: Date | string;
}

/**
 * Known courier tracking URL generators
 */
export function getCourierTrackingUrl(courierName: string, trackingId: string): string {
  if (!trackingId) return '';
  const cleanId = trackingId.trim();
  const nameLower = courierName.toLowerCase();

  if (nameLower.includes('steadfast')) {
    return `https://steadfast.com.bd/tracking/${cleanId}`;
  }
  if (nameLower.includes('pathao')) {
    return `https://pathao.com/courier/tracking/?consignment_id=${cleanId}`;
  }
  if (nameLower.includes('redx')) {
    return `https://redx.com.bd/track-order?trackingId=${cleanId}`;
  }
  if (nameLower.includes('paperfly')) {
    return `https://www.paperfly.com.bd/tracking.php?tracking_id=${cleanId}`;
  }
  if (nameLower.includes('sunderban') || nameLower.includes('sundarban')) {
    return `https://www.sundarban-courier.com/tracking?cn=${cleanId}`;
  }

  // Fallback
  return `https://www.google.com/search?q=${encodeURIComponent(`${courierName} tracking ${cleanId}`)}`;
}

/**
 * Standard 5-step visual tracking pipeline calculation
 */
export function getTrackingSteps(
  fulfillmentStatus: string,
  courierStatus?: string,
  createdAt?: string | Date,
  updatedAt?: string | Date
): TrackingStep[] {
  const isCancelled = fulfillmentStatus === 'cancelled';
  let currentStepIndex = 0;

  if (fulfillmentStatus === 'delivered' || courierStatus === 'delivered') {
    currentStepIndex = 4;
  } else if (courierStatus === 'out_for_delivery') {
    currentStepIndex = 3;
  } else if (fulfillmentStatus === 'shipped' || courierStatus === 'in_transit' || courierStatus === 'picked_up') {
    currentStepIndex = 2;
  } else if (fulfillmentStatus === 'processing') {
    currentStepIndex = 1;
  } else {
    currentStepIndex = 0;
  }

  const steps: TrackingStep[] = [
    {
      key: 'order_placed',
      title: 'Order Placed',
      description: 'Your order has been received and confirmed.',
      completed: currentStepIndex >= 0 && !isCancelled,
      active: currentStepIndex === 0 && !isCancelled,
      timestamp: createdAt,
    },
    {
      key: 'processing',
      title: 'Processing & Packed',
      description: 'Items are safety-tested, packed, and assigned for shipping.',
      completed: currentStepIndex >= 1 && !isCancelled,
      active: currentStepIndex === 1 && !isCancelled,
    },
    {
      key: 'shipped',
      title: 'Handed to Courier',
      description: 'Order handed over to courier service for transit.',
      completed: currentStepIndex >= 2 && !isCancelled,
      active: currentStepIndex === 2 && !isCancelled,
    },
    {
      key: 'out_for_delivery',
      title: 'Out for Delivery',
      description: 'Courier agent is on the way to your delivery location.',
      completed: currentStepIndex >= 3 && !isCancelled,
      active: currentStepIndex === 3 && !isCancelled,
    },
    {
      key: 'delivered',
      title: 'Delivered',
      description: 'Package successfully delivered to customer.',
      completed: currentStepIndex >= 4 && !isCancelled,
      active: currentStepIndex === 4 && !isCancelled,
      timestamp: currentStepIndex >= 4 ? updatedAt : undefined,
    },
  ];

  return steps;
}
