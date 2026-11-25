import connectToDatabase from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import DashboardClient from "@/components/admin/DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  try {
    await connectToDatabase();

    const [totalOrdersCount, totalProductsCount, customerEmails, revenueAgg, recentOrders, topProducts] = await Promise.all([
      Order.countDocuments().catch(() => 0),
      Product.countDocuments().catch(() => 0),
      Order.distinct('customerEmail').catch(() => []),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).catch(() => []),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .catch(() => []),
      Product.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .lean()
        .catch(() => []),
    ]);

    const totalRevenue = revenueAgg && revenueAgg[0] ? (revenueAgg[0].total || 0) : 0;
    const totalCustomersCount = Array.isArray(customerEmails) ? customerEmails.length : 0;

    return (
      <DashboardClient
        totalRevenue={totalRevenue}
        totalOrdersCount={totalOrdersCount}
        totalCustomersCount={totalCustomersCount}
        totalProductsCount={totalProductsCount}
        recentOrders={JSON.parse(JSON.stringify(recentOrders || []))}
        topProducts={JSON.parse(JSON.stringify(topProducts || []))}
      />
    );
  } catch (error) {
    console.error("Error loading Admin Dashboard data:", error);
    return (
      <DashboardClient
        totalRevenue={0}
        totalOrdersCount={0}
        totalCustomersCount={0}
        totalProductsCount={0}
        recentOrders={[]}
        topProducts={[]}
      />
    );
  }
}
