import { ExperienceView } from "@/lib/components/experiences";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// Get experienceId from path params
	const { experienceId } = await params;

	// Pass the experienceId to the ExperienceView component
	// The component will handle authentication via API calls
	return <ExperienceView experienceId={experienceId} />;
}
