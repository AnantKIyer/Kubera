import { convexAuth } from "@convex-dev/auth/server";
import { KuberaPassword } from "./providers/kuberaPassword";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [KuberaPassword],
});
