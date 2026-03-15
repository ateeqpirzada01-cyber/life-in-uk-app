import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { PREMIUM_CONFIG } from '@/src/constants/config';
import { monitoring } from '@/src/lib/monitoring';

let connected = false;
let purchaseUpdateSub: EventSubscription | null = null;
let purchaseErrorSub: EventSubscription | null = null;

export const iap = {
  async initialize(): Promise<void> {
    if (connected) return;

    try {
      // Clean up any stale listeners before re-registering
      this.finalize();

      await initConnection();
      connected = true;

      purchaseUpdateSub = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          await finishTransaction({ purchase, isConsumable: false });
        }
      );

      purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
        if (error.code !== ErrorCode.UserCancelled) {
          monitoring.captureException(new Error(`IAP purchase error: ${error.code}`), {
            message: error.message,
          });
        }
      });
    } catch (e) {
      monitoring.captureException(e as Error, { context: 'iap.initialize' });
    }
  },

  async purchasePremium(): Promise<{ success: boolean }> {
    try {
      const products = await fetchProducts({
        skus: [PREMIUM_CONFIG.PRODUCT_ID],
      });

      if (!products || products.length === 0) {
        monitoring.captureMessage('IAP: No products found for ' + PREMIUM_CONFIG.PRODUCT_ID, 'warning');
        return { success: false };
      }

      if (Platform.OS === 'android') {
        await requestPurchase({
          request: { google: { skus: [PREMIUM_CONFIG.PRODUCT_ID] } },
          type: 'in-app',
        });
      } else {
        await requestPurchase({
          request: { apple: { sku: PREMIUM_CONFIG.PRODUCT_ID } },
          type: 'in-app',
        });
      }

      return { success: true };
    } catch (e: any) {
      if (e.code === ErrorCode.UserCancelled) return { success: false };
      monitoring.captureException(e, { context: 'iap.purchasePremium' });
      return { success: false };
    }
  },

  async restorePurchases(): Promise<{ success: boolean }> {
    try {
      const purchases = await getAvailablePurchases();
      const hasPremium = purchases.some(
        (p) => p.productId === PREMIUM_CONFIG.PRODUCT_ID
      );
      return { success: hasPremium };
    } catch (e) {
      monitoring.captureException(e as Error, { context: 'iap.restorePurchases' });
      return { success: false };
    }
  },

  async checkPremiumStatus(): Promise<boolean> {
    try {
      const purchases = await getAvailablePurchases();
      return purchases.some((p) => p.productId === PREMIUM_CONFIG.PRODUCT_ID);
    } catch {
      return false;
    }
  },

  finalize(): void {
    purchaseUpdateSub?.remove();
    purchaseErrorSub?.remove();
    purchaseUpdateSub = null;
    purchaseErrorSub = null;
    if (connected) {
      endConnection();
      connected = false;
    }
  },
};
