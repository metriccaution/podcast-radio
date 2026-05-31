import type { FC } from "react";
import "./artwork.css";

export interface ArtworkProps {
  imageUrl: string | undefined;
  alt: string;
}

const Artwork: FC<ArtworkProps> = ({ imageUrl, alt }) => {
  if (!imageUrl) return null;
  return (
    <img
      className="podcast-artwork"
      src={imageUrl}
      alt={alt}
      width={192}
      height={192}
    />
  );
};

export default Artwork;
