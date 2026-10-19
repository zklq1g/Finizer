"use client";
import React, { useState } from "react";
import WeekCalendarStrip from "../components/dashboard/WeekCalendarStrip";
import TaskCard from "../components/task/TaskCard";
import BottomNavBar from "../components/layout/BottomNavBar";
import {
  ArrowLeftIcon,
  NotificationIcon,
  BriefcaseIcon,
  UserOctagonIcon,
  BookIcon,
} from "../components/icons";

interface TodayTasksScreenProps {
  onAddClick?: () => void;
  onBack?: () => void;
}

const days = [
  { month: "May", day: 23, dayName: "Fri" },
  { month: "May", day: 24, dayName: "Sat" },
  { month: "May", day: 25, dayName: "Sun", isActive: true },
  { month: "May", day: 26, dayName: "Mon" },
  { month: "May", day: 27, dayName: "Tue" },
];

const filters = ["All", "To do", "In Progress", "Completed"];

// Icon badge colours — purple shades only
// purple-500 #5F33E1  purple-400 #7C5CE8  purple-300 #9F87EF
// purple-100 #EDE8FB  purple-50  #F5F2FF

const tasks = [
  {
    projectName: "Grocery shopping app design",
    taskName: "Market Research",
    time: "10:00 AM",
    status: "done" as const,
    icon: <BriefcaseIcon className="w-5 h-5 text-[#5F33E1]" />,
    iconBg: "bg-[#EDE8FB]",
  },
  {
    projectName: "Grocery shopping app design",
    taskName: "Competitive Analysis",
    time: "12:00 PM",
    status: "in-progress" as const,
    icon: <BriefcaseIcon className="w-5 h-5 text-[#7C5CE8]" />,
    iconBg: "bg-[#EDE8FB]",
  },
  {
    projectName: "Uber Eats redesign challange",
    taskName: "Create Low-fidelity Wireframe",
    time: "07:00 PM",
    status: "todo" as const,
    icon: <UserOctagonIcon className="w-5 h-5 text-[#4A27B3]" />,
    iconBg: "bg-[#F5F2FF]",
  },
  {
    projectName: "About design sprint",
    taskName: "How to pitch a Design Sprint",
    time: "09:00 PM",
    status: "todo" as const,
    icon: <BookIcon className="w-5 h-5 text-[#9F87EF]" />,
    iconBg: "bg-[#F5F2FF]",
  },
];

const TodayTasksScreen: React.FC<TodayTasksScreenProps> = ({
  onAddClick,
  onBack,
}) => {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 90% 0%, rgba(197,184,246,0.25) 0%, transparent 45%),
            radial-gradient(ellipse at 0% 10%, rgba(197,184,246,0.15) 0%, transparent 35%),
            radial-gradient(ellipse at 0% 80%, rgba(225,213,250,0.2) 0%, transparent 40%),
            #F9F9FB
          `,
        }}
      />

      <div className="relative z-10 px-6 pt-6 pb-32 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-1">
            <ArrowLeftIcon className="w-6 h-6 text-[#120D26]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#120D26]">
            Today{"\u2019"}s Tasks
          </h1>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <NotificationIcon className="w-6 h-6 text-[#120D26]" />
            <div className="absolute top-1 right-1 w-[9px] h-[9px] bg-[#5F33E1] rounded-full border-[1.5px] border-[#F9F9FB]" />
          </div>
        </div>

        {/* Calendar */}
        <div className="mt-7">
          <WeekCalendarStrip days={days} />
        </div>

        {/* Filters */}
        <div className="mt-7 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                activeFilter === filter
                  ? "bg-[#5F33E1] text-white shadow-md shadow-[#5F33E1]/20"
                  : "bg-white text-[#5F33E1] border border-[#EDE8FB] shadow-sm shadow-black/[0.03]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        <div className="mt-7 flex flex-col gap-4">
          {tasks.map((task, index) => (
            <TaskCard
              key={index}
              projectName={task.projectName}
              taskName={task.taskName}
              time={task.time}
              status={task.status}
              icon={task.icon}
              iconBg={task.iconBg}
            />
          ))}
        </div>
      </div>

      <BottomNavBar activeTab="calendar" onAddClick={onAddClick} />
    </div>
  );
};

export default TodayTasksScreen;
