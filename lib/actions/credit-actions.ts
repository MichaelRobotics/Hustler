'use server';

import { whopSdk } from '@/lib/whop-sdk';
import { headers } from 'next/headers';
// Removed revalidatePath import - no longer needed
import { CREDIT_PACKS, type CreditPackId } from '../types/credit';
import { getUserCredits as getDbUserCredits, updateUserCredits } from '../context/user-context';

/**
 * Get user's credit balance from database
 */
export async function getUserCredits(): Promise<number> {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    // Get from database
    return await getDbUserCredits(userId);
  } catch (error) {
    console.error('Error getting user credits:', error);
    return 2; // Default to 2 free credits
  }
}

/**
 * Check if user can generate (has credits available)
 */
export async function canGenerate(): Promise<boolean> {
  const credits = await getUserCredits();
  return credits > 0; // Can generate if credits > 0
}

/**
 * Consume 1 credit for generation
 */
export async function consumeCredit(): Promise<boolean> {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    // Check current credits first
    const currentCredits = await getDbUserCredits(userId);
    
    if (currentCredits <= 0) {
      return false; // No credits available
    }
    
    // Update credits in database
    const success = await updateUserCredits(userId, 1, 'subtract');
    
    if (success) {
      console.log(`User ${userId} consumed 1 credit. Remaining: ${currentCredits - 1}`);
      // Removed revalidatePath - let client-side state handle UI updates
    }
    
    return success;
  } catch (error) {
    console.error('Error consuming credit:', error);
    throw error;
  }
}

/**
 * Add credits to user's balance (called from webhook after purchase)
 */
export async function addCredits(userId: string, amount: number): Promise<void> {
  try {
    const currentCredits = await getDbUserCredits(userId);
    const success = await updateUserCredits(userId, amount, 'add');
    
    if (success) {
      console.log(`Added ${amount} credits to user ${userId}. New balance: ${currentCredits + amount}`);
      // Removed revalidatePath - let client-side state handle UI updates
    } else {
      throw new Error('Failed to add credits to database');
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
}

/**
 * Create a charge for credit pack purchase
 */
export async function createCreditPackCharge(packId: CreditPackId): Promise<{
  status: 'needs_action' | 'success';
  inAppPurchase?: {
    id: string;
    planId: string;
  };
}> {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    const pack = CREDIT_PACKS[packId];
    if (!pack.planId) {
      throw new Error(`Plan ID not configured for pack ${packId}`);
    }
    
    // Create charge using Whop SDK
    const result = await whopSdk.payments.chargeUser({
      userId,
      amount: pack.price,
      currency: 'usd',
      description: `${pack.name} - ${pack.credits} AI Funnel Credits`,
      metadata: {
        packId,
        credits: pack.credits,
        type: 'credit_pack'
      }
    });
    
    if (!result) {
      throw new Error('Failed to create charge');
    }
    
    return {
      status: result.status as 'needs_action' | 'success',
      inAppPurchase: result.inAppPurchase ? {
        id: result.inAppPurchase.id,
        planId: result.inAppPurchase.planId
      } : undefined
    };
  } catch (error) {
    console.error('Error creating credit pack charge:', error);
    throw error;
  }
}

/**
 * Get credit pack information
 */
export async function getCreditPack(packId: CreditPackId) {
  return CREDIT_PACKS[packId];
}

/**
 * Get all available credit packs
 */
export async function getAllCreditPacks() {
  return Object.values(CREDIT_PACKS);
}