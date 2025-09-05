import { headers } from "next/headers";
import { authenticateRequest } from "@/lib/middleware/auth";
import { ExperienceView } from "@/lib/components/experiences";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// Get experienceId from path params
	const { experienceId } = await params;

	// Create a mock request object for authentication
	const headersList = await headers();
	const mockRequest = {
		headers: headersList,
		url: `/experiences/${experienceId}`,
		nextUrl: new URL(`/experiences/${experienceId}`, 'http://localhost:3000')
	} as any;

	// Use the unified authentication middleware
	const authContext = await authenticateRequest(mockRequest);

	if (!authContext?.isAuthenticated) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
					<p className="text-gray-300 mb-4">
						Please log in to access this experience.
					</p>
				</div>
			</div>
		);
	}

	if (!authContext.hasAccess) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
					<p className="text-gray-300 mb-4">
						Hi <strong>{authContext.user.name}</strong>, you need access to view this dashboard.
					</p>
					<p className="text-sm text-gray-400">
						Your access level: <strong>{authContext.user.accessLevel}</strong>
					</p>
				</div>
			</div>
		);
	}

	// Show the experience page with view selection for both admins and customers
	// Filter out no_access users (they should have been caught by hasAccess check)
	const accessLevel = authContext.user.accessLevel === 'no_access' ? 'customer' : authContext.user.accessLevel;
	
	return (
		<ExperienceView
			userName={authContext.user.name}
			accessLevel={accessLevel as 'admin' | 'customer'}
			experienceId={experienceId}
		/>
	);
}
