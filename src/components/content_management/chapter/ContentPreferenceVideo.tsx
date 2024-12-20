import ReactPlayer from "react-player";
import { Chapter } from "../../../types";
import { DocumentData } from "firebase/firestore";
import { handleVideoEnd as handleVideoEndFromFirebase } from "~/components/firebase/FirebaseFunctions";

interface ContentPreferenceVideoProps {
  userGroup: string;
  chapter: Chapter;
  userProficiency: string;
  userDocument: DocumentData | null;
  setPlayed: React.Dispatch<React.SetStateAction<number>>;
  setIsVideoWatched: React.Dispatch<React.SetStateAction<boolean>>;
  played: number;
  contentPreference: string;
}

const ContentPreferenceVideo: React.FC<ContentPreferenceVideoProps> = ({
  userGroup,
  chapter,
  userProficiency,
  userDocument,
  setPlayed,
  setIsVideoWatched,
  played,
  contentPreference,
}) => {
  if (contentPreference !== "video" || chapter.chapterType === "assessment") {
    return null;
  }

  return (
    <div className="flex h-[525px] flex-grow justify-center px-0 pt-0 lg:px-36 lg:pt-10">
      <ReactPlayer
        url={
          userGroup === "control"
            ? chapter.controlGroupVideoURLs?.[
                userProficiency as keyof typeof chapter.controlGroupVideoURLs
              ]
            : chapter.experimentalGroupVideoURLs?.[
                userProficiency as keyof typeof chapter.experimentalGroupVideoURLs
              ]
        }
        onProgress={(progress) => {
          setPlayed(progress.playedSeconds);
        }}
        className="h-full rounded border-4 border-slate-400 shadow-lg"
        width="100%"
        height="100%"
        allowFullScreen
        controls={false}
        onEnded={() => {
          const playedMinutes = Math.floor(played / 60);
          handleVideoEndFromFirebase(playedMinutes, userDocument?.id);
          setIsVideoWatched(true);
        }}
        seekTo={20}
      />
    </div>
  );
};

export default ContentPreferenceVideo;
