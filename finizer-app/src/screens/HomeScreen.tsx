"use client";
import React from "react";
import TopBar from "../components/layout/TopBar";
import ProgressCard from "../components/dashboard/ProgressCard";
import ProjectCard from "../components/task/ProjectCard";
import ProgressRing from "../components/ui/ProgressRing";
import BottomNavBar from "../components/layout/BottomNavBar";
import {
  BriefcaseIcon,
  UserOctagonIcon,
  BookIcon,
} from "../components/icons";

interface HomeScreenProps {
  userName?: string;
  onAddClick?: () => void;
}

// ── Purple shade system ──────────────────────────
// purple-700 #4A27B3  purple-500 #5F33E1
// purple-400 #7C5CE8  purple-300 #9F87EF
// purple-200 #C5B8F6  purple-100 #EDE8FB  purple-50 #F5F2FF

const taskGroups = [
  {
    name: "Office Project",
    tasks: 23,
    percentage: 70,
    ringColor: "#5F33E1",    // purple-500
    iconBg: "bg-[#EDE8FB]",  // purple-100
    icon: <BriefcaseIcon className="w-5 h-5 text-[#5F33E1]" />,
  },
  {
    name: "Personal Project",
    tasks: 30,
    percentage: 52,
    ringColor: "#7C5CE8",    // purple-400
    iconBg: "bg-[#EDE8FB]",
    icon: <UserOctagonIcon className="w-5 h-5 text-[#7C5CE8]" />,
  },
  {
    name: "Daily Study",
    tasks: 30,
    percentage: 87,
    ringColor: "#9F87EF",    // purple-300
    iconBg: "bg-[#F5F2FF]",  // purple-50
    icon: <BookIcon className="w-5 h-5 text-[#9F87EF]" />,
  },
  {
    name: "Daily Study",
    tasks: 30,
    percentage: 92,
    ringColor: "#C5B8F6",    // purple-200
    iconBg: "bg-[#F5F2FF]",
    icon: <BookIcon className="w-5 h-5 text-[#C5B8F6]" />,
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  userName = "Livia Vaccaro",
  onAddClick,
}) => {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 90% 0%, rgba(197,184,246,0.25) 0%, transparent 45%),
            radial-gradient(ellipse at 0% 10%, rgba(197,184,246,0.15) 0%, transparent 35%),
            radial-gradient(ellipse at 0% 80%, rgba(225,213,250,0.2) 0%, transparent 40%),
            radial-gradient(ellipse at 100% 100%, rgba(197,184,246,0.15) 0%, transparent 30%),
            #F9F9FB
          `,
        }}
      />

      <div className="relative z-10 px-6 pt-6 pb-32 overflow-y-auto">
        <TopBar userName={userName} avatarSrc="/images/avatar.png" />

        <div className="mt-7">
          <ProgressCard percentage={85} />
        </div>

        {/* In Progress */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-[#120D26]">In Progress</h2>
            <span className="text-[14px] font-semibold text-[#5F33E1]">6</span>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            {/* purple-500 progress bar */}
            <ProjectCard
              category="Office Project"
              projectName={"Grocery shopping app\ndesign"}
              progress={60}
              progressColor="#5F33E1"
              icon={<BriefcaseIcon className="w-5 h-5 text-[#5F33E1]" />}
              iconBg="bg-[#EDE8FB]"
            />
            {/* purple-400 progress bar */}
            <ProjectCard
              category="Personal Project"
              projectName={"Uber Eats redesign\nchallange"}
              progress={45}
              progressColor="#7C5CE8"
              icon={<UserOctagonIcon className="w-5 h-5 text-[#7C5CE8]" />}
              iconBg="bg-[#EDE8FB]"
            />
          </div>
        </div>

        {/* Task Groups */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-[#120D26]">Task Groups</h2>
            <span className="text-[14px] font-semibold text-[#5F33E1]">4</span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {taskGroups.map((group, index) => (
              <div
                key={index}
                className="bg-white rounded-[20px] p-4 flex items-center shadow-sm shadow-black/[0.03]"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${group.iconBg} flex items-center justify-center shrink-0`}
                >
                  {group.icon}
                </div>
                <div className="flex-1 ml-4">
                  <p className="text-[15px] font-semibold text-[#120D26]">
                    {group.name}
                  </p>
                  <p className="text-[13px] text-[#99969E] mt-0.5">
                    {group.tasks} Tasks
                  </p>
                </div>
                <ProgressRing
                  percentage={group.percentage}
                  size={50}
                  strokeWidth={4}
                  color={group.ringColor}
                  trackColor="#F2F0F5"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavBar activeTab="home" onAddClick={onAddClick} />
    </div>
  );
};

export default HomeScreen;
