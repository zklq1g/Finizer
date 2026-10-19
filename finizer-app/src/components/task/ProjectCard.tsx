import React from "react";

interface ProjectCardProps {
  category: string;
  projectName: string;
  progress: number;
  progressColor?: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  category,
  projectName,
  progress,
  progressColor = "#5F33E1",
  icon,
  iconBg = "bg-[#FFE4F2]",
}) => {
  return (
    <div className="bg-white rounded-[20px] p-5 min-w-[220px] max-w-[240px] flex flex-col shadow-sm shadow-black/[0.04]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] text-[#99969E] font-medium">{category}</p>
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="text-[15px] font-semibold text-[#120D26] mt-3 leading-[1.4]">
        {projectName}
      </p>
      <div className="mt-5 w-full h-[5px] rounded-full bg-[#F2F0F5]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
    </div>
  );
};

export default ProjectCard;
