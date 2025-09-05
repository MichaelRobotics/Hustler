import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";
import { getUserContext } from "@/lib/context/user-context";
import { ExperienceView } from "@/lib/components/experiences";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// Get experienceId from path params
	const { experienceId } = await params;

	// Get headers from WHOP iframe
	const headersList = await headers();

	let authContext = null;

	try {
		// Debug: Log all headers to see what WHOP is sending
		console.log('WHOP Headers received:', {
			'x-whop-user-token': headersList.get('x-whop-user-token') ? 'Present' : 'Missing',
			'x-whop-company-id': headersList.get('x-whop-company-id') || 'Missing',
			'whop-company-id': headersList.get('whop-company-id') || 'Missing',
			'authorization': headersList.get('authorization') ? 'Present' : 'Missing',
			'all-headers': Object.fromEntries(headersList.entries())
		});

		// Verify user token directly with WHOP SDK (as per WHOP docs)
		const { userId } = await whopSdk.verifyUserToken(headersList);
		console.log('Verified user ID:', userId);
		
		// Get company ID from experience data (as per WHOP docs)
		console.log('Getting experience data for:', experienceId);
		const experience = await whopSdk.experiences.getExperience({ experienceId });
		const whopCompanyId = experience.company.id;
		
		console.log('Experience data:', experience);
		console.log('Company ID from experience:', whopCompanyId);
		console.log('Environment company ID:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);

		if (!whopCompanyId) {
			console.log('No company ID found in experience data');
		} else {
			// Check access to the experience first (as per WHOP docs)
			console.log('Checking access to experience:', experienceId);
			const experienceAccess = await whopSdk.access.checkIfUserHasAccessToExperience({
				userId: userId,
				experienceId: experienceId
			});
			
			console.log('Experience access result:', experienceAccess);
			
			if (experienceAccess.hasAccess) {
				// Get user context (this will create experience/user records if needed)
				const userContext = await getUserContext(userId, whopCompanyId, experienceId, false, experienceAccess.accessLevel);
				console.log('User context result:', userContext ? 'Success' : 'Failed');
				
				if (userContext?.isAuthenticated) {
					authContext = {
						user: userContext.user,
						isAuthenticated: true,
						hasAccess: userContext.user.accessLevel !== 'no_access'
					};
					console.log('Auth context created:', {
						userId: authContext.user.id,
						accessLevel: authContext.user.accessLevel,
						                                          experienceId: authContext.user.experienceId
					});
				}
			} else {
				console.log('User does not have access to experience');
			}
		}
	} catch (error) {
		console.error('Authentication error:', error);
	}

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
								<span className="text-gray-400">WHOP User Token:</span>
								<span className="text-white">{headersList.get('x-whop-user-token') ? 'Present' : 'Missing'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">WHOP Company ID:</span>
								                                                                 <span className="text-white font-mono">{authContext?.user?.experience?.whopCompanyId || 'Missing'}</span>
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
										<span className="text-gray-400">Experience ID:</span>
										<span className="text-white font-mono">{authContext.user.experienceId}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">WHOP Company ID:</span>
										<span className="text-white font-mono">{authContext.user.experience.whopCompanyId}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400">Experience Name:</span>
										<span className="text-white">{authContext.user.experience.name}</span>
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

					{/* Experience Information */}
					<div className="bg-gray-800 rounded-lg p-6 text-left">
						<h2 className="text-lg font-semibold text-white mb-4">Experience Information</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-400">Experience ID:</span>
								<span className="text-white font-mono">{authContext.user.experienceId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">WHOP Company ID:</span>
								<span className="text-white font-mono">{authContext.user.experience.whopCompanyId}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Experience Name:</span>
								<span className="text-white">{authContext.user.experience.name}</span>
							</div>
							{authContext.user.experience.description && (
								<div className="flex justify-between">
									<span className="text-gray-400">Description:</span>
									<span className="text-white">{authContext.user.experience.description}</span>
								</div>
							)}
							{authContext.user.experience.logo && (
								<div className="flex justify-between">
									<span className="text-gray-400">Logo:</span>
									<span className="text-white">{authContext.user.experience.logo}</span>
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
