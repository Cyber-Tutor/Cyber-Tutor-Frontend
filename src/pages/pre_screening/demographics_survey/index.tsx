import { getAuth } from "firebase/auth";
import {
  doc,
  getDocs,
  collection,
  getFirestore,
  writeBatch,
  setDoc,
  updateDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import * as Survey from "survey-react";
import { db } from "../../../components/firebase/config";
import queryUserDocument, {
  demographicSurveyComplete,
} from "~/components/firebase/FirebaseFunctions";
import Head from "next/head";

Survey.StylesManager.applyTheme("default");

export default function SurveyComponent(): JSX.Element {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [surveyJson, setSurveyJson] = useState<Survey.Model | null>(null);

  useEffect(() => {
    const fetchSurveyJson = async () => {
      const surveyCollectionRef = collection(db, "demographicSurveyQuestions");
      const surveyDocsSnapshot = await getDocs(surveyCollectionRef);

      const surveyQuestions = surveyDocsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        const { question, choices } = data;
        return {
          type: "radiogroup",
          name: docSnapshot.id,
          title: question,
          isRequired: true,
          choices: Object.keys(choices).map((key) => ({
            value: key,
            text: choices[key],
          })),
        };
      });

      const surveyJson = {
        title: "Demographic Survey",
        showProgressBar: "bottom",
        pages: [{ elements: surveyQuestions }],
      };

      setSurveyJson(new Survey.Model(surveyJson));
    };

    fetchSurveyJson();
  }, []);

  const onComplete = async (surveyResult: Survey.Model) => {
    setIsComplete(true);
    const surveyData = surveyResult.data;
    setResult(surveyData);

    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const batch = writeBatch(db);

      Object.entries(surveyData).forEach(([questionId, answerKey]) => {
        const userResponseDocRef = doc(
          db,
          "demographicSurveyQuestions",
          questionId,
          "users",
          user.uid,
        );
        batch.set(userResponseDocRef, { answer: answerKey });
      });

      try {
        await batch.commit();

        const lastQuestionId = Object.keys(surveyData).pop();
        const answerKey = lastQuestionId ? surveyData[lastQuestionId] : null;

        let contentPreference = null;
        if (lastQuestionId && answerKey) {
          const questionDocRef = doc(
            db,
            "demographicSurveyQuestions",
            lastQuestionId,
          );
          const questionDocSnapshot = await getDoc(questionDocRef);
          if (questionDocSnapshot.exists()) {
            const questionData = questionDocSnapshot.data();
            contentPreference = questionData.choices[answerKey];
          }
        }

        const userQuery = query(
          collection(db, "users"),
          where("userId", "==", user.uid),
        );
        const querySnapshot = await getDocs(userQuery);
        let userDocRef = null;
        querySnapshot.forEach((doc) => {
          userDocRef = doc.ref;
        });

        if (userDocRef && contentPreference) {
          await updateDoc(userDocRef, { contentPreference });
        }

        await demographicSurveyComplete(user.uid, surveyData);
        router.push("/");
      } catch (error) {
      }
    } else {
    }
  };

  return (
    <div>
      <Head>
        <title>Demographic Survey</title>
      </Head>
      {surveyJson ? (
        <Survey.Survey model={surveyJson} onComplete={onComplete} />
      ) : (
        <div>Loading survey...</div>
      )}
    </div>
  );
}
