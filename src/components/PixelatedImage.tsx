"use client";

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useRef, useEffect, useState, FC } from "react";

// Define a type for the component's props
type PixelatedImageProps = {
  src: string;
  loadingTime: number;
};

const PixelatedImage: FC<PixelatedImageProps> = ({ src, loadingTime }) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window === "undefined" || !sketchRef.current) return;

    let p5Instance: any;

    const initP5 = async () => {
      const p5 = (await import("p5")).default;

      let img: any;
      let pixelSize: number = 20;
      let interval: ReturnType<typeof setInterval>;

      const sketch = (p: any) => {
        p.setup = async () => {
          const canvas = p.createCanvas(400, 400);
          canvas.style("width", "400px");
          canvas.style("height", "400px");
          canvas.style("border-radius", "10px");

          try {
            img = await p.loadImage(src);
            img.resize(400, 400);
            setLoading(false);
          } catch (e) {
            console.error("Failed to load image", e);
          }
        };

        p.draw = () => {
          if (!img) return;

          if (loading) {
            img.loadPixels();
            for (let y = 0; y < p.height; y += pixelSize) {
              for (let x = 0; x < p.width; x += pixelSize) {
                const i = (Math.floor(y) * p.width + Math.floor(x)) * 4;
                const r = img.pixels[i];
                const g = img.pixels[i + 1];
                const b = img.pixels[i + 2];
                p.noStroke();
                p.fill(r, g, b);
                p.rect(x, y, pixelSize, pixelSize);
              }
            }
          } else {
            p.image(img, 0, 0, 400, 400);
          }
        };
      };

      p5Instance = new p5(sketch, sketchRef.current!);

      interval = setInterval(() => {
        pixelSize = Math.max(1, pixelSize - 1);
        if (pixelSize === 1) {
          clearInterval(interval);
          setLoading(false);
        }
      }, loadingTime / 20);
    };

    initP5();

    return () => {
      if (p5Instance) {
        p5Instance.remove();
      }
    };
  }, [src, loadingTime]);

  return <div ref={sketchRef}></div>;
};

export default PixelatedImage;
