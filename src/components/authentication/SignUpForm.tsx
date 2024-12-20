import React, { useState } from "react";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { useRouter } from "next/router";
import { Password } from "primereact/password";
import { Divider } from "primereact/divider";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithPopup,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { createUserDocument } from "~/components/firebase/FirebaseFunctions";
import { FirebaseError } from "firebase/app";

const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isWeak, setIsWeak] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>("");
  const [passwordCriteria, setPasswordCriteria] = useState({
    minChar: false,
    lowerCase: false,
    upperCase: false,
    numeric: false,
    specialChar: false,
  });

  const [createUserWithEmailAndPassword] =
    useCreateUserWithEmailAndPassword(auth);
  const router = useRouter();

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      if (additionalUserInfo?.isNewUser) {
        const user = result.user;
        await createUserDocument(user, user.displayName || "");
      } else {
      }
      router.push("/");
    } catch (e) {
    }
  };

  const handleSignUp = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const strongRegex =
      /^(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?\/~`\-]).{8,}$/;
    if (!strongRegex.test(password)) {
      setIsWeak(true);
      alert("Password is weak, please ensure it meets all requirements.");
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(email, password);
      if (res?.user) {
        await createUserDocument(res.user, name);
        setEmail("");
        setName("");
        setPassword("");
        router.push("/pre_screening/begin");
      } else {
        alert(
          "A user already exists with this email. Please sign in, or use a different email.",
        );
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/email-already-in-use":
            alert("This email is already in use by another account.");
            break;
          case "auth/invalid-email":
            alert("The email address is not valid.");
            break;
          case "auth/weak-password":
            alert("The password is too weak.");
            break;
          default:
            alert("Failed to create account. Please try again.");
            break;
        }
      } else {
        console.error("An unexpected error occurred:", error);
        alert("An unexpected error occurred. Please try again.");
      }
      console.error("An unexpected error occurred:", error);
      alert("An unexpected error occurred. Please try again.");
      return;
    }
  };

  const checkPasswordCriteria = (password: string) => {
    const criteria = {
      minChar: password.length >= 8,
      lowerCase: /[a-z]/.test(password),
      upperCase: /[A-Z]/.test(password),
      numeric: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*()_+{}\[\]:;<>,.?\/~`\-]/.test(password),
    };
    setPasswordCriteria(criteria);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const emailValue = e.target.value;
    setEmail(emailValue);
  };

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIsWeak(false);
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordCriteria(newPassword);
  };

  const createCheckMark = (isTrue: boolean) => (isTrue ? "✅" : "");

  const passwordFooter = (
    <>
      <Divider />
      <p className="mt-2">Requirements</p>
      <ul className="m-0 list-none p-0">
        <li className="mt-2 flex items-center">
          <span className="flex-1">At least one lowercase</span>
          <span>{createCheckMark(passwordCriteria.lowerCase)}</span>
        </li>
        <li className="mt-2 flex items-center">
          <span className="flex-1">At least one uppercase</span>
          <span>{createCheckMark(passwordCriteria.upperCase)}</span>
        </li>
        <li className="mt-2 flex items-center">
          <span className="flex-1">At least one numeric</span>
          <span>{createCheckMark(passwordCriteria.numeric)}</span>
        </li>
        <li className="mt-2 flex items-center">
          <span className="flex-1">At least one special character</span>
          <span>{createCheckMark(passwordCriteria.specialChar)}</span>
        </li>
        <li className="mt-2 flex items-center">
          <span className="flex-1">Minimum 8 characters</span>
          <span>{createCheckMark(passwordCriteria.minChar)}</span>
        </li>
      </ul>
    </>
  );

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="rounded-lg p-8 shadow-lg">
        <h1 className="mb-8 text-center text-2xl font-bold">Create Account</h1>
        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 font-bold">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            {emailError && <p className="text-red-600">{emailError}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 font-bold">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={handlePasswordChange}
              toggleMask
              footer={passwordFooter}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            {isWeak && <p className="text-red-600">Password is weak</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded bg-green-500 py-2 font-bold text-white hover:bg-green-600"
          >
            Sign Up
          </button>
          <div className="my-6 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-300"></span>
            <p className="mx-4 text-xs text-gray-700">OR SIGN UP WITH</p>
            <span className="w-1/5 border-b border-gray-300"></span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center rounded border border-gray-300 py-2 text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <FcGoogle className="text-2xl" />
            <span className="ml-2">Google</span>
          </button>
        </form>
        <p className="my-4 text-center text-sm text-gray-600">
          Have an account?{" "}
        </p>
        <button
          className="flex w-full items-center justify-center rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
          onClick={() => router.push("/users/sign-in")}
        >
          Sign In
        </button>

        <p className="mt-2 text-center text-sm text-gray-600"></p>
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

export default SignUpForm;
