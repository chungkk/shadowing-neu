import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

async function Form({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={typeof next === "string" ? next : "/"} />;
}

export default function Page(props: PageProps<"/register">) {
  return (
    <Suspense>
      <Form {...props} />
    </Suspense>
  );
}
