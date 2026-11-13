import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export default async function MyPage() {
  await getAuthContext();
  redirect("/tasks");
}
