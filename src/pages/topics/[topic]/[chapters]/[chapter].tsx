import { BaseLayout } from "../../../../components/layouts/BaseLayout";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db, auth } from "~/components/firebase/config";
import { DocumentData, doc, getDoc } from "firebase/firestore";
import {
  findUserDocId,
  isChapterComplete,
} from "~/components/firebase/FirebaseFunctions";
import TimerComponent from "~/components/ui/Timer";
import queryUserDocument from "~/components/firebase/FirebaseFunctions";
import { motion } from "framer-motion";
import { Chapter } from "../../../../types";
import NextChapterButton from "../../../../components/ui/NextChapterButton";
import ChapterContentManager from "../../../../components/content_management/chapter/ChapterContentManager";
import Head from "next/head";

export default function ChapterPage() {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [played, setPlayed] = useState(0);
  const [userDocument, setUserDocument] = useState<DocumentData | null>(null);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);
  const [userGroup, setUserGroup] = useState<string | null>(null);
  const [userProficiency, setUserProficiency] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<DocumentData | null>(null);
  const [chapterComplete, setChapterComplete] = useState<boolean>(false);
  const [contentPreference, setContentPreference] = useState<string | null>(
    null,
  );
  const [controlGroupImageIndex, setControlGroupImageIndex] =
    useState<number>();
  const [experimentalGroupImageIndex, setExperimentalGroupImageIndex] =
    useState<number>();

  useEffect(() => {
    if (chapter && chapter.controlGroupImageURLs) {
      setControlGroupImageIndex(
        Math.floor(Math.random() * chapter.controlGroupImageURLs.length),
      );
    }
    if (chapter && chapter.controlGroupImageURLs) {
      setExperimentalGroupImageIndex(
        Math.floor(Math.random() * chapter.experimentalGroupImageURLs.length),
      );
    }
  }, [chapter]);

  const router = useRouter();
  const { topic: topicId, chapter: chapterId } = router.query;

  useEffect(() => {
    const fetchChapter = async () => {
      if (
        !topicId ||
        !chapterId ||
        Array.isArray(topicId) ||
        Array.isArray(chapterId)
      )
        return;

      setLoading(true);
      try {
        const chapterRef = doc(db, `topics/${topicId}/chapters/${chapterId}`);
        const chapterSnapshot = await getDoc(chapterRef);

        if (chapterSnapshot.exists()) {
          setChapter({
            chapterId: chapterSnapshot.id,
            ...chapterSnapshot.data(),
          } as Chapter);
        } else {
          setError("Chapter not found");
        }
      } catch (err) {
        setError("Failed to fetch chapter");
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [topicId, chapterId]);

  useEffect(() => {
    if (secondsElapsed >= 30) {
      setProgressComplete(true);
    }
  }, [secondsElapsed]);

  const user = auth.currentUser;
  const uid = user ? user.uid : null;

  useEffect(() => {
    const fetchUserGroup = async () => {
      if (!uid) return;

      try {
        const userDocument = await queryUserDocument(uid);

        if (userDocument && userDocument.exists()) {
          setUserGroup(userDocument.data().group);
        } else {
        }
      } catch (err) {
      }
    };

    fetchUserGroup();
  }, [uid]);

  useEffect(() => {
    const fetchContentPreference = async () => {
      if (!uid) return;

      try {
        const userDocument = await queryUserDocument(uid);

        if (userDocument && userDocument.exists()) {
          setContentPreference(userDocument.data().contentPreference);
        } else {
        }
      } catch (err) {
      }
    };

    fetchContentPreference();
  }, [uid]);

  useEffect(() => {
    const fetchUserProficiency = async () => {
      if (!uid) return;

      const userDocId = await findUserDocId(uid);

      if (!userDocId) return;

      const userProficiencyRef = doc(
        db,
        "users",
        userDocId,
        "proficiency",
        String(topicId),
      );
      const proficiencySnapshot = await getDoc(userProficiencyRef);
      const proficiencyData = proficiencySnapshot.data();

      if (proficiencyData && proficiencyData.proficiency) {
        setUserProficiency(proficiencyData.proficiency);
      }
    };

    fetchUserProficiency();
  }, [uid, progressData]);

  if (loading)
    return (
      <BaseLayout>
        <div className="mt-5 text-center">Loading, please wait...</div>
      </BaseLayout>
    );
  if (error)
    return (
      <BaseLayout>
        <div className="mt-5 text-center">An error occurred: {error}</div>
      </BaseLayout>
    );
  if (!chapter)
    return (
      <BaseLayout>
        <div className="mt-5 text-center">Chapter not found.</div>
      </BaseLayout>
    );

  const handleChapterComplete = async () => {
    setChapterComplete(
      await isChapterComplete(user?.uid ?? "", chapterId?.toString() ?? ""),
    );
  };

  handleChapterComplete();

  return (
    <BaseLayout>
      <Head>
        <title>{chapter ? chapter.chapterTitle : "Loading..."}</title>
      </Head>
      <div
        className={`mx-auto w-full ${contentPreference === "video" ? "h-screen" : ""}`}
      >
        <div className="text-center">
          <h1 className="mt-20 py-3 text-3xl font-bold md:mt-20 lg:mt-10">
            {chapter.chapterTitle}
          </h1>
          <p className="border-b-4 py-3">{chapter.chapterDescription}</p>
        </div>
        <ChapterContentManager
          contentPreference={contentPreference || ""}
          userGroup={userGroup || ""}
          chapter={chapter}
          controlGroupImageIndex={controlGroupImageIndex ?? null}
          experimentalGroupImageIndex={experimentalGroupImageIndex ?? null}
          userDocument={userDocument}
          userProficiency={userProficiency || ""}
          setPlayed={setPlayed}
          setIsVideoWatched={setIsVideoWatched}
          played={played}
        />
        <TimerComponent
          secondsElapsed={secondsElapsed}
          setSecondsElapsed={setSecondsElapsed}
        />
      </div>

      {chapter.chapterType !== "assessment" &&
        !chapterComplete &&
        secondsElapsed < 30 && (
          <div className="sticky bottom-0 w-full border-t-2 bg-white shadow">
            <div className="mx-auto">
              {secondsElapsed < 30 && (
                <>
                  <div>
                    {chapter.chapterType !== "assessment" && (
                      <div className="py-3 text-sm text-gray-700">
                        It takes 30 seconds to go to the next chapter and
                        complete this chapter.
                      </div>
                    )}
                  </div>

                  <div className="border-gray relative h-2 w-full bg-gray-200">
                    <motion.div
                      className="h-2 bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((secondsElapsed / 30) * 100, 100)}%`,
                      }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      {secondsElapsed >= 0 || chapterComplete ? (
        <div className="sticky bottom-0 w-full border-t-2 bg-white shadow">
          <div className="mx-auto flex items-center justify-center">
            {(progressComplete || chapterComplete) &&
              chapter.chapterType !== "assessment" && (
                <NextChapterButton
                  uid={uid}
                  chapterId={chapterId || "default"}
                  secondsElapsed={secondsElapsed}
                  chapterOrder={chapter.order}
                />
              )}
          </div>
        </div>
      ) : (
        ""
      )}
    </BaseLayout>
  );
}
