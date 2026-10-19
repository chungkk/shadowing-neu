import { Suspense } from "react";
import { ResetForm } from "@/components/PasswordForms";

async function Form({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === "string" ? token : ""} />;
}

export default function Page(props: PageProps<"/reset-password">) {
  return (
    <Suspense>
      <Form {...props} />
    </Suspense>
  );
}
