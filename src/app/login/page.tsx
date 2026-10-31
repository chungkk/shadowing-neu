import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";

async function Form({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode="login"
      next={typeof next === "string" ? next : "/"}
      social={{ google: googleWebClientId(), apple: appleWebClientId() }}
    />
  );
}

export default function Page(props: PageProps<"/login">) {
  return (
    <Suspense>
      <Form {...props} />
    </Suspense>
  );
}
