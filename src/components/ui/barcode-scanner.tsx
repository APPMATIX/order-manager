'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, CameraOff, X } from 'lucide-react';
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

  const startScanner = async () => {
    setIsLoading(true);
    
    // Ensure the element exists in the DOM before initializing
    // Dialog content might take a moment to mount
    const waitForElement = (id: string, maxAttempts = 10): Promise<boolean> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          if (document.getElementById(id)) {
            resolve(true);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, 100); // Check every 100ms
          } else {
            resolve(false);
          }
        };
        check();
      });
    };

    const elementExists = await waitForElement(regionId);
    if (!elementExists) {
      console.error(`Scanner failed to start: Element with id ${regionId} not found.`);
      setIsLoading(false);
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId);
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {} // silent error for frame scanning
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error("Scanner failed to start", err);
      toast({
        variant: 'destructive',
        title: 'Scanner Error',
        description: 'Could not access the camera. Please ensure permissions are granted.',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Position the barcode within the frame to scan.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/5 border-2 border-dashed border-primary/20">
          <div id={regionId} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Initializing Camera...</p>
            </div>
          )}

          {!isCameraActive && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <CameraOff className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Camera inactive</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
