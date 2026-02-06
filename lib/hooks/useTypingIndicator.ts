"use client";

import { useEffect, useRef } from "react";

const DEFAULT_IDLE_MS = 2000;
const DEFAULT_LEADING_MS = 300;

/**
 * Debounced typing indicator: sends "active" to the server in a way that's
 * optimized and covers edge cases.
 *
 * - Sends true after a short leading delay (avoids single-keystroke flicker).
 * - Sends false after idleMs with no further input, or immediately when input is cleared.
 * - On unmount or conversation switch, always sends false so the other side doesn't see stale typing.
 *
 * @param hasText - Whether the user currently has text in the input.
 * @param send - Callback to send typing state (true/false). Should be stable (e.g. useCallback).
 * @param options - idleMs: delay before sending false after user stops typing; leadingMs: delay before sending true after first keystroke.
 */
export function useTypingIndicator(
	hasText: boolean,
	send: (active: boolean) => void,
	options?: { idleMs?: number; leadingMs?: number }
): void {
	const idleMs = options?.idleMs ?? DEFAULT_IDLE_MS;
	const leadingMs = options?.leadingMs ?? DEFAULT_LEADING_MS;
	const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const leadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sendRef = useRef(send);
	sendRef.current = send;

	const clearTimeouts = () => {
		if (idleTimeoutRef.current !== null) {
			clearTimeout(idleTimeoutRef.current);
			idleTimeoutRef.current = null;
		}
		if (leadingTimeoutRef.current !== null) {
			clearTimeout(leadingTimeoutRef.current);
			leadingTimeoutRef.current = null;
		}
	};

	useEffect(() => {
		if (hasText) {
			clearTimeouts();
			leadingTimeoutRef.current = setTimeout(() => {
				leadingTimeoutRef.current = null;
				sendRef.current(true);
				idleTimeoutRef.current = setTimeout(() => {
					idleTimeoutRef.current = null;
					sendRef.current(false);
				}, idleMs);
			}, leadingMs);
		} else {
			clearTimeouts();
			sendRef.current(false);
		}
		return () => {
			clearTimeouts();
			sendRef.current(false);
		};
	}, [hasText, idleMs, leadingMs]);
}
