"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-white">
     <h1 className="text-4xl">Reviewly</h1>
     <p>It&apos;s Running Smoothly.</p>
    </main>

}