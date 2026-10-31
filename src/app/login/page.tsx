import { Suspense } from "react";
import AuthRoute from "@/components/AuthRoute";

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <AuthRoute mode="login" searchParams={searchParams} />
    </Suspense>
  );
}
