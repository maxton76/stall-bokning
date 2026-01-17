import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssistantChat } from "./AssistantChat";
import { usePwa } from "@/hooks/usePwa";

interface AssistantButtonProps {
  className?: string;
}

export function AssistantButton({ className }: AssistantButtonProps) {
  const { t } = useTranslation("assistant");
  const [open, setOpen] = useState(false);
  const { isOnline } = usePwa();

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={`fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg ${
                open ? "hidden" : ""
              } ${className}`}
              onClick={() => setOpen(true)}
              disabled={!isOnline}
            >
              <Sparkles className="h-6 w-6" />
              <span className="sr-only">{t("openAssistant")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isOnline ? t("title") : t("offline")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AssistantChat open={open} onOpenChange={setOpen} />
    </>
  );
}

export default AssistantButton;
