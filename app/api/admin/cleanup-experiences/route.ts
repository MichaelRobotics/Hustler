import { NextRequest, NextResponse } from "next/server";
import { cleanupAbandonedExperiences, checkIfCleanupNeeded } from "@/lib/sync/experience-cleanup";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * Admin endpoint to manually cleanup abandoned experiences
 * GET /api/admin/cleanup-experiences?companyId=xxx - Check if cleanup needed
 * POST /api/admin/cleanup-experiences - Cleanup all companies with abandoned experiences
 */

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const companyId = searchParams.get("companyId");

		if (companyId) {
			// Check specific company
			const needsCleanup = await checkIfCleanupNeeded(companyId);
			
			// Get all experiences for this company
			const companyExperiences = await db.query.experiences.findMany({
				where: eq(experiences.whopCompanyId, companyId),
				orderBy: (experiences: any, { desc }: any) => [desc(experiences.createdAt)],
				columns: {
					id: true,
					whopExperienceId: true,
					name: true,
					createdAt: true
				}
			});

			return NextResponse.json({
				companyId,
				needsCleanup,
				experienceCount: companyExperiences.length,
				experiences: companyExperiences
			});
		} else {
			// Check all companies
			const allExperiences = await db.query.experiences.findMany({
				columns: {
					whopCompanyId: true,
					id: true,
					createdAt: true
				}
			});

			// Group by company
			const companiesWithMultipleExperiences = new Map<string, any[]>();
			allExperiences.forEach((exp: any) => {
				if (!companiesWithMultipleExperiences.has(exp.whopCompanyId)) {
					companiesWithMultipleExperiences.set(exp.whopCompanyId, []);
				}
				companiesWithMultipleExperiences.get(exp.whopCompanyId)!.push(exp);
			});

			// Filter companies with multiple experiences
			const companiesNeedingCleanup = Array.from(companiesWithMultipleExperiences.entries())
				.filter(([_, exps]) => exps.length > 1)
				.map(([companyId, exps]) => ({
					companyId,
					experienceCount: exps.length,
					experiences: exps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				}));

			return NextResponse.json({
				totalCompanies: companiesWithMultipleExperiences.size,
				companiesNeedingCleanup: companiesNeedingCleanup.length,
				companies: companiesNeedingCleanup
			});
		}

	} catch (error) {
		console.error("Error checking cleanup status:", error);
		return NextResponse.json(
			{ error: "Failed to check cleanup status" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { companyId, dryRun = false } = body;

		if (companyId) {
			// Cleanup specific company
			console.log(`🧹 Starting cleanup for company ${companyId} (dryRun: ${dryRun})`);
			
			if (dryRun) {
				const needsCleanup = await checkIfCleanupNeeded(companyId);
				return NextResponse.json({
					companyId,
					dryRun: true,
					needsCleanup,
					message: needsCleanup ? "Cleanup would be performed" : "No cleanup needed"
				});
			}

			const { cleaned, kept } = await cleanupAbandonedExperiences(companyId);
			
			return NextResponse.json({
				companyId,
				cleaned: cleaned.length,
				kept: kept.length,
				cleanedIds: cleaned,
				keptIds: kept,
				message: `Cleaned up ${cleaned.length} abandoned experiences, kept ${kept.length}`
			});

		} else {
			// Cleanup all companies with multiple experiences
			console.log(`🧹 Starting global cleanup (dryRun: ${dryRun})`);
			
			// Get all companies with multiple experiences
			const allExperiences = await db.query.experiences.findMany({
				columns: {
					whopCompanyId: true,
					id: true
				}
			});

			const companiesWithMultipleExperiences = new Map<string, string[]>();
			allExperiences.forEach((exp: any) => {
				if (!companiesWithMultipleExperiences.has(exp.whopCompanyId)) {
					companiesWithMultipleExperiences.set(exp.whopCompanyId, []);
				}
				companiesWithMultipleExperiences.get(exp.whopCompanyId)!.push(exp.id);
			});

			const companiesToCleanup = Array.from(companiesWithMultipleExperiences.entries())
				.filter(([_, exps]) => exps.length > 1);

			if (dryRun) {
				return NextResponse.json({
					dryRun: true,
					companiesToCleanup: companiesToCleanup.length,
					companies: companiesToCleanup.map(([companyId, exps]) => ({
						companyId,
						experienceCount: exps.length
					})),
					message: `Would cleanup ${companiesToCleanup.length} companies`
				});
			}

			// Cleanup each company
			const results = [];
			for (const [companyId, _] of companiesToCleanup) {
				try {
					const { cleaned, kept } = await cleanupAbandonedExperiences(companyId);
					results.push({
						companyId,
						cleaned: cleaned.length,
						kept: kept.length
					});
				} catch (error) {
					console.error(`Error cleaning up company ${companyId}:`, error);
					results.push({
						companyId,
						error: error instanceof Error ? error.message : "Unknown error"
					});
				}
			}

			const totalCleaned = results.reduce((sum, r) => sum + (r.cleaned || 0), 0);
			const totalKept = results.reduce((sum, r) => sum + (r.kept || 0), 0);

			return NextResponse.json({
				companiesProcessed: results.length,
				totalCleaned,
				totalKept,
				results,
				message: `Processed ${results.length} companies, cleaned ${totalCleaned} experiences, kept ${totalKept}`
			});
		}

	} catch (error) {
		console.error("Error during cleanup:", error);
		return NextResponse.json(
			{ error: "Failed to perform cleanup" },
			{ status: 500 }
		);
	}
}
