"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Check, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface ScreenshotButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
}

export function ScreenshotButton({ targetRef, filename = "buffetr-dashboard" }: ScreenshotButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!targetRef.current) return;

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#faf9f7", // Match our background color
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });

      // Add watermark/branding
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = "bold 16px system-ui";
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillText("📈 buffetr.app", canvas.width - 130, canvas.height - 20);
      }

      // Create download link
      const link = document.createElement("a");
      link.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setCaptured(true);
      setTimeout(() => setCaptured(false), 2000);
    } catch (error) {
      console.error("Error capturing screenshot:", error);
    } finally {
      setIsCapturing(false);
    }
  }, [targetRef, filename]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCapture}
      disabled={isCapturing}
      className="rounded-full px-4 hover-lift"
    >
      {isCapturing ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : captured ? (
        <Check className="w-4 h-4 mr-2 text-emerald-500" />
      ) : (
        <Camera className="w-4 h-4 mr-2" />
      )}
      {captured ? "Saved!" : "Screenshot"}
    </Button>
  );
}

