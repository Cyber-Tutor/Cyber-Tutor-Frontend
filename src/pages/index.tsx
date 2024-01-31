import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

import courses from '../../public/testing-data/courses.json'

import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";

import { api } from "~/utils/api";

export default function Home() {
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
                  {courses.map((course) => (
                    <MenuItem key={course.title}>{course.title}</MenuItem>
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
          <p className="text-2xl text-black">
            {hello.data ? hello.data.greeting : "Loading tRPC query..."}
          </p>
        </div>
      </main>
    </>
  );
}