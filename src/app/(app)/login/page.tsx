import { Suspense } from "react";
import AuthRoute from "@/components/auth/AuthRoute";

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <AuthRoute searchParams={searchParams} />
    </Suspense>
  );
}
