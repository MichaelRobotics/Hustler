"use client";

import { Button } from "frosted-ui";
import { Moon, Sun } from "lucide-react";
import React from "react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
	const { appearance, toggleTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="3"
			onClick={toggleTheme}
			className="transition-all duration-200 hover:scale-105"
			title={
				appearance === "dark" ? "Switch to light mode" : "Switch to dark mode"
			}
			data-theme-toggle="true"
		>
			{appearance === "dark" ? (
				<Sun className="h-5 w-5" />
			) : (
				<Moon className="h-5 w-5" />
			)}
		</Button>
	);
}
