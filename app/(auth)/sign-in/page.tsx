import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with email, username, or phone
        </p>
      </div>
      <SignInForm />
    </>
  );
}
