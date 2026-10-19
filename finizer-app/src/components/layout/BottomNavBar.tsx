import React from "react";
import {
  HomeIcon,
  CalendarIcon,
  DocumentIcon,
  ProfileIcon,
  AddIcon,
} from "../icons";

interface BottomNavBarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onAddClick?: () => void;
}

const tabs = [
  { id: "home", icon: HomeIcon },
  { id: "calendar", icon: CalendarIcon },
  { id: "add", icon: null },
  { id: "document", icon: DocumentIcon },
  { id: "profile", icon: ProfileIcon },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = "home",
  onTabChange,
  onAddClick,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-[375px] mx-auto relative pointer-events-auto">
        {/* Frosted gradient background matching Figma lavender fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28"
          style={{
            background:
              "linear-gradient(180deg, rgba(237,232,251,0) 0%, rgba(237,232,251,0.5) 30%, rgba(225,213,250,0.75) 60%, rgba(210,196,250,0.85) 100%)",
          }}
        />
        <div className="relative pt-10 pb-5 px-6">
          {/* Center floating add button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1">
            <button
              onClick={onAddClick}
              className="w-[56px] h-[56px] bg-[#5F33E1] rounded-full flex items-center justify-center shadow-xl shadow-[#5F33E1]/40 active:scale-95 transition-transform"
            >
              <AddIcon className="w-6 h-6 text-white" />
            </button>
          </div>
          {/* Nav icons */}
          <div className="flex items-center justify-between">
            {tabs.map((tab) => {
              if (tab.id === "add") {
                return <div key={tab.id} className="w-14" />;
              }
              const Icon = tab.icon!;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className="flex flex-col items-center justify-center w-12 h-12 transition-colors"
                >
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                      isActive ? "text-[#5F33E1]" : "text-[#C6C2D0]"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomNavBar;
