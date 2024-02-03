import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";

import topics from "../../public/testing-data/topics.json";

import { api } from "~/utils/api";

type Topic = {
  title: string;
  description: string;
  chapters: Chapter[];
};

type Chapter = {
  title: string;
  description: string;
};

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const hello = api.post.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Welcome to Cyber Tutor!</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen items-stretch bg-slate-50">
        <div className="flex h-screen flex-col items-center bg-slate-400">
          <div className="flex h-full flex-col justify-between">
            <Sidebar className="flex h-full flex-col">
              <Menu>
                <MenuItem className="flex flex-col justify-center text-center">
                  <div className="flex items-center justify-center">
                    <Image
                      src="/Cyber-Tutor_Logo.png"
                      alt="Cyber Tutor Logo"
                      width={50}
                      height={50}
                      layout="fixed"
                    />
                    <span className="font-mono">Cyber Tutor</span>
                  </div>
                </MenuItem>
                <SubMenu label="Sections">
                  {/* add real data when we have it */}
                  {topics.map((topic) => (
                    <MenuItem
                      key={topic.title}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic.title}
                    </MenuItem>
                  ))}
                </SubMenu>
              </Menu>
            </Sidebar>
            <div>
              <Menu className="text-center">
                {/* What we want here, is when the user clicks on this area: */}
                {/* If logged in: Profile, Logout */}
                {/* If logged out: Login, Register */}
                <MenuItem> PUT USER STUFF HERE </MenuItem>
              </Menu>
            </div>
          </div>
        </div>
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          {selectedTopic ? (
            <>
              <h1 className="text-3xl font-bold">{selectedTopic.title}</h1>
              <p className="text-lg">{selectedTopic.description}</p>
              <h2 className="text-2xl font-bold">Chapters</h2>
              {selectedTopic.chapters.map((chapter, index) => (
                <div key={index} className="flex justify-between gap-12">
                  <p className="text-lg">{chapter.title}</p>
                  <p className="text-lg">{chapter.description}</p>
                </div>
              ))}
            </>
          ) : (
            <p>Select a topic from the menu.</p>
          )}
        </div>
      </main>
    </>
  );
}
