import type { RadioStation } from "@/fetch-data/feed-data";
import type { FC } from "react";
import "./station-picker.css";

export interface StationPickerProps {
  stations: RadioStation[];
  current: RadioStation;
  onChange: (station: RadioStation) => void;
}

const StationPicker: FC<StationPickerProps> = ({
  stations,
  current,
  onChange,
}) => (
  <nav className="station-picker">
    {stations.map((station) => (
      <button
        key={station.title}
        className={station.title === current.title ? "active" : ""}
        onClick={() => onChange(station)}
      >
        {station.title}
      </button>
    ))}
  </nav>
);

export default StationPicker;
