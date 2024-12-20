import {
  doc,
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  updateDoc,
  getDoc,
  writeBatch,
  orderBy,
  arrayUnion,
  increment,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";
import { User } from "firebase/auth";

export default async function queryUserDocument(
  userIdString: string,
): Promise<DocumentData | null> {
  const usersCollectionRef = collection(db, "users");

  const q = query(usersCollectionRef, where("userId", "==", userIdString));

  try {
    const querySnapshot = await getDocs(q);

    const firstDoc = querySnapshot.docs[0];
    if (firstDoc) {
      return firstDoc;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

export async function handleVideoEnd(
  played: number,
  userDocumentId: string,
): Promise<void> {
  try {
    if (!userDocumentId) {
      return;
    }
    const videoDocRef = doc(db, "users", userDocumentId);
    await updateDoc(videoDocRef, {
      videoCompleted: true,
    });
  } catch (error) {
  }
}

export async function isWatched(userDocumentId: string): Promise<boolean> {
  try {
    if (!userDocumentId) {
      return false;
    }

    const videoDocRef = doc(db, "users", userDocumentId);
    const docSnap = await getDoc(videoDocRef);

    if (docSnap.exists()) {
      const videoCompleted = docSnap.data().videoCompleted || false;
      return videoCompleted;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export async function createUserDocument(
  user: User,
  userName: string,
): Promise<void> {
  const isExperimental = Math.random() < 0.5;
  const group = isExperimental ? "experimental" : "control";

  const batch = writeBatch(db);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const userRef = doc(collection(db, "users"));
  batch.set(userRef, {
    userId: user.uid,
    group: group,
    name: userName || "",
    initialSurveyComplete: false,
    demographicSurveyComplete: false,
    isSuperuser: false,
    initialSurveyIncorrectCount: 0,
    contentPreference: "text",
    lastLoginDate: currentDate,
  });

  const topicsCollectionRef = collection(db, "topics");
  try {
    const topicsSnapshot = await getDocs(
      query(topicsCollectionRef, orderBy("order")),
    );
    for (const topicDoc of topicsSnapshot.docs) {
      const topicId = topicDoc.id;

      const proficiencyRef = doc(
        collection(db, "users", userRef.id, "proficiency"),
        topicId,
      );
      batch.set(proficiencyRef, {
        proficiency: "",
      });

      const levelRef = doc(
        collection(db, "users", userRef.id, "levels"),
        topicId,
      );
      batch.set(levelRef, {
        level: 0,
      });

      const chaptersCollectionRef = collection(
        db,
        "topics",
        topicId,
        "chapters",
      );
      const chaptersSnapshot = await getDocs(chaptersCollectionRef);

      for (const chapterDoc of chaptersSnapshot.docs) {
        const chapterData = chapterDoc.data();
        const chapterId = chapterDoc.id;

        const progressData: {
          complete: boolean;
          topicId: string;
          attempts?: { [key: string]: number };
        } = {
          complete: false,
          topicId: topicId,
        };

        if (chapterData.chapterType === "assessment") {
          progressData.attempts = {
          };
        }

        const progressRef = doc(
          collection(db, "users", userRef.id, "progress"),
          chapterId,
        );
        batch.set(progressRef, progressData);
      }
    }

    await batch.commit();
  } catch (error) {
  }
}

export const findUserDocId = async (userId: string): Promise<string | null> => {
  if (!userId) {
    return null;
  }
  const q = query(collection(db, "users"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const userDoc = querySnapshot.docs[0];
  return userDoc ? userDoc.id : null;
};

export const updateProgress = async (
  userId: string,
  chapterId: string,
  timeElapsed: number,
) => {
  const progressDocRef = doc(db, "users", userId, "progress", chapterId);

  await updateDoc(progressDocRef, {
    complete: true,
    attempts: arrayUnion({ timeElapsed }),
  });
};

export async function getNextChapterId(
  order: number,
  documentId: string,
  userProficiency: number,
) {
  const topicsCollection = collection(db, "topics", documentId, "chapters");
  const q = query(topicsCollection, where("order", "==", order + 1));

  const querySnapshot = await getDocs(q);
  let nextChapterId = null;
  let nextChapterProficiency = 0;

  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
    nextChapterId = doc.id;
    nextChapterProficiency = doc.data().proficiency;
  });

  if (nextChapterProficiency > userProficiency) {
    return null;
  } else {
    return nextChapterId;
  }
}

export async function increaseLevel(topicId: string, userId: string) {
  const userDoc = doc(db, "users", userId, "levels", topicId);

  await updateDoc(userDoc, {
    level: increment(1),
  });
}

export async function initialSurveyComplete(userId: string, quizResponse: any) {
  const docId = await findUserDocId(userId);
  const userDoc = doc(db, "users", docId ? docId : "");

  await setDoc(userDoc, {
    initialSurveyComplete: true,
  });

  const surveyResponseCollection = collection(userDoc, "initialSurveyResponse");
  const surveyResponseDoc = doc(surveyResponseCollection, userId);
  await setDoc(surveyResponseDoc, {
    response: quizResponse,
  });
}

export async function demographicSurveyComplete(
  userId: string,
  quizResponse: any,
) {
  const docId = await findUserDocId(userId);
  const userDoc = doc(db, "users", docId ? docId : "");

  await updateDoc(userDoc, {
    demographicSurveyComplete: true,
  });

}

export async function numberOfTopicsCompleted(userId: string) {
  const docId = await findUserDocId(userId);
  const userDoc = doc(db, "users", docId ? docId : "");

  const topicsCollection = collection(db, "topics");
  const topicsSnapshot = await getDocs(topicsCollection);

  let completedTopicsCount = 0;

  for (const topicDoc of topicsSnapshot.docs) {
    const topicId = topicDoc.id;

    const progressCollection = collection(userDoc, "progress");
    const q = query(progressCollection, where("topicId", "==", topicId));

    const progressSnapshot = await getDocs(q);

    if (progressSnapshot.docs.every((doc) => doc.data().complete)) {
      completedTopicsCount++;
    }
  }

  return completedTopicsCount;
}

export async function isTopicComplete(userId: string, topicId: string) {
  const docId = await findUserDocId(userId);
  if (!docId) {
    return false;
  }

  const userDoc = doc(db, "users", docId);
  const progressCollection = collection(userDoc, "progress");
  const q = query(progressCollection, where("topicId", "==", topicId));

  const querySnapshot = await getDocs(q);

  let allComplete = true;
  querySnapshot.forEach((doc) => {
    if (!doc.data().complete) {
      allComplete = false;
    }
  });

  return allComplete;
}

export async function isChapterComplete(userId: string, chapterId: string) {
  const docId = await findUserDocId(userId);
  if (!docId) {
    return false;
  }

  const userDoc = doc(db, "users", docId);
  const progressDoc = doc(userDoc, "progress", chapterId);
  const progressSnapshot = await getDoc(progressDoc);

  return progressSnapshot?.data()?.complete ?? false;
}
