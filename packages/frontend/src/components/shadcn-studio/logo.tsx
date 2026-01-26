import equiDutyIcon from "@/assets/images/equiduty-icon.png";

// Util Imports
import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src={equiDutyIcon} alt="EquiDuty" className="h-9 w-9 rounded-lg" />
      <span className="text-xl font-semibold text-[#3d5a45]">EquiDuty</span>
    </div>
  );
};

export default Logo;
