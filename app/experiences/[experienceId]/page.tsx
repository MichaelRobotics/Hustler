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
				<div className="text-center max-w-2xl">
					<h1 className="text-2xl font-bold text-white mb-6">Authentication Required</h1>
					<p className="text-gray-300 mb-6">
						Please log in to access this experience.
					</p>
					
					{/* Debug Information - Show available data even when not authenticated */}
					<div className="bg-gray-800 rounded-lg p-6 text-left">
						<h2 className="text-lg font-semibold text-white mb-4">Debug Information</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Experience ID:</span>
								<span className="text-white font-mono">{experienceId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Auth Context:</span>
								<span className="text-white">{authContext ? 'Present' : 'Missing'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Is Authenticated:</span>
								<span className="text-white">{authContext?.isAuthenticated ? 'Yes' : 'No'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Has Access:</span>
								<span className="text-white">{authContext?.hasAccess ? 'Yes' : 'No'}</span>
							</div>
							{authContext?.user && (
								<>
									<div className="flex justify-between">
										<span className="text-gray-400">User ID:</span>
										<span className="text-white font-mono">{authContext.user.id}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">WHOP User ID:</span>
										<span className="text-white font-mono">{authContext.user.whopUserId}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Name:</span>
										<span className="text-white">{authContext.user.name}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Email:</span>
										<span className="text-white">{authContext.user.email}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Access Level:</span>
										<span className="text-white">{authContext.user.accessLevel}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Credits:</span>
										<span className="text-white">{authContext.user.credits}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Company ID:</span>
										<span className="text-white font-mono">{authContext.user.companyId}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">WHOP Company ID:</span>
										<span className="text-white font-mono">{authContext.user.company.whopCompanyId}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Company Name:</span>
										<span className="text-white">{authContext.user.company.name}</span>
									</div>
									{authContext.user.avatar && (
										<div className="flex justify-between">
											<span className="text-gray-400">Avatar:</span>
											<span className="text-white">{authContext.user.avatar}</span>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!authContext.hasAccess) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center max-w-2xl">
					<h1 className="text-2xl font-bold text-white mb-6">Access Denied</h1>
					<p className="text-gray-300 mb-6">
						Hi <strong>{authContext.user.name}</strong>, you need access to view this dashboard.
					</p>
					
					{/* User Information */}
					<div className="bg-gray-800 rounded-lg p-6 text-left mb-6">
						<h2 className="text-lg font-semibold text-white mb-4">User Information</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Experience ID:</span>
								<span className="text-white font-mono">{experienceId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">User ID:</span>
								<span className="text-white font-mono">{authContext.user.id}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">WHOP User ID:</span>
								<span className="text-white font-mono">{authContext.user.whopUserId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Name:</span>
								<span className="text-white">{authContext.user.name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Email:</span>
								<span className="text-white">{authContext.user.email}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Access Level:</span>
								<span className={`font-semibold ${
									authContext.user.accessLevel === 'admin' ? 'text-green-400' :
									authContext.user.accessLevel === 'customer' ? 'text-blue-400' :
									'text-red-400'
								}`}>
									{authContext.user.accessLevel}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Credits:</span>
								<span className="text-white">{authContext.user.credits}</span>
							</div>
						</div>
					</div>

					{/* Company Information */}
					<div className="bg-gray-800 rounded-lg p-6 text-left">
						<h2 className="text-lg font-semibold text-white mb-4">Company Information</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Company ID:</span>
								<span className="text-white font-mono">{authContext.user.companyId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">WHOP Company ID:</span>
								<span className="text-white font-mono">{authContext.user.company.whopCompanyId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Company Name:</span>
								<span className="text-white">{authContext.user.company.name}</span>
							</div>
							{authContext.user.company.description && (
								<div className="flex justify-between">
									<span className="text-gray-400">Description:</span>
									<span className="text-white">{authContext.user.company.description}</span>
								</div>
							)}
							{authContext.user.company.logo && (
								<div className="flex justify-between">
									<span className="text-gray-400">Logo:</span>
									<span className="text-white">{authContext.user.company.logo}</span>
								</div>
							)}
						</div>
					</div>
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
