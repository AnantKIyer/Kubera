import { SignUpForm } from "@/components/sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal finance, private and calm
        </p>
      </div>
      <SignUpForm />
    </>
  );
}
