"use client";
import React from "react";
import AddProjectForm from "../components/forms/AddProjectForm";
import { ArrowLeftIcon, NotificationIcon } from "../components/icons";

interface AddProjectScreenProps {
  onBack?: () => void;
  onSubmit?: (data: any) => void;
}

const AddProjectScreen: React.FC<AddProjectScreenProps> = ({
  onBack,
  onSubmit,
}) => {
  return (
    <div className="relative min-h-screen">
      {/* Background gradient matching Figma */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 90% 0%, rgba(255, 249, 196, 0.35) 0%, transparent 45%),
            radial-gradient(ellipse at 0% 10%, rgba(200, 230, 201, 0.25) 0%, transparent 35%),
            radial-gradient(ellipse at 0% 85%, rgba(225, 213, 250, 0.25) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 100%, rgba(255, 249, 196, 0.25) 0%, transparent 30%),
            #F9F9FB
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 pt-6 pb-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center -ml-1"
          >
            <ArrowLeftIcon className="w-6 h-6 text-[#120D26]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#120D26]">Add Project</h1>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <NotificationIcon className="w-6 h-6 text-[#120D26]" />
            <div className="absolute top-1 right-1 w-[9px] h-[9px] bg-[#5F33E1] rounded-full border-[1.5px] border-[#F9F9FB]" />
          </div>
        </div>

        {/* Form */}
        <div className="mt-7">
          <AddProjectForm onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
};

export default AddProjectScreen;
