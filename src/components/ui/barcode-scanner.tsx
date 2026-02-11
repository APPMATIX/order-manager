'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function BarcodeScanner({ isOpen, onClose, onScan, title = "Scan Barcode" }: BarcodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'barcode-scanner-region';
  const { toast } = useToast();
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        if (!(err instanceof Error && err.message.includes('transition'))) {
          console.error("Failed to stop scanner", err);
        }
      }
    }
  };

  const startScanner = async () => {
    if (!isOpenRef.current) return;
    setIsLoading(true);
    
    // Wait for the DOM element to be available (Dialog transition)
    const waitForElement = (id: string, maxAttempts = 20): Promise<boolean> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          if (document.getElementById(id)) {
            resolve(true);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, 100);
          } else {
            resolve(false);
          }
        };
        check();
      });
    };

    const elementExists = await waitForElement(regionId);
    
    if (!isOpenRef.current || !elementExists) {
      setIsLoading(false);
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId);
      }

      // Ensure any previous session is cleaned up
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 20, // Increased FPS for faster detection
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Dynamic QR box based on container size
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return {
              width: size,
              height: Math.floor(size * 0.6), // Standard 1D barcode aspect ratio
            };
          },
          aspectRatio: 1.777778, // 16:9 aspect ratio
        },
        (decodedText) => {
          // Success Callback
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {} // Frame error callback (ignored for noise)
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error("Scanner failed to start", err);
      if (isOpenRef.current) {
        toast({
          variant: 'destructive',
          title: 'Scanner Error',
          description: 'Could not access the camera. Please ensure permissions are granted and try again.',
        });
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Hold the barcode steady within the guide below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border-2 border-primary/20">
          <div id={regionId} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Powering on camera...</p>
            </div>
          )}

          {!isCameraActive && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
              <CameraOff className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Waiting for camera access...</p>
            </div>
          )}

          {/* Custom Overlay for better UX */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
               <div className="w-full h-full border-2 border-primary/50 relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
               </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
