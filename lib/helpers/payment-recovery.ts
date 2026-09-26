/**
 * Defensive reads for payment.failed and payment.requires_action.
 * These events must not grant credits or start a funnel. A notification is
 * only for Basic, Pro, or Vip when a recovery URL is present.
 */

const RENEWAL_TIERS = new Set(["Basic", "Pro", "Vip"]);
const NON_RENEWAL_TYPES = new Set(["Credits", "Messages", "credit_pack"]);

export interface PaymentRecoveryFields {
	userId: string | null;
	companyId: string | null;
	planId: string | null;
	membershipId: string | null;
	experienceId: string | null;
	metadataType: string | null;
	recoveryUrl: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readId(record: Record<string, unknown> | null, key: string): string | null {
	if (!record) return null;
	const direct = readString(record[key]);
	if (direct) return direct;
	const nested = asRecord(record[key.replace(/_id$/, "")]);
	return readString(nested?.id);
}

export function readPaymentRecoveryFields(data: unknown): PaymentRecoveryFields {
	const record = asRecord(data);
	const metadata = asRecord(record?.metadata);
	const nestedPayment = asRecord(record?.payment);

	return {
		userId: readId(record, "user_id") ?? readId(nestedPayment, "user_id"),
		companyId: readId(record, "company_id") ?? readId(nestedPayment, "company_id"),
		planId: readId(record, "plan_id") ?? readId(nestedPayment, "plan_id"),
		membershipId: readId(record, "membership_id") ?? readId(nestedPayment, "membership_id"),
		experienceId:
			readString(metadata?.experienceId) ??
			readString(asRecord(nestedPayment?.metadata)?.experienceId),
		metadataType:
			readString(metadata?.type) ?? readString(asRecord(nestedPayment?.metadata)?.type),
		recoveryUrl: readString(record?.recovery_url) ?? readString(nestedPayment?.recovery_url),
	};
}

/**
 * Basic/Pro/Vip from checkout metadata, or from the subscriptions table when
 * a renewal payload has no metadata. Credits, messages, and credit packs are not renewals.
 */
export function renewalTierFromType(type: string | null | undefined): "Basic" | "Pro" | "Vip" | null {
	if (!type || NON_RENEWAL_TYPES.has(type)) return null;
	return RENEWAL_TIERS.has(type) ? (type as "Basic" | "Pro" | "Vip") : null;
}
