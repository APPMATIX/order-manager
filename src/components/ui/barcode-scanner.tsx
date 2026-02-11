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
        // Ignore transition errors during rapid UI changes
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
        // Initialize scanner with explicit format support for 1D barcodes
        scannerRef.current = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ]
        });
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 30, // Higher FPS for better detection
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Optimized box for 1D Barcodes: wide and short
            const width = Math.floor(viewfinderWidth * 0.8);
            const height = Math.floor(viewfinderHeight * 0.4);
            return { width, height };
          },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {} // Frame error callback (ignored for performance)
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error("Scanner failed to start", err);
      if (isOpenRef.current) {
        toast({
          variant: 'destructive',
          title: 'Scanner Error',
          description: 'Could not access the camera. Please ensure permissions are granted.',
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
            Center the barcode in the rectangle below.
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
              <p className="text-sm text-muted-foreground">Waiting for camera...</p>
            </div>
          )}

          {/* Laser Guide Overlay */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-[80%] h-[40%] border-2 border-primary/50 relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
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
