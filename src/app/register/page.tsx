import { Suspense } from "react";
import AuthRoute from "@/components/AuthRoute";

export default function Page({ searchParams }: PageProps<"/register">) {
  return (
    <Suspense>
      <AuthRoute mode="register" searchParams={searchParams} />
    </Suspense>
  );
}
