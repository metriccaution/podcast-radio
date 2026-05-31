import { type FC, useEffect, useRef } from "react";

export interface AudioPlayerProps {
  playing?: boolean;
  source: string;
  startAtSeconds: number;
  /**
   * Progress through the episode.
   */
  onTimeUpdate: (event: { currentTime: number; duration: number }) => void;
  /**
   * Track finished - canonical source for this, rather than guessing by
   * estimated time.
   */
  onComplete: () => void;
  /**
   * Once the actual duration of the audio file has been retrieved, use it to
   * replace the metadata from the RSS feed.
   */
  onActualDuration: (seconds: number) => void;
}

/**
 * Thin wrapper around a native <audio> element. Exposes play state and
 * seek position as props rather than DOM calls, keeping control in the
 * parent's state machine.
 *
 * No visible controls are rendered — this is a radio, not a media player.
 */
const Player: FC<AudioPlayerProps> = ({
  playing,
  source,
  startAtSeconds,
  onTimeUpdate,
  onComplete,
  onActualDuration,
}) => {
  const ref = useRef<HTMLAudioElement>(null);

  /**
   * Drives play/pause from the playing prop. source is included in the
   * dependency array because changing the src attribute resets the element,
   * requiring a fresh play() call if we're mid-playback.
   */
  useEffect(() => {
    if (playing) {
      ref.current?.play().catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof DOMException && err.name === "NotSupportedError") {
          console.error("Unplayable media, skipping:", source);
          onComplete();
          return;
        }
        throw err;
      });
    } else {
      ref.current?.pause();
    }
  }, [playing, source, ref]);

  /**
   * Seeks to startAtSeconds whenever it changes — on initial tune-in, on
   * station switch, and when resuming after a pause.
   *
   * Setting currentTime is safe before the audio has fully loaded; the browser
   * will honour it once sufficient data has buffered.
   */
  useEffect(() => {
    if (ref.current) {
      ref.current.currentTime = startAtSeconds;
    }
  }, [startAtSeconds, ref]);

  return (
    <audio
      ref={ref}
      src={source}
      onTimeUpdate={() =>
        onTimeUpdate({
          currentTime: ref.current?.currentTime ?? 1,
          duration: ref.current?.duration ?? 1,
        })
      }
      onLoadedMetadata={() => {
        const d = ref.current?.duration;
        if (d && isFinite(d)) onActualDuration(d);
      }}
      onEnded={() => onComplete()}
    />
  );
};

export default Player;
