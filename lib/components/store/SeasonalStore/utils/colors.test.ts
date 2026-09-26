import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CARD_CLASS, DEFAULT_THEME_TEXT_CLASS, getTextColorsFromCardClass } from "./colors.ts";

describe("getTextColorsFromCardClass", () => {
	it("uses the default card colors when the card class is missing", () => {
		assert.deepEqual(getTextColorsFromCardClass(undefined, undefined), {
			titleClass: DEFAULT_THEME_TEXT_CLASS,
			descClass: DEFAULT_THEME_TEXT_CLASS,
		});
		assert.deepEqual(
			getTextColorsFromCardClass(undefined, "text-gray-800"),
			getTextColorsFromCardClass(DEFAULT_CARD_CLASS, "text-gray-800"),
		);
	});

	it("keeps contrast for a real card class", () => {
		assert.deepEqual(getTextColorsFromCardClass("bg-gray-900", "text-white"), {
			titleClass: "text-white",
			descClass: "text-white",
		});
		assert.deepEqual(getTextColorsFromCardClass("bg-violet-50", undefined), {
			titleClass: "text-violet-900",
			descClass: "text-violet-700",
		});
	});
});
