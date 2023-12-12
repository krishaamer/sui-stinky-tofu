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
  let interval: NodeJS.Timer;

  const sketch = (p: p5) => {
    p.preload = () => {
      img = p.loadImage(src, () => setLoading(false));
    };

    p.setup = () => {
      const canvas = p.createCanvas(400, 400);
      canvas.style("width", "400px");
      canvas.style("height", "400px");
      canvas.style("border-radius", "10px");
      img.resize(400, 400);
    };

    p.draw = () => {
      if (loading) {
        for (let y = 0; y < p.height; y += pixelSize) {
          for (let x = 0; x < p.width; x += pixelSize) {
            const i = (y * p.width + x) * 4;
            const r = img.pixels[i];
            const g = img.pixels[i + 1];
            const b = img.pixels[i + 2];
            p.noStroke();
            p.fill(r, g, b);
            p.rect(x, y, pixelSize, pixelSize);
          }
        }
        img.loadPixels();
      } else {
        // Draw original image once loading is complete
        p.image(img, 0, 0, 400, 400);
      }
    };
  };

  useEffect(() => {
    if (sketchRef.current) {
      const p5Instance = new p5(sketch, sketchRef.current);

      interval = setInterval(() => {
        pixelSize = Math.max(1, pixelSize - 1);
        if (pixelSize === 1) {
          clearInterval(interval);
          setLoading(false); // Set loading to false when pixelation is done
        }
      }, loadingTime / 20);

      return () => {
        clearInterval(interval);
        p5Instance.remove();
      };
    }
  }, [src, loadingTime]);

  return <div ref={sketchRef}></div>;
};

export default PixelatedImage;
