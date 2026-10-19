import React from "react";

interface StatusBadgeProps {
  status: "done" | "in-progress" | "todo";
}

// Single purple colour system — different shades per status
const statusConfig = {
  done:          { text: "Done",        color: "text-[#5F33E1]" },   // purple-500
  "in-progress": { text: "In Progress", color: "text-[#7C5CE8]" },   // purple-400
  todo:          { text: "To-do",       color: "text-[#9F87EF]" },   // purple-300
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <span className={`text-xs font-semibold ${config.color}`}>
      {config.text}
    </span>
  );
};

export default StatusBadge;
