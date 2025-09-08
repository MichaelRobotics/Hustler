import { useCallback, useEffect, useRef, useState } from "react";

interface KeyboardState {
	isVisible: boolean;
	height: number;
	isAnimating: boolean;
}

/**
 * Ultra-optimized keyboard detection hook with pre-calculation strategy
 * Designed for 60fps performance and eliminates double movement
 */
export const useOptimizedKeyboardDetection = () => {
	const [keyboardState, setKeyboardState] = useState<KeyboardState>({
		isVisible: false,
		height: 0,
		isAnimating: false,
	});

	const initialViewportHeight = useRef<number>(0);
	const rafId = useRef<number | null>(null);
	const lastUpdateTime = useRef<number>(0);
	const isUpdating = useRef<boolean>(false);
	const isPreCalculating = useRef<boolean>(false);
	const preCalculatedHeight = useRef<number>(0);

	// Set initial viewport height and pre-calculate keyboard height
	useEffect(() => {
		if (typeof window !== "undefined") {
			initialViewportHeight.current = window.innerHeight;

			// Pre-calculate typical keyboard height based on device
			const screenHeight = window.innerHeight;
			const screenWidth = window.innerWidth;

			// Estimate keyboard height based on device characteristics
			if (screenWidth < 768) {
				// Mobile devices
				// Typical mobile keyboard heights
				if (screenHeight < 700) {
					// Small phones
					preCalculatedHeight.current = Math.min(screenHeight * 0.4, 280);
				} else if (screenHeight < 900) {
					// Regular phones
					preCalculatedHeight.current = Math.min(screenHeight * 0.35, 320);
				} else {
					// Large phones
					preCalculatedHeight.current = Math.min(screenHeight * 0.3, 350);
				}
			} else {
				// Tablet/desktop - smaller keyboard
				preCalculatedHeight.current = Math.min(screenHeight * 0.25, 250);
			}
		}
	}, []);

	// Pre-calculation function to prepare space before keyboard appears
	const preCalculateKeyboardSpace = useCallback(() => {
		if (isPreCalculating.current) return;

		isPreCalculating.current = true;

		// Immediately prepare space with pre-calculated height
		setKeyboardState((prev) => ({
			isVisible: true,
			height: preCalculatedHeight.current,
			isAnimating: true,
		}));

		// Reset pre-calculation flag after a short delay
		setTimeout(() => {
			isPreCalculating.current = false;
		}, 100);
	}, []);

	// Ultra-fast keyboard detection with pre-calculation strategy
	const updateKeyboardState = useCallback(() => {
		if (typeof window === "undefined" || isUpdating.current) return;

		const now = performance.now();
		// Throttle updates to max 60fps (16.67ms)
		if (now - lastUpdateTime.current < 16.67) {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
			rafId.current = requestAnimationFrame(updateKeyboardState);
			return;
		}

		isUpdating.current = true;
		lastUpdateTime.current = now;

		const currentHeight = window.visualViewport?.height || window.innerHeight;
		const heightDifference = initialViewportHeight.current - currentHeight;

		// Optimized threshold check
		const keyboardThreshold = 150;
		const isKeyboardVisible = heightDifference > keyboardThreshold;

		// Use actual measured height when keyboard is visible, pre-calculated when preparing
		const keyboardHeight = isKeyboardVisible
			? Math.max(heightDifference, 0)
			: isPreCalculating.current
				? preCalculatedHeight.current
				: 0;

		setKeyboardState((prev) => {
			const wasVisible = prev.isVisible;
			const isNowVisible = isKeyboardVisible || isPreCalculating.current;
			const isAnimating = wasVisible !== isNowVisible;

			// Only update if state actually changed
			if (
				prev.isVisible === isNowVisible &&
				prev.height === keyboardHeight &&
				prev.isAnimating === isAnimating
			) {
				isUpdating.current = false;
				return prev;
			}

			isUpdating.current = false;
			return {
				isVisible: isNowVisible,
				height: keyboardHeight,
				isAnimating,
			};
		});
	}, []);

	// Optimized event listener setup
	useEffect(() => {
		if (typeof window === "undefined") return;

		let cleanup: (() => void) | undefined;

		if (window.visualViewport) {
			// Use visual viewport API for maximum accuracy
			const handleViewportChange = () => {
				if (rafId.current) {
					cancelAnimationFrame(rafId.current);
				}
				rafId.current = requestAnimationFrame(updateKeyboardState);
			};

			window.visualViewport.addEventListener("resize", handleViewportChange);

			cleanup = () => {
				window.visualViewport?.removeEventListener(
					"resize",
					handleViewportChange,
				);
				if (rafId.current) {
					cancelAnimationFrame(rafId.current);
				}
			};
		} else {
			// Fallback for older browsers
			const handleResize = () => {
				if (rafId.current) {
					cancelAnimationFrame(rafId.current);
				}
				rafId.current = requestAnimationFrame(updateKeyboardState);
			};

			window.addEventListener("resize", handleResize);

			cleanup = () => {
				window.removeEventListener("resize", handleResize);
				if (rafId.current) {
					cancelAnimationFrame(rafId.current);
				}
			};
		}

		return cleanup;
	}, [updateKeyboardState]);

	// Reset animation state after transition
	useEffect(() => {
		if (keyboardState.isAnimating) {
			const timer = setTimeout(() => {
				setKeyboardState((prev) => ({
					...prev,
					isAnimating: false,
				}));
			}, 200); // Reduced from 300ms for faster response

			return () => clearTimeout(timer);
		}
	}, [keyboardState.isAnimating]);

	return {
		...keyboardState,
		preCalculateKeyboardSpace,
	};
};
