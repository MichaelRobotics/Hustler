"use client";

import React, { useState, useEffect } from "react";
import { 
	Text, 
	Heading, 
	Button,
	Table
} from "frosted-ui";
import { apiGet } from "@/lib/utils/api-client";
import { ChevronLeft, ChevronRight, User, Loader2 } from "lucide-react";

interface Order {
	id: string;
	userName: string;
	email: string;
	avatar: string | null;
	prodName: string;
	amount: string;
	createdAt: Date | string;
	subscription: "Basic" | "Pro" | "Vip" | null;
	planId: string | null;
	paymentId: string;
}

interface OrdersResponse {
	orders: Order[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

interface OrdersTableProps {
	experienceId?: string;
}

/**
 * Format currency amount
 */
const formatCurrency = (amount: string | number): string => {
	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(numAmount);
};

/**
 * Format amount with subscription timeframe if applicable
 */
const formatAmount = (order: Order): string => {
	const amount = formatCurrency(order.amount);
	
	// If it's a subscription, add / month (assume monthly for now)
	if (order.subscription) {
		return `${amount} / month`;
	}
	
	return amount;
};

/**
 * Format date
 */
const formatDate = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(dateObj);
};

export const OrdersTable: React.FC<OrdersTableProps> = ({ experienceId }) => {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState<OrdersResponse['pagination'] | null>(null);

	const fetchOrders = async (pageNum: number) => {
		if (!experienceId) {
			setError("Experience ID is required");
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await apiGet(
				`/api/orders?page=${pageNum}&limit=20`,
				experienceId
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch orders');
			}

			const data: OrdersResponse = await response.json();
			setOrders(data.orders);
			setPagination(data.pagination);
		} catch (err: any) {
			console.error("Error fetching orders:", err);
			setError(err.message || "Failed to load orders");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrders(page);
	}, [page, experienceId]);

	const handlePreviousPage = () => {
		if (pagination && page > 1) {
			setPage(page - 1);
		}
	};

	const handleNextPage = () => {
		if (pagination && page < pagination.totalPages) {
			setPage(page + 1);
		}
	};

	if (loading && orders.length === 0) {
		return (
			<div className="text-center py-8">
				<Loader2 size={32} className="animate-spin text-violet-500 mx-auto" />
				<Text size="3" className="mt-4 text-gray-600 dark:text-gray-300">Loading orders...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
				<Text size="3" className="text-destructive">
					{error}
				</Text>
				<Button
					size="2"
					variant="surface"
					onClick={() => fetchOrders(page)}
					className="mt-4"
				>
					Retry
				</Button>
			</div>
		);
	}

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Text size="4" className="text-muted-foreground mb-2">
					No orders found
				</Text>
				<Text size="2" className="text-muted-foreground">
					Orders from customers will appear here
				</Text>
			</div>
		);
	}

	return (
		<div className="mt-8">
			<Table.Root size="2" variant="surface">
				<Table.Table>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeaderCell>
								Customer
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Email
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Product
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Amount
							</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>
								Date
							</Table.ColumnHeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{orders.map((order) => (
							<Table.Row key={order.id}>
								<Table.RowHeaderCell>
									<div className="flex items-center gap-3">
										{order.avatar ? (
											<img
												src={order.avatar}
												alt={order.userName}
												className="w-10 h-10 rounded-full object-cover"
											/>
										) : (
											<div className="w-10 h-10 rounded-full bg-surface border border-border/50 flex items-center justify-center">
												<User size={20} className="text-muted-foreground" />
											</div>
										)}
										<Text size="3" weight="medium">
											{order.userName}
										</Text>
									</div>
								</Table.RowHeaderCell>
								<Table.Cell>
									<Text size="3">
										{order.email}
									</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="3" weight="medium">
										{order.prodName}
									</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="3" weight="semi-bold">
										{formatAmount(order)}
									</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="3">
										{formatDate(order.createdAt)}
									</Text>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Table>
				<Table.BottomBar>
					{pagination && pagination.totalPages > 1 ? (
						<div className="flex items-center justify-between w-full">
							<Text size="2">
								Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} orders
							</Text>
							<div className="flex items-center gap-2">
								<Button
									size="2"
									variant="ghost"
									onClick={handlePreviousPage}
									disabled={page === 1}
									className="p-2"
								>
									<ChevronLeft size={16} />
								</Button>
								<Text size="2" className="min-w-[60px] text-center">
									{page} / {pagination.totalPages}
								</Text>
								<Button
									size="2"
									variant="ghost"
									onClick={handleNextPage}
									disabled={page >= pagination.totalPages}
									className="p-2"
								>
									<ChevronRight size={16} />
								</Button>
							</div>
						</div>
					) : (
						<Text size="2">
							Showing {pagination?.total || 0} {pagination?.total === 1 ? 'order' : 'orders'}
						</Text>
					)}
				</Table.BottomBar>
			</Table.Root>
		</div>
	);
};

