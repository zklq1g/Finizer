import React from "react";
import StatusBadge from "../ui/StatusBadge";
import { TimeCircleIcon } from "../icons";

interface TaskCardProps {
  projectName: string;
  taskName: string;
  time: string;
  status: "done" | "in-progress" | "todo";
  icon?: React.ReactNode;
  iconBg?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  projectName,
  taskName,
  time,
  status,
  icon,
  iconBg = "bg-[#FFE4F2]",
}) => {
  return (
    <div className="bg-white rounded-[20px] px-5 py-[18px] shadow-sm shadow-black/[0.03]">
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-[#99969E] leading-tight">{projectName}</p>
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 ml-3`}
          >
            {icon}
          </div>
        )}
      </div>
      <h3 className="text-[17px] font-bold text-[#120D26] mt-2 leading-snug">
        {taskName}
      </h3>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-[6px]">
          <TimeCircleIcon className="w-[18px] h-[18px] text-[#5F33E1]" />
          <span className="text-[13px] font-medium text-[#5F33E1]">{time}</span>
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
};

export default TaskCard;
