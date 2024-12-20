import React, { useEffect, useState } from "react";
import {
  useAuthState,
  useSignInWithEmailAndPassword,
} from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { useRouter } from "next/router";
import {
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getAuth,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { createUserDocument } from "~/components/firebase/FirebaseFunctions";
import { Password } from "primereact/password";

const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [user] = useAuthState(auth);
  const [signInWithEmailAndPassword, userCredential, , error] =
    useSignInWithEmailAndPassword(auth);
  const router = useRouter();

  const emptyTextBoxes = () => {
    setEmail("");
    setPassword("");
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError("");

    try {
      await signInWithEmailAndPassword(email, password);
      emptyTextBoxes();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("User does not exist.");
      } else {
        router.push("/");
      }
    } catch (e) {
      setSignInError("An unexpected error occurred. Please try again.");
    }
  };

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      if (additionalUserInfo?.isNewUser) {
        const user = result.user;
        await createUserDocument(user, user.displayName || "");
      }
      router.push("/");
    } catch (e) {
    }
  };

  useEffect(() => {
    if (error) {
      setSignInError(error.message);
    }
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="rounded-lg p-8 shadow-lg">
        <h1 className="mb-8 text-center text-2xl font-bold">Sign In</h1>
        <form onSubmit={handleSignIn} className="space-y-6">
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 font-bold">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="mb-1 font-bold">
              Password
            </label>
            <Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              toggleMask
              feedback={false}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-green-500 py-2 font-bold text-white hover:bg-green-600"
          >
            Sign In
          </button>
          <div className="my-6 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-300"></span>
            <p className="mx-4 text-xs text-gray-700">OR</p>
            <span className="w-1/5 border-b border-gray-300"></span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center rounded border border-gray-300 py-2 text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <FcGoogle className="text-2xl" />
            <span className="ml-2">Login with Google</span>
          </button>
        </form>

        <div className="my-4 border-t border-gray-300"></div>
        <p className="my-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
        </p>
        <button
          className="flex w-full items-center justify-center rounded border bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
          onClick={() => router.push("/users/sign-up")}
        >
          Sign Up
        </button>

        <button
          className="mt-4 flex w-full items-center justify-center rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
          onClick={() => router.push("/")}
        >
          Home
        </button>
      </div>
    </div>
  );
};

export default SignInForm;
