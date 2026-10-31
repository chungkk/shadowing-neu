import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";

async function Form({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode="register"
      next={typeof next === "string" ? next : "/"}
      social={{ google: googleWebClientId(), apple: appleWebClientId() }}
    />
  );
}

export default function Page(props: PageProps<"/register">) {
  return (
    <Suspense>
      <Form {...props} />
    </Suspense>
  );
}
