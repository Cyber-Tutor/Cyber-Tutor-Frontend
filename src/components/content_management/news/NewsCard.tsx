// NewsCard.tsx
import React from "react";
import { FaBook } from "react-icons/fa";

interface NewsCardProps {
  urlToImage: string;
  title: string;
  url: string;
  description: string;
}

const NewsCard: React.FC<NewsCardProps> = ({
  urlToImage,
  title,
  url,
  description,
}) => {
  return (
    <div className="mx-auto mb-6 flex h-auto max-w-6xl flex-col overflow-hidden rounded-lg shadow-lg md:flex-row">
      {urlToImage ? (
        <div className="relative h-64 flex-none md:h-auto md:w-1/2">
          <img
            src={urlToImage}
            alt="Article"
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
            style={{ padding: "10px" }}
          />
        </div>
      ) : null}
      <div
        className={`flex flex-auto flex-col justify-between p-6 ${!urlToImage ? "items-center text-center" : ""}`}
      >
        <h2 className="mb-4 text-2xl font-semibold md:text-3xl">{title}</h2>
        <p className="text-md mb-4 md:text-lg">{description}</p>
        <div className={`mt-4 w-full ${!urlToImage ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => window.open(url, "_blank")}
            className="flex w-full items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-lg font-bold leading-none text-white transition duration-300 hover:bg-blue-700 md:w-auto md:text-xl"
          >
            <FaBook className="mr-2" /> Read More
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;