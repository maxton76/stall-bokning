/**
 * Stripe Connect Utilities
 *
 * Helpers for Stripe Connect Standard account management.
 * Wraps Stripe SDK calls for connected account operations.
 */

import Stripe from "stripe";
import { stripe } from "./stripe.js";
import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { StripeAccountStatus } from "@equiduty/shared";

/**
 * Create a new Stripe Standard connected account for an organization.
 * If the org already has a connected account, returns the existing one.
 */
export async function createConnectedAccount(
  organizationId: string,
  email?: string,
): Promise<Stripe.Account> {
  const settingsRef = db
    .collection("organizationStripeSettings")
    .doc(organizationId);

  // Use a transaction to prevent duplicate Stripe account creation (TOCTOU race)
  let existingAccountId: string | null = null;

  await db.runTransaction(async (transaction) => {
    const settingsSnap = await transaction.get(settingsRef);

    if (settingsSnap.exists && settingsSnap.data()?.stripeAccountId) {
      // Account already exists, return early
      existingAccountId = settingsSnap.data()!.stripeAccountId;
      return;
    }

    // Create new Standard connected account (Stripe call inside transaction is safe --
    // if the transaction retries, Stripe is idempotent per account metadata)
    const account = await stripe.accounts.create({
      type: "standard",
      country: "SE",
      email,
      metadata: {
        organizationId,
        platform: "equiduty",
      },
    });

    // Atomically write the account ID back so concurrent requests see it
    const updateData: Record<string, unknown> = {
      stripeAccountId: account.id,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (settingsSnap.exists) {
      transaction.update(settingsRef, updateData);
    } else {
      transaction.set(settingsRef, {
        organizationId,
        ...updateData,
      });
    }

    existingAccountId = account.id;
  });

  // Retrieve and return the full account object
  const account = await stripe.accounts.retrieve(existingAccountId!);
  return account;
}

/**
 * Create an account link for Stripe Connect onboarding.
 * Generates a URL the user must visit to complete account setup.
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink;
}

/**
 * Get the current status of a connected account.
 * Returns normalized status info for storage.
 */
export async function getAccountStatus(accountId: string): Promise<{
  accountStatus: StripeAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  isEnabled: boolean;
}> {
  const account = await stripe.accounts.retrieve(accountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;

  let accountStatus: StripeAccountStatus;
  if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
    accountStatus = "enabled";
  } else if (detailsSubmitted && (!chargesEnabled || !payoutsEnabled)) {
    accountStatus = "restricted";
  } else if (account.details_submitted === false) {
    accountStatus = "pending";
  } else {
    accountStatus = "pending";
  }

  const onboardingComplete = detailsSubmitted;
  const isEnabled = chargesEnabled && payoutsEnabled;

  return {
    accountStatus,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    onboardingComplete,
    isEnabled,
  };
}

/**
 * Disconnect a Stripe connected account from the platform.
 * This deauthorizes the OAuth connection; it does NOT delete the Stripe account.
 */
export async function disconnectAccount(
  organizationId: string,
  stripeAccountId: string,
): Promise<void> {
  // Deauthorize via OAuth
  try {
    await stripe.oauth.deauthorize({
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID || "",
      stripe_user_id: stripeAccountId,
    });
  } catch (err: unknown) {
    // If deauthorization fails (e.g., already deauthorized), continue cleanup
    if (err instanceof Stripe.errors.StripeError) {
      console.warn(
        `Stripe OAuth deauthorize failed for ${stripeAccountId} [${err.type}/${err.code}]: ${err.message}`,
      );
    } else {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(
        `Stripe OAuth deauthorize failed for ${stripeAccountId}: ${message}`,
      );
    }
  }

  // Update Firestore settings
  const settingsRef = db
    .collection("organizationStripeSettings")
    .doc(organizationId);
  await settingsRef.update({
    accountStatus: "not_connected",
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    onboardingComplete: false,
    isEnabled: false,
    stripeAccountId: FieldValue.delete(),
    connectedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Sync account status from Stripe to Firestore.
 * Called from webhook handler on `account.updated` events.
 */
export async function syncAccountStatus(
  stripeAccountId: string,
): Promise<void> {
  // Find organization by stripeAccountId
  const settingsQuery = db
    .collection("organizationStripeSettings")
    .where("stripeAccountId", "==", stripeAccountId)
    .limit(1);

  const snap = await settingsQuery.get();
  if (snap.empty) {
    console.warn(`No organization found for Stripe account ${stripeAccountId}`);
    return;
  }

  const doc = snap.docs[0];
  const status = await getAccountStatus(stripeAccountId);

  await doc.ref.update({
    ...status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Handle account.application.deauthorized event.
 * The connected account has disconnected from our platform.
 */
export async function handleAccountDeauthorized(
  stripeAccountId: string,
): Promise<void> {
  const settingsQuery = db
    .collection("organizationStripeSettings")
    .where("stripeAccountId", "==", stripeAccountId)
    .limit(1);

  const snap = await settingsQuery.get();
  if (snap.empty) {
    console.warn(
      `No organization found for deauthorized Stripe account ${stripeAccountId}`,
    );
    return;
  }

  const doc = snap.docs[0];
  await doc.ref.update({
    accountStatus: "disabled",
    chargesEnabled: false,
    payoutsEnabled: false,
    isEnabled: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Check if an organization's connected account can accept charges.
 */
export async function canAcceptCharges(
  organizationId: string,
): Promise<boolean> {
  const settingsRef = db
    .collection("organizationStripeSettings")
    .doc(organizationId);
  const settingsSnap = await settingsRef.get();

  if (!settingsSnap.exists) return false;

  const data = settingsSnap.data();
  return data?.isEnabled === true && data?.chargesEnabled === true;
}
