"use client";
import React, { useState } from "react";
import WelcomeScreen from "../../screens/WelcomeScreen";
import HomeScreen from "../../screens/HomeScreen";
import TodayTasksScreen from "../../screens/TodayTasksScreen";
import AddProjectScreen from "../../screens/AddProjectScreen";
import IconsGalleryScreen from "../../screens/IconsGalleryScreen";
import QuickAddSheet, { TransactionData } from "../../components/sheets/QuickAddSheet";
import Link from "next/link";

type Screen = "welcome" | "home" | "tasks" | "add-project" | "icons";

export default function DevPreviewPage() {
  const [screen, setScreen] = useState<Screen>("icons");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex flex-col items-center justify-center p-4">
      <div className="mb-3 text-center">
        <Link
          href="/"
          className="text-xs font-bold text-[#5F33E1] hover:underline bg-white px-3 py-1 rounded-full shadow-sm"
        >
          ← Go to Original Finizer App
        </Link>
        <p className="text-[11px] text-gray-500 mt-1">
          Component Lab & Figma Screen Sandbox
        </p>
      </div>

      {/* Phone frame */}
      <div className="relative w-[375px] h-[812px] shadow-2xl rounded-[40px] overflow-hidden border-4 border-gray-800 bg-white flex flex-col">
        {/* Screen switcher */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between bg-black/85 px-3 py-1.5 text-[9px] backdrop-blur-sm">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {(["icons", "home", "tasks", "welcome", "add-project"] as Screen[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setScreen(s)}
                  className={`px-2 py-0.5 rounded text-white font-mono whitespace-nowrap transition-colors ${
                    screen === s
                      ? "bg-[#5F33E1] font-bold"
                      : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  {s}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="bg-[#5F33E1] text-white font-bold px-2 py-0.5 rounded text-[9px] hover:bg-[#5029C9] ml-2 shrink-0"
          >
            + Sheet
          </button>
        </div>

        {/* Screens */}
        <div className="flex-1 h-full overflow-y-auto pt-6">
          {screen === "welcome" && (
            <WelcomeScreen onGetStarted={() => setScreen("home")} />
          )}
          {screen === "home" && (
            <HomeScreen
              userName="Livia Vaccaro"
              onAddClick={() => setIsQuickAddOpen(true)}
            />
          )}
          {screen === "tasks" && (
            <TodayTasksScreen
              onBack={() => setScreen("home")}
              onAddClick={() => setIsQuickAddOpen(true)}
            />
          )}
          {screen === "add-project" && (
            <AddProjectScreen
              onBack={() => setScreen("home")}
              onSubmit={(data) => {
                console.log("New project:", data);
                setScreen("home");
              }}
            />
          )}
          {screen === "icons" && <IconsGalleryScreen />}
        </div>

        <QuickAddSheet
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSubmit={(d) => console.log(d)}
        />
      </div>
    </div>
  );
}
