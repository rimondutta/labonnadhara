import connectToDatabase from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import DashboardClient from "@/components/admin/DashboardClient";

export default async function AdminDashboardPage() {
  await connectToDatabase();

  const totalOrdersCount = await Order.countDocuments();
  const totalProductsCount = await Product.countDocuments();
  const totalCustomersCount = (await Order.distinct('customerEmail')).length;

  const paidOrders = await Order.find({ paymentStatus: 'paid' }).lean();
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  const topProducts = await Product.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  return (
    <DashboardClient
      totalRevenue={totalRevenue}
      totalOrdersCount={totalOrdersCount}
      totalCustomersCount={totalCustomersCount}
      totalProductsCount={totalProductsCount}
      recentOrders={JSON.parse(JSON.stringify(recentOrders))}
      topProducts={JSON.parse(JSON.stringify(topProducts))}
    />
  );
}
