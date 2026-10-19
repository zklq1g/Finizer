import React from "react";
import ProgressRing from "../ui/ProgressRing";
import { MoreIcon } from "../icons";

interface ProgressCardProps {
  percentage: number;
  onViewTask?: () => void;
}

const ProgressCard: React.FC<ProgressCardProps> = ({
  percentage,
  onViewTask,
}) => {
  return (
    <div className="bg-[#5F33E1] rounded-3xl p-6 flex items-center justify-between relative shadow-xl shadow-[#5F33E1]/20">
      <div className="flex-1 pr-4">
        <p className="text-white/90 font-medium text-[15px] leading-[1.5]">
          Your today{"\u2019"}s task
          <br />
          almost done!
        </p>
        <button
          onClick={onViewTask}
          className="mt-5 bg-white text-[#5F33E1] rounded-full px-7 py-2.5 text-[13px] font-bold tracking-wide shadow-sm hover:shadow-md transition-shadow"
        >
          View Task
        </button>
      </div>
      <div className="ml-2">
        <ProgressRing
          percentage={percentage}
          size={90}
          strokeWidth={7}
          color="white"
          trackColor="rgba(255,255,255,0.25)"
          textColor="white"
        />
      </div>
      <button className="absolute top-5 right-5 w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
        <MoreIcon className="w-4 h-4 text-white/80" />
      </button>
    </div>
  );
};

export default ProgressCard;
