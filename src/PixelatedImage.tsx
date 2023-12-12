import React, { useRef, useEffect, useState } from "react";
import p5 from "p5";

const PixelatedImage = ({ src, loadingTime }) => {
  const sketchRef = useRef();
  const [loading, setLoading] = useState(true);
  let img,
    pixelSize = 20,
    interval;

  const sketch = (p) => {
    p.preload = () => {
      img = p.loadImage(src, () => setLoading(false));
    };

    p.setup = () => {
      const canvas = p.createCanvas(400, 400);
      canvas.style("width", "400px");
      canvas.style("height", "400px");
      img.resize(400, 400);
    };

    p.draw = () => {
      if (loading) {
        // Draw pixelated image while loading
        for (let y = 0; y < p.height; y += pixelSize) {
          for (let x = 0; x < p.width; x += pixelSize) {
            let i = (y * p.width + x) * 4;
            let r = img.pixels[i];
            let g = img.pixels[i + 1];
            let b = img.pixels[i + 2];
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
  }, [src, loadingTime]);

  return <div ref={sketchRef}></div>;
};

export default PixelatedImage;
