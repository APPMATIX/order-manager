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
import { Loader2, Camera, CameraOff, Keyboard, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function BarcodeScanner({ isOpen, onClose, onScan, title = "Scan Barcode" }: BarcodeScannerProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'physical'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isBusy = useRef(false);
  const physicalInputRef = useRef<HTMLInputElement>(null);
  const regionId = 'barcode-scanner-region';
  const { toast } = useToast();
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const stopScanner = async () => {
    if (isBusy.current) return;
    
    if (scannerRef.current && scannerRef.current.isScanning) {
      isBusy.current = true;
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err: any) {
        const message = typeof err === 'string' ? err : err?.message || '';
        if (!message.toLowerCase().includes('transition')) {
          console.error("Failed to stop scanner", err);
        }
      } finally {
        isBusy.current = false;
      }
    }
  };

  const startScanner = async () => {
    if (!isOpenRef.current || isBusy.current || activeMode !== 'camera') return;
    
    setIsLoading(true);
    
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
    
    if (!isOpenRef.current || !elementExists || activeMode !== 'camera') {
      setIsLoading(false);
      return;
    }

    isBusy.current = true;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ]
        });
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      if (!isOpenRef.current || activeMode !== 'camera') {
        isBusy.current = false;
        setIsLoading(false);
        return;
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(viewfinderWidth * 0.85);
            const height = Math.floor(viewfinderHeight * 0.45);
            return { width, height };
          },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          onScan(decodedText);
          onClose();
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err?.message || '';
      if (isOpenRef.current && !message.toLowerCase().includes('transition')) {
        console.error("Scanner failed to start", err);
        toast({
          variant: 'destructive',
          title: 'Scanner Error',
          description: 'Could not access the camera. Check permissions.',
        });
        setActiveMode('physical'); // Fallback
      }
    } finally {
      isBusy.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeMode === 'camera') {
        startScanner();
      } else {
        stopScanner();
        // Allow time for DOM to update and tab to switch
        setTimeout(() => physicalInputRef.current?.focus(), 100);
      }
    } else {
      stopScanner();
    }
  }, [isOpen, activeMode]);

  const handlePhysicalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Choose your scanning method below.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeMode} onValueChange={(val: any) => setActiveMode(val)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="camera" className="gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="physical" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Physical Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border-2 border-primary/20">
              <div id={regionId} className="w-full h-full" />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Starting camera...</p>
                </div>
              )}

              {!isCameraActive && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                  <CameraOff className="h-10 w-10 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">Camera inactive</p>
                </div>
              )}

              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                   <div className="w-[85%] h-[45%] border-2 border-primary/50 relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                   </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="physical" className="mt-0">
            <div 
              className="flex flex-col items-center justify-center aspect-video w-full rounded-lg bg-muted/30 border-2 border-dashed border-primary/20 p-6 text-center cursor-pointer"
              onClick={() => physicalInputRef.current?.focus()}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Keyboard className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Ready to Scan</h4>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Connect your physical scanner and pull the trigger.
              </p>
              
              <Input
                ref={physicalInputRef}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handlePhysicalKeyDown}
                className="opacity-0 absolute h-0 w-0 pointer-events-none"
                autoFocus
              />
              
              <div className="mt-6 w-full max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-1/3" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
