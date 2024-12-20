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
import { getRandomEmoji } from "../utils/randomEmoji";

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
  const randomEmoji = getRandomEmoji();
  const [isClient, setIsClient] = useState(false);

  const uid = user ? user.uid : null;

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  if (uid) {
    const getTopicsCompleted = async () => {
      const topicsNum = await numberOfTopicsCompleted(uid);
      setTopicsCompleted(topicsNum);
    };
    getTopicsCompleted();
  }

  useEffect(() => {
    const savedRatio = localStorage.getItem("proficiencyRatio");
    if (savedRatio) {
      setProficiencyRatio(parseFloat(savedRatio));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("proficiencyRatio", proficiencyRatio.toString());
  }, [proficiencyRatio]);

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

  function downloadCertificate(userName: any) {
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

    doc.save("CyberTutor_Certificate.pdf");
  }

  return (
    <>
      <Head>
        <title>Cyber Tutor</title>
      </Head>
      <div className="flex min-h-screen w-full flex-col">
        {user ? (
          <BaseLayout>
            <motion.div
              className="  mt-20 md:mt-16 lg:mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            >
              <motion.div className="mx-auto max-w-xl px-4 pb-8  pt-12">
                <motion.h1 className="text-center text-2xl font-bold text-gray-800">
                  <div className="mb-4 text-4xl underline">
                    Welcome back, {userDocument?.data()?.name || "User"}{" "}
                    {randomEmoji}
                  </div>
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
              </motion.div>
            </motion.div>
          </BaseLayout>
        ) : (
          <motion.div
            className="flex h-screen flex-col items-center justify-center bg-gray-200 p-4 text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex w-full flex-col justify-center gap-x-8 lg:flex-row">
              <div className="flex flex-col items-center justify-center lg:w-1/2">
                <div className="mx-auto mb-2 h-1 w-1/2 bg-slate-400 lg:block"></div>
                <div className="mt-2 h-1 w-full bg-slate-400 lg:block"></div>
                <motion.p
                  className="text-md mx-auto items-center p-2 text-center font-semibold md:text-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  Welcome to CyberTutor! Dive into the world of cyber security
                  and fortify your digital life today. Explore our curated video
                  series to become a savvy internet user and protect yourself
                  against online threats.
                </motion.p>
                <div className="mb-2 h-1 w-full bg-slate-400 lg:block"></div>
                <div className="mx-auto mt-2 h-1 w-1/2 bg-slate-400 lg:block"></div>
              </div>

              {isClient && (
                <div className="mb-16 mt-4 flex items-center p-2 lg:m-0 lg:w-1/2">
                  <ReactPlayer
                    url="https://youtu.be/027hGcCeoHc"
                    playing={false}
                    controls={true}
                    className="mx-auto max-w-full rounded-lg border-5 border-slate-500 shadow-2xl"
                  />
                </div>
              )}
            </div>
            <motion.div
              className="fixed bottom-0 z-50 mt-10 flex w-full justify-between border-t-3 border-slate-500 bg-slate-50 "
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <button
                className="w-1/2 bg-blue-700 px-6 py-3 font-bold text-white shadow-lg transition duration-150 ease-in-out hover:bg-blue-800"
                onClick={() => router.push("/users/sign-up")}
              >
                Register
              </button>
              <button
                className="w-1/2 bg-green-700 px-6 py-3 font-bold text-white shadow-lg transition duration-150 ease-in-out hover:bg-green-800"
                onClick={() => router.push("/users/sign-in")}
              >
                Login
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  );
}
