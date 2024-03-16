import { BaseLayout } from "../layouts/baseLayout";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  orderBy,
  query,
  DocumentData,
} from "firebase/firestore";
import Link from "next/link";
import CircularWithValueLabel from "~/components/ProgressCircle";
import { auth } from "../firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import queryUserDocument from "../firebase/firebase_functions";

type Topic = {
  topicId: string;
  topicTitle: string;
  topicDescription: string;
  chapters: Chapter[];
};

type Chapter = {
  chapterId: string;
  chapterType: string;
  chapterTitle: string;
  chapterDescription: string;
  controlGroupContent: string;
  experimentalGroupContent: string;
  controlGroupImageURLs: string[];
  experimentalGroupImageURLs: string[];
  order: number;
  proficiency: number; // Add proficiency property
};

export default function TopicPage() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDocument, setUserDocument] = useState<DocumentData | null>(null);
  const [userProficiency, setUserProficiency] = useState<number | null>(null);
  const [chapterCompletion, setChapterCompletion] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const { topic: topicId } = router.query;

  useEffect(() => {
    // If user is not logged in, redirect to login page
    const auth = getAuth();
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    // If user is logged in, query and retrieve the reference to their document in the users collection in firestore
    if (uid) {
      queryUserDocument(uid).then(async (userDocument) => {
        console.log("User Document:", userDocument);
        setUserDocument(userDocument);

        // Fetch user proficiency for the topic
        const proficiencyRef = doc(db, `users/${userDocument?.id}/proficiency`, topicId?.toString() ?? ""); // Ensure topicId is always a string
        const proficiencySnapshot = await getDoc(proficiencyRef);
        if (proficiencySnapshot.exists()) {
          setUserProficiency(proficiencySnapshot.data().number);
        }

        // Fetch chapter completion status
        const progressCollectionRef = collection(db, `users/${userDocument?.id}/progress`);
        const progressSnapshot = await getDocs(progressCollectionRef);
        const completionStatus: Record<string, boolean> = {};
        progressSnapshot.forEach((doc) => {
          completionStatus[doc.id] = doc.data().complete;
        });
        setChapterCompletion(completionStatus);
      });
    }

    // Check if user completed initial survey, if not then redirect to initial survey
    if (userDocument && !userDocument.data().initialSurveyComplete) {
      router.push("/initialsurvey/begin");
    }

    console.log("User Document ID:", userDocument?.id);
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/users/sign-in");
      }
    });

    // Fetch topics from the database
    const fetchTopic = async () => {
      if (!topicId || Array.isArray(topicId)) return;

      setLoading(true);
      try {
        const topicRef = doc(db, "topics", topicId);

        const topicSnapshot = await getDoc(topicRef);

        if (topicSnapshot.exists()) {
          const topicData = topicSnapshot.data();

          const chaptersCollectionRef = collection(
            db,
            `topics/${topicId}/chapters`,
          );

          const chaptersQuery = query(chaptersCollectionRef, orderBy("order"));
          const chaptersSnapshot = await getDocs(chaptersQuery);

          const chapters = chaptersSnapshot.docs.map((doc) => {
            const chapterData = doc.data();
            return {
              chapterId: doc.id,
              chapterType: chapterData.chapterType,
              chapterTitle: chapterData.chapterTitle,
              chapterDescription: chapterData.chapterDescription,
              controlGroupContent: chapterData.controlGroupContent,
              experimentalGroupContent: chapterData.experimentalGroupContent,
              controlGroupImageURLs: chapterData.controlGroupImageURLs,
              experimentalGroupImageURLs:
                chapterData.experimentalGroupImageURLs,
              order: chapterData.order,
              proficiency: chapterData.proficiency,
            };
          });

          setTopic({
            topicId: topicSnapshot.id,
            topicTitle: topicData.topicTitle,
            topicDescription: topicData.topicDescription,
            chapters,
          });
        } else {
          console.error("uh oh, topic not found 🦧");
          setError("uh oh, topic not found 🦧");
        }
      } catch (err) {
        console.error("uh oh, error fetching topic 🦧:", err);
        setError("uh oh, error fetching topic 🦧");
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [topicId]);

  if (loading)
    return (
      <BaseLayout>
        <div>please wait, loading... 🦧</div>
      </BaseLayout>
    );
  if (error)
    return (
      <BaseLayout>
        <div>uh oh, error 🦧: {error}</div>
      </BaseLayout>
    );
  if (!topic)
    return (
      <BaseLayout>
        <div>uh oh, topic not found 🦧</div>
      </BaseLayout>
    );

  const proficiencyRatio = userProficiency !== null && topic ? Math.round((userProficiency / topic.chapters.length) * 100) : 0;
      
  return (
    <BaseLayout>
      <div className="overflow-y-auto rounded-lg border-2 border-solid text-center lg:w-7/12 lg:p-10">
        <div className="grid grid-cols-6 items-center">
          <h1 className="col-span-5 flex justify-start text-3xl font-bold">
            {topic.topicTitle}
          </h1>
          <div className="flex justify-end">
            <span className="decoration-5 flex rounded-full border-solid border-black  p-1.5 text-xs font-bold ">
              <CircularWithValueLabel value={proficiencyRatio} />
            </span>
          </div>
        </div>
        <p className="border-b-4 py-3">{topic.topicDescription}</p>
        <div className="flex flex-col text-start">
          {topic.chapters.map((chapter) => (
            userProficiency !== null && userProficiency >= chapter.proficiency ? (
              <Link
                key={chapter.chapterId}
                href={`/topics/${encodeURIComponent(
                  topic.topicId,
                )}/chapters/${encodeURIComponent(chapter.chapterId)}`}
                className="px-3 pt-3 hover:bg-slate-200"
              >
                <div>
                  <div className="grid grid-cols-6 items-center">
                    <h3 className="col-span-5 text-xl font-bold">
                      <p className="text-xs font-bold">
                        {chapter.chapterType.toUpperCase()}
                      </p>
                      {chapter.chapterTitle}
                      {chapterCompletion[chapter.chapterId] ? ' ✅' : ''}
                    </h3>
                    <div className="flex justify-end">
                      <span className="decoration-5 rounded-full border border-solid border-black bg-slate-200 p-1.5 text-xs font-bold">
                        🔓
                      </span>
                    </div>
                  </div>
                  <p className="border-b-2 pb-3">{chapter.chapterDescription}</p>
                </div>
              </Link>
            ) : (
              <div
                key={chapter.chapterId}
                className="px-3 pt-3 bg-slate-200 cursor-not-allowed"
              >
                <div>
                  <div className="grid grid-cols-6 items-center">
                    <h3 className="col-span-5 text-xl font-bold">
                      <p className="text-xs font-bold">
                        {chapter.chapterType.toUpperCase()}
                      </p>
                      {chapter.chapterTitle}
                    </h3>
                    <div className="flex justify-end">
                      <span className="decoration-5 rounded-full border border-solid border-black bg-red-500 p-1.5 text-xs font-bold">
                        🔒 
                      </span>
                    </div>
                  </div>
                  <p className="border-b-2 pb-3">{chapter.chapterDescription}</p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}
