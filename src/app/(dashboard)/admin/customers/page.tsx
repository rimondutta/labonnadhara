import { Metadata } from "next"
import CustomersClient from "@/components/admin/CustomersClient"

export const metadata: Metadata = {
  title: "Customers | Admin Dashboard",
  description: "Manage registered customers",
}

export default function CustomersPage() {
  return <CustomersClient />
}
