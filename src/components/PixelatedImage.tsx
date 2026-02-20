"use client";

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useRef, useEffect, useState, FC } from "react";
import p5 from "p5";

// Define a type for the component's props
type PixelatedImageProps = {
  src: string;
  loadingTime: number;
};

const PixelatedImage: FC<PixelatedImageProps> = ({ src, loadingTime }) => {
  const sketchRef = useRef<HTMLDivElement>(null); // Specify the type for the ref
  const [loading, setLoading] = useState<boolean>(true); // Specify type for state variable
  let img: p5.Image;
  let pixelSize: number = 20;
  let interval: ReturnType<typeof setInterval>;

  const sketch = (p: p5) => {
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
      if (!img) return; // Wait until image is loaded

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
        // Draw original image once loading is complete
        p.image(img, 0, 0, 400, 400);
      }
    };
  };

  useEffect(() => {
    if (sketchRef.current) {
      const p5Instance = new p5(sketch, sketchRef.current);

      // @ts-ignore
      interval = setInterval(() => {
        pixelSize = Math.max(1, pixelSize - 1);
        if (pixelSize === 1) {
          // @ts-ignore
          clearInterval(interval);
          setLoading(false); // Set loading to false when pixelation is done
        }
      }, loadingTime / 20);

      return () => {
        // @ts-ignore
        clearInterval(interval);
        p5Instance.remove();
      };
    }
  }, [src, loadingTime]);

  return <div ref={sketchRef}></div>;
};

export default PixelatedImage;
