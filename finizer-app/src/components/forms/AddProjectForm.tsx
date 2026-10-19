"use client";
import React, { useState } from "react";
import CategoryTag from "../ui/CategoryTag";
import InputField from "../ui/InputField";
import DateField from "../ui/DateField";
import Button from "../ui/Button";
import { BriefcaseIcon } from "../icons";

interface AddProjectFormProps {
  onSubmit?: (data: {
    taskGroup: string;
    projectName: string;
    description: string;
    startDate: string;
    endDate: string;
  }) => void;
}

const AddProjectForm: React.FC<AddProjectFormProps> = ({ onSubmit }) => {
  const [projectName, setProjectName] = useState("Grocery Shopping App");
  const [description, setDescription] = useState(
    "This application is designed for super shops. By using this application they can enlist all their products in one place and can deliver. Customers will get a one-stop solution for their daily shopping."
  );

  const handleSubmit = () => {
    onSubmit?.({
      taskGroup: "Work",
      projectName,
      description,
      startDate: "01 May, 2022",
      endDate: "30 June, 2022",
    });
  };

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Task Group */}
      <CategoryTag
        label="Task Group"
        value="Work"
        icon={<BriefcaseIcon className="w-5 h-5 text-[#5F33E1]" />}
        iconBg="bg-[#EDE8FB]"
      />

      {/* Project Name */}
      <InputField
        label="Project Name"
        value={projectName}
        onChange={setProjectName}
      />

      {/* Description */}
      <InputField
        label="Description"
        value={description}
        onChange={setDescription}
        multiline
      />

      {/* Start Date */}
      <DateField label="Star Date" value="01 May, 2022" />

      {/* End Date */}
      <DateField label="End Date" value="30 June, 2022" />

      {/* Logo Section */}
      <div className="bg-white rounded-[20px] p-5 flex items-center shadow-sm shadow-black/[0.03]">
        <div className="w-14 h-14 rounded-full bg-[#009688] flex items-center justify-center shrink-0 overflow-hidden">
          <div className="text-center leading-tight">
            <span className="text-white text-[9px] font-bold block">Grocery</span>
            <span className="text-[#FF9800] text-[9px] font-bold block">shop!</span>
          </div>
        </div>
        <div className="ml-4">
          <span className="text-[16px] font-bold text-[#5F33E1] block leading-tight">
            Grocery
          </span>
          <span className="text-[16px] font-bold text-[#FB8500] block leading-tight">
            shop
          </span>
        </div>
        <div className="ml-auto">
          <Button variant="outline">Change Logo</Button>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-4 pb-2">
        <Button onClick={handleSubmit}>Add Project</Button>
      </div>
    </div>
  );
};

export default AddProjectForm;
