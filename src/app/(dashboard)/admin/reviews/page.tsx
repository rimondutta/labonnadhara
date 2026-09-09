import { Metadata } from "next"
import ReviewsClient from "@/components/admin/ReviewsClient"

export const metadata: Metadata = {
  title: "Reviews | Admin Dashboard",
  description: "Manage product reviews",
}

export default function ReviewsPage() {
  return <ReviewsClient />
}
