export function sameExperienceId(
	candidate: string | null | undefined,
	experience: { id: string; whopExperienceId: string },
): boolean {
	if (!candidate) return false;
	return candidate === experience.id || candidate === experience.whopExperienceId;
}
