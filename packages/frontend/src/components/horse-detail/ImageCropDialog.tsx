import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCroppedImage } from "@/utils/imageUtils";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onConfirm: (croppedBlob: Blob) => void;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onConfirm,
}: ImageCropDialogProps) {
  const { t } = useTranslation(["horses", "common"]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const blob = await createCroppedImage(imageSrc, croppedAreaPixels);
      onConfirm(blob);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state when closing
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
    onOpenChange(nextOpen);
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("horses:photoUpload.cropTitle")}</DialogTitle>
          <DialogDescription>
            {t("horses:photoUpload.cropDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative h-[400px] bg-black rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={4}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            {t("horses:photoUpload.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing
              ? t("horses:photoUpload.saving")
              : t("horses:photoUpload.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
