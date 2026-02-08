import { useEffect, useRef, useState, useCallback } from "react";
import { decode } from "blurhash";
import { cn } from "@/lib/utils";

interface BlurhashImageProps {
  src: string;
  blurhash?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Image component that shows a blurhash placeholder while the real image loads.
 * Falls back to standard img behavior if no blurhash is provided.
 */
export function BlurhashImage({
  src,
  blurhash,
  alt,
  width = 32,
  height = 32,
  className,
}: BlurhashImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;

    try {
      const pixels = decode(blurhash, width, height);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid blurhash, silently ignore
    }
  }, [blurhash, width, height]);

  const handleLoad = useCallback(() => setLoaded(true), []);

  // Reset loaded state when src changes
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {blurhash && !loaded && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: "auto" }}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : blurhash ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}
