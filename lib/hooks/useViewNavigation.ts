"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { useState } from "react";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
	sends?: number;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

type View =
	| "dashboard"
	| "analytics"
	| "resourceLibrary"
	| "funnelBuilder"
	| "preview"
	| "liveChat";

export function useViewNavigation() {
	const [currentView, setCurrentView] = useState<View>("dashboard");

	const handleViewChange = (
		view: View,
		selectedFunnel: Funnel | null,
		currentView: View,
		setLibraryContext: (context: "global" | "funnel") => void,
		setSelectedFunnelForLibrary: (funnel: Funnel | null) => void,
	) => {
		console.log("🔍 [HANDLE VIEW CHANGE] view:", view);
		console.log("🔍 [HANDLE VIEW CHANGE] selectedFunnel:", selectedFunnel);
		console.log("🔍 [HANDLE VIEW CHANGE] currentView:", currentView);
		
		if (view === "resourceLibrary") {
			if (selectedFunnel) {
				// If we have a selected funnel, always go to funnel context
				console.log("🔍 [HANDLE VIEW CHANGE] Setting library context to funnel");
				setLibraryContext("funnel");
				setSelectedFunnelForLibrary(selectedFunnel);
			} else {
				// No selected funnel, go to global context
				console.log("🔍 [HANDLE VIEW CHANGE] Setting library context to global");
				setSelectedFunnelForLibrary(null);
				setLibraryContext("global");
			}
		}
		console.log("🔍 [HANDLE VIEW CHANGE] Setting currentView to:", view);
		setCurrentView(view);
	};

	const onFunnelClick = (funnel: Funnel) => {
		if (!hasValidFlow(funnel)) {
			return "resourceLibrary";
		} else {
			return "analytics";
		}
	};

	const handleManageResources = (funnel: Funnel) => {
		return "resourceLibrary";
	};

	const handleBackToDashboard = () => {
		setCurrentView("dashboard");
		return "dashboard";
	};

	return {
		// State
		currentView,

		// Setters
		setCurrentView,

		// Actions
		handleViewChange,
		onFunnelClick,
		handleManageResources,
		handleBackToDashboard,
	};
}
