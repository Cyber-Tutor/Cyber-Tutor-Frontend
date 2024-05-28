import Head from "next/head";
import { BaseLayout } from "../components/layouts/BaseLayout";
import { auth, db } from "../components/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import queryUserDocument, {
  numberOfTopicsCompleted,
} from "../components/firebase/FirebaseFunctions";
import {
  DocumentData,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useRouter } from "next/router";
import CircularWithValueLabel from "~/components/ui/ProgressCircle";
import { jsPDF } from "jspdf";
import { FaNewspaper } from "react-icons/fa";
import Tip from "../components/content_management/tips/tip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

interface UserDocument extends DocumentData {
  initialSurveyComplete?: boolean;
  lastLoginDate?: { seconds: number };
  streakCount?: number;
}

export default function Home() {
  const [user, loading, error] = useAuthState(auth);
  const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
  const [proficiencyRatio, setProficiencyRatio] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [topicsCompleted, setTopicsCompleted] = useState<number>(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [completedChapters, setCompletedChapters] = useState(0);
  const [hasReadToday, setHasReadToday] = useState(false);
  const router = useRouter();

  // Get the user ID
  const uid = user ? user.uid : null;

  // Query for the user document from Firestore
  useEffect(() => {
    if (uid) {
      queryUserDocument(uid).then((userDoc: DocumentData | null) => {
        setUserDocument(userDoc as UserDocument);
      });
    }
    if (userDocument?.lastReadTime) {
      const lastReadTime = new Date(userDocument.lastReadTime.seconds * 1000);
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - lastReadTime.getTime();
      const hoursDifference = timeDifference / (1000 * 3600);

      if (hoursDifference < 24) {
        setHasReadToday(true);
      } else {
        setHasReadToday(false);
      }
    } else {
      setHasReadToday(false);
    }
  }, [uid]);

  useEffect(() => {
    if (userDocument?.lastReadTime) {
      const lastReadTime = new Date(userDocument.lastReadTime.seconds * 1000);
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - lastReadTime.getTime();
      const hoursDifference = timeDifference / (1000 * 3600);

      if (hoursDifference < 24) {
        setHasReadToday(true);
      } else {
        setHasReadToday(false);
      }
    } else {
      setHasReadToday(false);
    }
  }, [userDocument?.lastReadTime]);

  // Check if the user has completed the initial survey, demographic survey and update the streak count. If not, redirect to the respective survey page
  useEffect(() => {
    if (userDocument) {
      const lastLoginDate = new Date(
        userDocument?.lastLoginDate?.seconds
          ? userDocument?.lastLoginDate.seconds
          : 0 * 1000,
      );
      const today = new Date();
      const hasRead = lastLoginDate.toDateString() === today.toDateString();
      setHasReadToday(hasRead);

      if (!hasRead) {
        updateUserStreak(userDocument.id, userDocument.lastLoginDate);
      }
    }
  }, [userDocument]);

  // Fetch the number of topics completed by the user by calling the function numberOfTopicsCompleted from firebase_functions.ts
  if (uid) {
    const getTopicsCompleted = async () => {
      const topicsNum = await numberOfTopicsCompleted(uid);
      setTopicsCompleted(topicsNum);
    };
    getTopicsCompleted();
  }

  // Load the proficiency ratio from local storage
  useEffect(() => {
    const savedRatio = localStorage.getItem("proficiencyRatio");
    if (savedRatio) {
      setProficiencyRatio(parseFloat(savedRatio));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("proficiencyRatio", proficiencyRatio.toString());
  }, [proficiencyRatio]);

  // Fetch the progress of the user for number of chapters completed
  useEffect(() => {
    if (userDocument && userDocument.id) {
      const progressRef = collection(db, `users/${userDocument.id}/progress`);
      getDocs(progressRef).then((snapshot) => {
        const totalDocuments = snapshot.size;
        const completedDocumentsCount = snapshot.docs.filter(
          (doc) => doc.data().complete === true,
        ).length;
        const ratio =
          totalDocuments > 0
            ? (completedDocumentsCount / totalDocuments) * 100
            : 0;
        setProficiencyRatio(ratio);
        setTotalChapters(totalDocuments);
        setCompletedChapters(completedDocumentsCount);
      });
    }
  }, [userDocument]);

  async function updateUserStreak(
    uid: string | null,
    lastLoginDate: { seconds: number } | undefined,
  ) {
    if (!uid || !userDocument) return;

    const userDocRef = doc(db, "users", userDocument.id);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let newStreakCount = userDocument.streakCount || 0;
    let shouldUpdateFirebase = false;

    if (lastLoginDate) {
      const lastLogin = new Date(lastLoginDate.seconds * 1000);
      lastLogin.setHours(0, 0, 0, 0);
      const diffInDays =
        (currentDate.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24);

      if (diffInDays >= 1 && diffInDays < 2) {
        newStreakCount += 1;
        shouldUpdateFirebase = true;
      } else if (diffInDays < 1) {
        return;
      } else if (diffInDays >= 2) {
        newStreakCount = 0;
        shouldUpdateFirebase = true;
      }
    } else {
      newStreakCount = 1;
      shouldUpdateFirebase = true;
    }

    setStreakCount(newStreakCount);

    if (shouldUpdateFirebase) {
      await updateDoc(userDocRef, {
        lastReadTime: currentDate,
        streakCount: newStreakCount,
      });
    }
  }
  // Update the read streak count for the user

  async function updateReadStreak() {
    if (!uid || !userDocument) return;

    const userDocRef = doc(db, "users", userDocument.id);
    const currentTime = new Date();

    let newStreakCount = userDocument.streakCount || 0;
    newStreakCount += 1;

    await updateDoc(userDocRef, {
      lastReadTime: currentTime,
      streakCount: newStreakCount,
    });

    setStreakCount(newStreakCount);
    setHasReadToday(true);
  }

  // Function to create the UI of the certificate and download it as a PDF

  function downloadCertificate(userName: any) {
    // Create the UI of the certificate
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(30);
    doc.setTextColor(60, 60, 60);
    doc.text("Certificate of Completion", 105, 40, { align: "center" });

    doc.setFontSize(20);
    doc.text(`Congratulations, ${userName}!`, 105, 60, { align: "center" });

    doc.setFontSize(16);
    doc.text("You have successfully completed Cyber Tutor.", 105, 80, {
      align: "center",
    });

    // Save the Certificate as a PDF
    doc.save("CyberTutor_Certificate.pdf");
  }

  return (
    <>
      <Head>
        <title>Cyber Tutor</title>
      </Head>
      <div className="flex w-full flex-col ">
        {user ? (
          // If user is logged in, show the dashboard with their progress information
          <BaseLayout>
            <motion.div
              className="  mt-20 bg-white md:mt-16 lg:mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            >
              <motion.div className="mx-auto max-w-xl px-4 pb-8  pt-12">
                <motion.h1 className="text-center text-2xl font-bold text-gray-800">
                  <i className="fas fa-shield-alt mr-2 text-indigo-500"></i>
                  Ready to fortify your digital life and stay protected?
                </motion.h1>
                <motion.p className="mt-4 text-center text-lg text-gray-600">
                  <i className="fas fa-list-ul mr-2 text-gray-400"></i>
                  Select a topic from the menu.
                </motion.p>
                <motion.div className="mt-6 text-center">
                  <motion.span className="text-xl font-semibold text-gray-800">
                    <i className="fas fa-chart-line mr-2 text-green-500"></i>
                    Progress:
                  </motion.span>
                  <br />
                  Topics Complete: {topicsCompleted} / 5
                  <br />
                  Chapters Complete: {completedChapters} / {totalChapters}
                  <br />
                  <br />
                  <CircularWithValueLabel value={proficiencyRatio} size={80} />
                </motion.div>

                {topicsCompleted === 5 && (
                  <motion.div className="text-center">
                    <motion.p>
                      Congratulations on completing Cyber Tutor!!! You can now
                      download your certificate.
                    </motion.p>
                    <motion.button
                      className="mt-4 rounded-lg bg-blue-700 px-6 py-3 font-bold text-white shadow-lg transition duration-150 ease-in-out hover:bg-blue-800"
                      onClick={() =>
                        downloadCertificate(userDocument?.data().name || "User")
                      }
                    >
                      Download Certificate
                    </motion.button>
                  </motion.div>
                )}

                <motion.div className="text-center">
                  <Tip />
                </motion.div>

                <motion.div className="mt-4 text-center">
                  {streakCount > 0 ? (
                    <motion.span className="text-xl font-semibold text-green-600">
                      <i className="fas fa-fire mr-2"></i>
                      Streak: {streakCount} day(s)
                    </motion.span>
                  ) : (
                    <motion.span className="text-lg text-gray-600">
                      <i className="fas fa-clock mr-2 text-blue-500"></i>
                      Start your streak by logging in daily.
                    </motion.span>
                  )}
                </motion.div>

                {/* {hasReadToday ? (
                  <p>You have already read an article today.</p>
                ) : ( */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => {
                      updateReadStreak();
                      updateUserStreak(
                        userDocument?.id,
                        userDocument?.lastReadTime,
                      );
                      router.push("/news/content");
                    }}
                    className="button-class mt-5 flex items-center justify-center rounded-full bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                  >
                    <FaNewspaper className="mr-2 h-6 w-6" />
                    Read an Article
                  </button>
                </div>

                {/* )} */}
              </motion.div>
            </motion.div>
          </BaseLayout>
        ) : (
          // If user is not logged in, show the landing page with the introduction video
          <>
            {/* <div className="flex justify-center">
              <img
                src="images/home_title.png"
                className="w-1/2 md:w-1/4 lg:w-1/6"
              />
            </div> */}
            <div
              // style={{ backgroundImage: "url(/images/home_bg.jpg)" }}
              className="h-screen w-screen bg-gradient-to-tr from-blue-600 to-blue-900 bg-cover bg-no-repeat pb-10"
            >
              <motion.div
                className="flex flex-grow flex-col items-center justify-center p-4 text-gray-900"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.h1
                  className="mx-auto ml-9 mt-16 text-left text-4xl font-bold text-white md:text-5xl lg:w-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  LEARNING CYBER SECURITY HAS NEVER BEEN EASIER
                </motion.h1>

                <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-x-8 lg:gap-x-16">
                  <motion.p
                    className="mx-auto mt-8 rounded-lg p-4 text-left text-xl font-semibold text-white md:text-2xl lg:w-1/2 lg:text-3xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    Welcome to CyberTutor! Protect your daily digital life with
                    our free courses. Learn how to protect your personal
                    information, secure your devices, and stay safe online. Our
                    courses are designed for everyone, from beginners to
                    advanced users. Get started today!
                  </motion.p>
                  {typeof window !== "undefined" && (
                    <ReactPlayer
                      url="https://youtu.be/027hGcCeoHc"
                      playing={false}
                      controls={true}
                      className="mb-8 mt-7 max-w-full items-center justify-center rounded-lg md:ml-4 lg:mb-0 lg:mt-0 lg:w-1/2"
                    />
                  )}
                </div>

                <motion.div
                  className="mt-10 flex items-center justify-center space-x-16 bg-cover bg-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <a
                    href="/users/sign-in"
                    className="relative flex flex-col items-center justify-center p-6 transition duration-150 ease-in-out hover:scale-110"
                  >
                    <FontAwesomeIcon
                      icon={faLock}
                      className="text-9xl text-blue-400 transition duration-150 ease-in-out"
                    />
                    <span className="absolute top-12 mt-14 text-center text-xl font-bold text-white transition duration-150 ease-in-out">
                      Sign In
                    </span>
                  </a>
                  <a
                    href="/users/sign-up"
                    className="relative flex flex-col items-center justify-center p-6 transition duration-150 ease-in-out hover:scale-110"
                  >
                    <FontAwesomeIcon
                      icon={faLock}
                      className="text-9xl text-blue-400 transition duration-150 ease-in-out "
                    />
                    <span className="absolute top-12 mt-14 text-center text-xl font-bold text-white transition duration-150 ease-in-out">
                      Sign Up
                    </span>
                  </a>
                </motion.div>

                {/* <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-x-24">
                  <p className="text-xl font-bold leading-relaxed text-blue-600 md:text-3xl">
                    Learning Cyber Security has never been easier. Watch or read
                    expert curated content.
                  </p>
                  <img
                    src="/images/content.png"
                    className="h-auto w-full rounded-lg shadow-lg md:w-1/2"
                    alt="Learning Cyber Security"
                  />
                </div>
                <div className="mt-8 flex flex-col-reverse items-center justify-between gap-6 md:flex-row md:gap-x-24">
                  <img
                    src="/gifs/2fa.gif"
                    alt="Two Factor Authentication"
                    className="h-auto w-full rounded-lg shadow-lg md:w-1/2"
                  />
                  <p className="text-xl font-bold leading-relaxed text-blue-600 md:text-3xl">
                    Learn topics ranging from two-factor authentication to
                    software updates and strong passwords.
                  </p>
                </div>
              </div> */}

                {/* <div className="-mb-14 h-full w-screen bg-gradient-to-t from-blue-700 to-blue-900 ">
                <motion.h1
                  className="mx-auto ml-16 mt-20 text-left text-4xl font-bold font-extralight text-white md:text-5xl lg:w-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  ABOUT
                </motion.h1>
                <div className="mt-10 flex flex-wrap items-center justify-center md:flex-nowrap">
                  <motion.p
                    className="mx-auto mt-8 rounded-lg p-4 text-left text-xl font-semibold text-white md:text-2xl lg:w-1/2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    Welcome to CyberTutor! Protect your daily digital life with
                    our free courses. Learn how to protect your personal
                    information, secure your devices, and stay safe online. Our
                    courses are designed for everyone, from beginners to
                    advanced users. Get started today!
                  </motion.p>

                  {typeof window !== "undefined" && (
                    <ReactPlayer
                      url="https://youtu.be/027hGcCeoHc"
                      playing={false}
                      controls={true}
                      className="mb-8 mr-5 max-w-full rounded-lg md:ml-4 lg:w-1/2"
                    />
                  )}
                </div>
              </div> */}
              </motion.div>
            </div>

            {/* <footer className="mt-8 w-full bg-gray-900 p-4 text-center text-white">
              2030 Cyber Tutor. All rights reserved.
            </footer> */}
          </>
        )}
      </div>
    </>
  );
}
