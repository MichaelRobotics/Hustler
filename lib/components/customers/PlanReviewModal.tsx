'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Star, Loader2, Send } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import { apiGet, apiPost } from '@/lib/utils/api-client';

interface Review {
  id: string;
  title: string | null;
  description: string | null;
  stars: number;
  userId: string;
  userName: string | null;
  userUsername: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}

interface PlanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId?: string; // Optional - API uses plan's resourceId as source of truth
  planId: string;
  resourceName?: string;
  experienceId?: string;
  companyName?: string; // Company/experience name for header
  companyLogo?: string; // Company logo URL for header
  readOnly?: boolean; // If true, hide the review form (for viewing only)
}

export const PlanReviewModal: React.FC<PlanReviewModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  planId,
  resourceName,
  experienceId,
  companyName,
  companyLogo,
  readOnly = false,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and pagination state
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null); // null = "All"
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;
  
  // Form state
  const [stars, setStars] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Filter reviews by star rating
  const filteredReviews = selectedStarFilter === null
    ? reviews
    : reviews.filter(review => review.stars === selectedStarFilter);

  // Calculate average rating from filtered reviews
  const averageStars = filteredReviews.length > 0
    ? filteredReviews.reduce((sum, review) => sum + review.stars, 0) / filteredReviews.length
    : 0;
  const reviewCount = filteredReviews.length;

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

  // Count reviews by star rating
  const starCounts = {
    5: reviews.filter(r => r.stars === 5).length,
    4: reviews.filter(r => r.stars === 4).length,
    3: reviews.filter(r => r.stars === 3).length,
    2: reviews.filter(r => r.stars === 2).length,
    1: reviews.filter(r => r.stars === 1).length,
  };

  // Fetch reviews - wrapped in useCallback to prevent infinite loops
  const fetchReviews = useCallback(async () => {
    if (!experienceId) {
      setError('Experience ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Construct full URL with query params
      const url = new URL('/api/reviews', window.location.origin);
      if (planId) {
        url.searchParams.set('planId', planId);
      } else if (resourceId) {
        url.searchParams.set('resourceId', resourceId);
      }
      url.searchParams.set('experienceId', experienceId);
      console.log('[PlanReviewModal] GET URL:', url.toString());
      
      const response = await apiGet(url.toString(), experienceId);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch reviews');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  }, [planId, resourceId, experienceId]);

  // Fetch reviews when modal opens
  useEffect(() => {
    if (isOpen && (resourceId || planId)) {
      fetchReviews();
    }
  }, [isOpen, resourceId, planId, fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!experienceId) {
      setError('Experience ID is required');
      return;
    }

    if (stars < 1 || stars > 5) {
      setError('Please select a star rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Construct full URL with query params (same pattern as GET request)
      const url = new URL('/api/reviews', window.location.origin);
      url.searchParams.set('experienceId', experienceId);
      console.log('[PlanReviewModal] POST URL:', url.toString());
      
      const response = await apiPost(
        url.toString(),
        {
          // resourceId is optional - API will use plan's resourceId as source of truth
          ...(resourceId ? { resourceId } : {}),
          planId,
          stars,
          title: title || null,
          description: description || null,
        },
        experienceId
      );

      if (response.ok) {
        // Reset form
        setStars(0);
        setTitle('');
        setDescription('');
        setHoveredStar(0);
        // Refresh reviews
        await fetchReviews();
        // Reset to first page
        setCurrentPage(1);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    
    // Format the date part: "Written [Month Day, Year]"
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Format the time part: "[time] after purchase"
    let timeStr = '';
    if (diffMins < 1) {
      timeStr = 'just now';
    } else if (diffMins < 60) {
      timeStr = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} after purchase`;
    } else if (diffHours < 24) {
      timeStr = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} after purchase`;
    } else if (diffDays < 30) {
      timeStr = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} after purchase`;
    } else if (diffMonths < 12) {
      timeStr = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} after purchase`;
    } else {
      return `Written ${dateStr}`;
    }
    
    return `Written ${dateStr}, ${timeStr}`;
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[100]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-[90vw] max-w-3xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking inside the modal content
            if (target.closest('[data-radix-dialog-content]')) {
              e.preventDefault();
              return;
            }
            // Don't close if clicking on interactive elements
            if (
              target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.tagName === 'BUTTON' ||
              target.closest('button') ||
              target.closest('input') ||
              target.closest('textarea') ||
              target.closest('[role="dialog"]')
            ) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header with Logo/Company Name */}
          <div className="px-6 py-4 border-b-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                    <img
                      src={companyLogo}
                      alt={companyName || 'Company'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {(companyName || resourceName || 'R')?.[0]?.toUpperCase() || 'R'}
                  </div>
                )}
                <Dialog.Title asChild>
                  <Heading size="4" weight="bold" className="text-gray-900 dark:text-white">
                    {companyName || resourceName || 'Reviews'}
                  </Heading>
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : (
              <>
                {/* Overall Rating Section */}
                <div className="mb-8 pb-8 border-b-2 border-gray-300 dark:border-gray-600">
                  <Heading size="3" weight="medium" className="text-gray-900 dark:text-white mb-6 text-center">
                    Overall rating
                  </Heading>
                  
                  {/* Rating Number with Single Star Icon */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="text-5xl font-bold text-gray-900 dark:text-white">
                        {averageStars > 0 ? averageStars.toFixed(2) : '0.00'}
                      </div>
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </div>
                    <Text size="2" color="gray" className="text-gray-600 dark:text-gray-400">
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </Text>
                  </div>
                  
                  {/* Star Rating Filters - Horizontal Row Below Rating */}
                  <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
                    <button
                      onClick={() => {
                        setSelectedStarFilter(null);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedStarFilter === null
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      All
                    </button>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        onClick={() => {
                          setSelectedStarFilter(star);
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          selectedStarFilter === star
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {star} {star === 1 ? 'star' : 'stars'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviews List */}
                {filteredReviews.length > 0 ? (
                  <div className="space-y-0 mb-8">
                    {paginatedReviews.map((review) => (
                      <div
                        key={review.id}
                        className="py-6 border-b-2 border-gray-300 dark:border-gray-600 last:border-0"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {review.userName?.[0]?.toUpperCase() || review.userId[0]?.toUpperCase() || 'U'}
                          </div>
                          
                          {/* Review Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Text size="3" weight="medium" className="text-gray-900 dark:text-white">
                                {review.userName || 'Anonymous'}
                              </Text>
                            </div>
                            
                            {(review.title || review.description) && (
                              <div className="mb-2">
                                {review.title && (
                                  <Text size="3" weight="medium" className="text-gray-900 dark:text-white mb-1">
                                    {review.title}
                                  </Text>
                                )}
                                
                                {review.description && (
                                  <Text size="2" color="gray" className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {review.description}
                                  </Text>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              {renderStars(review.stars, 'sm')}
                              <Text size="2" color="gray" className="text-gray-500 dark:text-gray-400">
                                {formatDate(review.createdAt)}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 mb-8">
                    <Text size="3" color="gray" className="text-gray-600 dark:text-gray-400">
                      No reviews
                    </Text>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6 mb-8">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Bottom Review Form - Only show if not readOnly */}
          {!readOnly && (
          <div className="sticky bottom-0 left-0 w-full border-t-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            {/* Star Rating Selection Row */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select star rating
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStars(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredStar || stars)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Input Form */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                    <Text size="2" className="text-red-600 dark:text-red-400">
                      {error}
                    </Text>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    {/* Textarea with Character Count */}
                    <div className="relative flex-1 flex flex-col">
                      <textarea
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = '40px';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                        }}
                        maxLength={5000}
                        rows={1}
                        className="w-full min-h-[40px] max-h-[200px] px-4 py-2 pr-16 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none overflow-y-auto focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="Write a review"
                        style={{ height: '40px' }}
                      />
                      <span className="absolute right-2.5 bottom-1.25 text-xs text-gray-500 dark:text-gray-400">
                        {description.length} / 5,000
                      </span>
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || stars < 1 || description.trim().length === 0}
                      className="shrink-0 w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                      aria-label="Send review"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

