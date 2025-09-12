"use client";

import React, { useState } from 'react';
import { getUserCredits, canGenerate } from '../../actions/credit-actions';
import type { AuthenticatedUser } from '../../types/user';

interface CreditDebuggerProps {
    user: AuthenticatedUser | null;
}

export const CreditDebugger: React.FC<CreditDebuggerProps> = ({ user }) => {
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runDebugCheck = async () => {
        setIsLoading(true);
        setDebugInfo(null);

        try {
            const debugResults: any = {
                timestamp: new Date().toISOString(),
                user: user ? {
                    id: user.id,
                    whopUserId: user.whopUserId,
                    experienceId: user.experienceId,
                    accessLevel: user.accessLevel,
                    credits: user.credits,
                    experience: user.experience
                } : null,
                environment: {
                    NEXT_PUBLIC_WHOP_EXPERIENCE_ID: process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID,
                    NEXT_PUBLIC_WHOP_COMPANY_ID: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
                },
                tests: {}
            };

            // Test 1: User validation
            if (!user) {
                debugResults.tests.userValidation = {
                    status: 'FAIL',
                    error: 'No user provided'
                };
            } else {
                debugResults.tests.userValidation = {
                    status: 'PASS',
                    message: 'User object exists'
                };
            }

            // Test 2: Experience ID validation
            if (user?.experienceId) {
                debugResults.tests.experienceIdValidation = {
                    status: 'PASS',
                    experienceId: user.experienceId
                };
            } else {
                debugResults.tests.experienceIdValidation = {
                    status: 'FAIL',
                    error: 'No experience ID found',
                    fallback: process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID
                };
            }

            // Test 3: Access level validation
            if (user?.accessLevel === 'admin') {
                debugResults.tests.accessLevelValidation = {
                    status: 'PASS',
                    accessLevel: user.accessLevel
                };
            } else {
                debugResults.tests.accessLevelValidation = {
                    status: 'FAIL',
                    accessLevel: user?.accessLevel,
                    error: 'User is not admin'
                };
            }

            // Test 4: Credit balance validation
            if (user?.credits !== undefined) {
                debugResults.tests.creditBalanceValidation = {
                    status: user.credits > 0 ? 'PASS' : 'FAIL',
                    credits: user.credits,
                    message: user.credits > 0 ? 'User has credits' : 'User has no credits'
                };
            } else {
                debugResults.tests.creditBalanceValidation = {
                    status: 'FAIL',
                    error: 'Credit balance not available'
                };
            }

            // Test 5: API credit check
            if (user?.experienceId) {
                try {
                    const apiCredits = await getUserCredits(user.experienceId);
                    debugResults.tests.apiCreditCheck = {
                        status: 'PASS',
                        apiCredits: apiCredits,
                        localCredits: user.credits,
                        match: apiCredits === user.credits
                    };
                } catch (error) {
                    debugResults.tests.apiCreditCheck = {
                        status: 'FAIL',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            }

            // Test 6: Can generate check
            if (user?.experienceId) {
                try {
                    const canGen = await canGenerate(user, user.experienceId);
                    debugResults.tests.canGenerateCheck = {
                        status: canGen ? 'PASS' : 'FAIL',
                        canGenerate: canGen,
                        message: canGen ? 'User can generate' : 'User cannot generate'
                    };
                } catch (error) {
                    debugResults.tests.canGenerateCheck = {
                        status: 'FAIL',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            }

            // Test 7: Experience object validation
            if (user?.experience) {
                debugResults.tests.experienceObjectValidation = {
                    status: 'PASS',
                    experience: {
                        id: user.experience.id,
                        whopExperienceId: user.experience.whopExperienceId,
                        whopCompanyId: user.experience.whopCompanyId
                    }
                };
            } else {
                debugResults.tests.experienceObjectValidation = {
                    status: 'FAIL',
                    error: 'No experience object found'
                };
            }

            setDebugInfo(debugResults);

        } catch (error) {
            setDebugInfo({
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-4">🔍 Credit Check Debugger</h3>
            
            <button
                onClick={runDebugCheck}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {isLoading ? 'Running Debug...' : 'Run Credit Debug Check'}
            </button>

            {debugInfo && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Debug Results:</h4>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};
