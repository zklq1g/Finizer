import React from "react";
import Image from "next/image";
import { NotificationIcon } from "../icons";

interface TopBarProps {
  userName: string;
  greeting?: string;
  avatarSrc?: string;
}

const TopBar: React.FC<TopBarProps> = ({
  userName,
  greeting = "Hello!",
  avatarSrc = "/images/avatar.png",
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-[#EDE8FB] shrink-0">
          <Image
            src={avatarSrc}
            alt={userName}
            width={50}
            height={50}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="ml-3">
          <p className="text-[14px] text-[#99969E] font-normal leading-tight">
            {greeting}
          </p>
          <p className="text-[18px] font-bold text-[#120D26] leading-tight mt-0.5">
            {userName}
          </p>
        </div>
      </div>
      <div className="relative w-10 h-10 flex items-center justify-center">
        <NotificationIcon className="w-[24px] h-[24px] text-[#120D26]" />
        <div className="absolute top-1 right-1 w-[9px] h-[9px] bg-[#5F33E1] rounded-full border-[1.5px] border-[#F9F9FB]" />
      </div>
    </div>
  );
};

export default TopBar;
