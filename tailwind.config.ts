import type { Config } from "tailwindcss";

export default {
	content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
	darkMode: "class",
	// Cross-stage dynamic classes: included via @source '../lib/safelist-cross-stage.txt' in globals.css (Tailwind v4)
	theme: {
		extend: {
			colors: {
				gray: {
					900: "#111827",
					800: "#1f2937",
					700: "#374151",
					600: "#4b5563",
					500: "#6b7280",
					400: "#9ca3af",
					300: "#d1d5db",
					200: "#e5e7eb",
					100: "#f3f4f6",
					50: "#f9fafb",
				},
				violet: {
					600: "#7c3aed",
					700: "#6d28d9",
					500: "#8b5cf6",
				},
			},
		},
	},
	plugins: [
		({ addUtilities }: any) => {
			addUtilities({
				".scrollbar-hide": {
					/* Firefox */
					"scrollbar-width": "none",
					/* Safari and Chrome */
					"&::-webkit-scrollbar": {
						display: "none",
					},
				},
			});
		},
	],
} satisfies Config;
