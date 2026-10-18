import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

async function Form({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : "/"} />;
}

export default function Page(props: PageProps<"/login">) {
  return (
    <Suspense>
      <Form {...props} />
    </Suspense>
  );
}
