import { account } from "./appwrite";
import { OAuthProvider } from "appwrite";
import { print } from "./dom";

export async function loginWithGoogle() {
  const user = await account.get().catch(() => null);
  if (user) {
    print("Already logged in. Run 'logout' first.");
    return;
  }

  const local = localStorage.getItem("fileSystem");
  if (local) {
    sessionStorage.setItem("pendingTransfer", local);
  }

  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}`,
    `${window.location.origin}`
  );
}

export async function logout() {
  const user = await account.get().catch(() => null);
  if (!user) {
    print("Not logged in.");
    return;
  }

  await account.deleteSession("current");
  localStorage.removeItem("fileSystem");
  window.location.reload();
}