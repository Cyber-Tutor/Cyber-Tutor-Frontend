import React, { useState, ChangeEvent, FormEvent } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useTopics } from "../../hooks/useTopics";
import { useChapters } from "../../hooks/useChapters";

interface ControlGroupFormProps {
  topicId: string;
}

type Proficiency = "beginner" | "intermediate" | "expert";

const ControlGroupForm: React.FC<ControlGroupFormProps> = ({ topicId }) => {
  const topics = useTopics();
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const chapters = useChapters(selectedTopicId);
  const [updatedContent, setUpdatedContent] = useState<Record<Proficiency, string>>({
    beginner: "",
    intermediate: "",
    expert: "",
  });
  const [updatedVideoURLs, setUpdatedVideoURLs] = useState<Record<Proficiency, string>>({
    beginner: "",
    intermediate: "",
    expert: "",
  });
  const [updatedImageURLs, setUpdatedImageURLs] = useState<string[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const handleContentChange = (proficiency: Proficiency, e: ChangeEvent<HTMLTextAreaElement>) => {
    setUpdatedContent((prev) => ({ ...prev, [proficiency]: e.target.value }));
  };

  const handleChapterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const chapterId = e.target.value;
    setSelectedChapterId(chapterId);
    const selectedChapter = chapters.find((chapter) => chapter.chapterId === chapterId);

    if (selectedChapter) {
      setUpdatedContent(selectedChapter.controlGroupContent || {
        beginner: "",
        intermediate: "",
        expert: "",
      });
      setUpdatedVideoURLs(selectedChapter.controlGroupVideoURLs || {
        beginner: "",
        intermediate: "",
        expert: "",
      });
      setUpdatedImageURLs(selectedChapter.controlGroupImageURLs || []);
    } else {
      resetFields();
    }
  };

  const resetFields = () => {
    setUpdatedContent({ beginner: "", intermediate: "", expert: "" });
    setUpdatedVideoURLs({ beginner: "", intermediate: "", expert: "" });
    setUpdatedImageURLs([]);
  };

  const handleAddImageUrl = () => setUpdatedImageURLs((prev) => [...prev, ""]);

  const handleImageUrlChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const newUrls = [...updatedImageURLs];
    newUrls[index] = e.target.value;
    setUpdatedImageURLs(newUrls);
  };

  const handleVideoUrlChange = (proficiency: Proficiency, e: ChangeEvent<HTMLInputElement>) => {
    setUpdatedVideoURLs((prev) => ({ ...prev, [proficiency]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;

    try {
      await updateDoc(
        doc(db, `topics/${selectedTopicId}/chapters`, selectedChapterId),
        {
          controlGroupContent: updatedContent,
          controlGroupImageURLs: updatedImageURLs,
          controlGroupVideoURLs: updatedVideoURLs,
        },
      );
      setFeedbackMessage("Control group content updated successfully.");
    } catch (error) {
      console.error("Error updating control group content:", error);
      setFeedbackMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
        <div className="col-span-1 flex flex-col space-y-4">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
            Select Topic:
          </label>
          <select
            id="topic"
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="block w-full rounded-md border px-3 py-2 shadow-sm sm:text-sm"
          >
            <option value="">Select a Topic</option>
            {topics.map((topic) => (
              <option key={topic.topicId} value={topic.topicId}>
                {topic.topicTitle}
              </option>
            ))}
          </select>

          <label htmlFor="chapter" className="block text-sm font-medium text-gray-700">
            Select Chapter:
          </label>
          <select
            id="chapter"
            onChange={handleChapterChange}
            disabled={!selectedTopicId}
            className="block w-full rounded-md border px-3 py-2 shadow-sm sm:text-sm"
          >
            <option value="">Select a Chapter</option>
            {chapters
              .filter((chapter) => chapter.chapterType !== "assessment")
              .map((chapter) => (
                <option key={chapter.chapterId} value={chapter.chapterId}>
                  {chapter.chapterTitle}
                </option>
              ))}
          </select>

          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-700"
          >
            Update Control Group Content
          </button>
        </div>

        {selectedChapterId && (
          <div className="col-span-3">
            {(["beginner", "intermediate", "expert"] as Proficiency[]).map((proficiency) => (
              <div key={proficiency} className="mb-4">
                <label
                  htmlFor={`content-${proficiency}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Control Group Content ({proficiency}):
                </label>
                <textarea
                  id={`content-${proficiency}`}
                  value={updatedContent[proficiency]}
                  onChange={(e) => handleContentChange(proficiency, e)}
                  className="block w-full rounded-md border p-2 text-sm"
                />
                <label
                  htmlFor={`videoUrl-${proficiency}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Control Group Video URL ({proficiency}):
                </label>
                <input
                  id={`videoUrl-${proficiency}`}
                  value={updatedVideoURLs[proficiency]}
                  onChange={(e) => handleVideoUrlChange(proficiency, e)}
                  className="block w-full rounded-md border p-2 text-sm"
                />
              </div>
            ))}

            <div className="mt-4">
              <h3 className="text-sm font-medium">Control Group Image URLs:</h3>
              {updatedImageURLs.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    value={url}
                    onChange={(e) => handleImageUrlChange(index, e)}
                    className="flex-grow rounded-md border p-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="mt-2 text-blue-500 hover:text-blue-700"
              >
                Add Image URL
              </button>
            </div>
          </div>
        )}
      </form>

      {feedbackMessage && <div className="mt-4 text-green-500">{feedbackMessage}</div>}
    </div>
  );
};

export default ControlGroupForm;
