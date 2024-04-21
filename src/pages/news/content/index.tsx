import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { auth } from "~/components/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import NewsCard from "~/components/content_management/news/NewsCard";

const CyberSecurityNews = () => {
  const [user, loading, error] = useAuthState(auth);
  const [articles, setArticles] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const fetchNews = useCallback(async () => {
    if (!user || loading) return;

    try {
      // Fetch news from News API
      const response = await axios.get(
        `https://newsapi.org/v2/everything?q=cybersecurity&apiKey=${process.env.NEXT_PUBLIC_NEWS_KEY}`,
      );
      const articles = response.data.articles;

      for (let i = articles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [articles[i], articles[j]] = [articles[j], articles[i]];
      }

      if (articles.length > 0) {
        setArticles(articles.slice(0, 10)); // Get the first 10 articles
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    }
  }, [user, loading]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>You do not have access to this page</p>
      </div>
    );
  }

  return (
    <div className="mb-7 flex min-h-screen flex-col bg-gray-800 text-white">
      <div className="w-full p-4">
        <button
          onClick={() => router.push("/")}
          className="rounded bg-blue-800 px-4 py-2 font-bold text-white hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
      <div className="mx-auto my-auto max-w-6xl overflow-hidden rounded-xl bg-white p-6 text-black shadow-md">
        <h1 className="mb-6 text-3xl font-semibold">Cybersecurity News</h1>
        {articles.map((article, index) => (
          <NewsCard
            key={index}
            urlToImage={(article as any).urlToImage}
            title={(article as any).title}
            url={(article as any).url}
            description={(article as any).description}
          />
        ))}
        <button
          onClick={() => router.reload()}
          className="mt-4 rounded bg-blue-800 px-4 py-2 text-lg font-bold text-white transition duration-300 hover:bg-blue-700"
        >
          Refresh List of Articles
        </button>
      </div>
    </div>
  );
};

export default CyberSecurityNews;
