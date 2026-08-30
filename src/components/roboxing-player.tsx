"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { Level } from "hls.js";
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The Roboxing player.
 *
 * Everything a viewer sees is ours: our controls, our LIVE badge, our
 * branding, on our domain. Cloudflare is the pipe behind it and is never
 * visible. hls.js drives playback everywhere except Safari and iOS, which play
 * HLS natively — attaching hls.js there as well is the classic way to break
 * iOS fullscreen, so the native path is a deliberate branch rather than a
 * fallback. Both branches recover from an expired token; a two-hour broadcast
 * outlives any sensible signed-URL TTL, and the native branch carries a large
 * share of the mobile audience.
 */

/** How far behind the live edge counts as drifted, in seconds. */
const DRIFT_THRESHOLD_SECONDS = 12;

/**
 * Recovery attempts before giving up.
 *
 * Without a cap, a stream that cannot be recovered — a Cloudflare outage, or a
 * viewer outside the licensed territory whose geo-block surfaces as a network
 * error — turns into a tight loop hammering our token endpoint and
 * Cloudflare's API, from every affected viewer simultaneously, during the
 * event. The cap is the difference between one broken player and a
 * self-inflicted outage.
 */
const MAX_RECOVERY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1000;

export type RoboxingPlayerProps = {
  /** HLS manifest URL. For signed playback this already contains the token. */
  src: string;
  poster?: string | null;
  isLive?: boolean;
  /** Mints a fresh manifest URL when the signed token behind `src` expires. */
  onRefreshSrc?: () => Promise<string | null>;
  className?: string;
};

type QualityLevel = { index: number; height: number; bitrate: number };

export function RoboxingPlayer({
  src,
  poster,
  isLive = false,
  onRefreshSrc,
  className,
}: RoboxingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  // Latest-callback ref, assigned in an effect rather than during render — a
  // ref mutated mid-render is unsafe under concurrent rendering.
  const refreshRef = useRef(onRefreshSrc);
  useEffect(() => {
    refreshRef.current = onRefreshSrc;
  }, [onRefreshSrc]);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [level, setLevel] = useState(-1);
  const [behindLive, setBehindLive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Attach the source                                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let hls: Hls | null = null;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let nativeErrorHandler: (() => void) | null = null;

    const giveUp = () => {
      if (!cancelled) setError("The stream is unavailable right now.");
    };

    /** Exponential backoff so a persistent failure does not become a flood. */
    const backoff = (fn: () => void) => {
      attempts += 1;
      if (attempts > MAX_RECOVERY_ATTEMPTS) {
        giveUp();
        return;
      }
      retryTimer = setTimeout(fn, RETRY_BASE_DELAY_MS * 2 ** (attempts - 1));
    };

    async function attach() {
      // `canPlayType` for HLS returns "probably" on Safari and iOS, and
      // "maybe" on Chrome — which cannot actually play HLS natively at all.
      // Treating any truthy answer as native support sends Chrome down the
      // native path, where the video silently never loads (readyState stays 0
      // with no error event). Only "probably" means it.
      const nativeSupport = video!.canPlayType("application/vnd.apple.mpegurl");
      const preferNative = nativeSupport === "probably";

      /* --- Safari / iOS: hand the manifest straight to the element -------- */
      if (preferNative) {
        video!.src = src;

        // The element's own error event is the ONLY signal available here —
        // none of the hls.js recovery below runs on this path. Without it,
        // every Safari and iOS viewer loses the stream when the signed token
        // expires roughly an hour in, which on a two-hour card is the middle
        // of the main event.
        nativeErrorHandler = () => {
          if (cancelled) return;
          backoff(async () => {
            const refreshed = await refreshRef.current?.();
            if (cancelled) return;
            if (refreshed) {
              const resumeAt = video!.currentTime;
              video!.src = refreshed;
              video!.load();
              // Live streams resume at the edge; VOD keeps its position.
              if (!isLive && Number.isFinite(resumeAt)) {
                video!.currentTime = resumeAt;
              }
              void video!.play().catch(() => {});
            } else {
              giveUp();
            }
          });
        };
        video!.addEventListener("error", nativeErrorHandler);
        return;
      }

      /* --- Everywhere else: hls.js --------------------------------------- */
      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;

      if (!HlsLib.isSupported()) {
        // No Media Source Extensions. If the element claims it can manage the
        // manifest itself — even hesitantly — that is strictly better than
        // showing an error.
        if (nativeSupport) {
          video!.src = src;
          return;
        }
        setError("This browser cannot play the stream.");
        return;
      }

      hls = new HlsLib({
        lowLatencyMode: true,
        backBufferLength: 90,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
        if (cancelled) return;
        // A successful load means whatever went wrong is over.
        attempts = 0;
        setLevels(
          (data.levels as Level[]).map((l, index) => ({
            index,
            height: l.height,
            bitrate: l.bitrate,
          })),
        );
        setError(null);
      });

      hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => {
        if (!cancelled) setLevel(hls?.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(HlsLib.Events.ERROR, (_e, data) => {
        if (!data.fatal || cancelled) return;

        if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
          // On a long broadcast the likeliest cause is an expired signed
          // token, which is indistinguishable from any other network failure.
          backoff(async () => {
            const refreshed = await refreshRef.current?.();
            if (cancelled) return;
            if (refreshed) hls?.loadSource(refreshed);
            else hls?.startLoad();
          });
          return;
        }

        if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
          backoff(() => hls?.recoverMediaError());
          return;
        }

        giveUp();
      });

      hls.loadSource(src);
      hls.attachMedia(video!);
    }

    void attach();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (nativeErrorHandler) {
        video.removeEventListener("error", nativeErrorHandler);
      }
      hls?.destroy();
      hlsRef.current = null;
      // Release the old source so a src swap does not leave the previous
      // manifest loading in the background.
      if (!hlsRef.current) video.removeAttribute("src");
    };
  }, [src, isLive]);

  /* ---------------------------------------------------------------------- */
  /* Element events                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolume = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const onDuration = () => setDuration(video.duration || 0);
    const onTime = () => {
      setCurrentTime(video.currentTime);

      if (!isLive) return;
      const hls = hlsRef.current;
      const edge =
        hls?.liveSyncPosition ??
        (video.seekable.length
          ? video.seekable.end(video.seekable.length - 1)
          : null);
      if (edge == null) return;
      setBehindLive(edge - video.currentTime > DRIFT_THRESHOLD_SECONDS);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("timeupdate", onTime);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [isLive]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Dismiss the quality menu the way every other menu on the web dismisses.
  // Without this a keyboard user who opens it has no way back out.
  useEffect(() => {
    if (!showQuality) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQuality(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!qualityMenuRef.current?.contains(e.target as Node)) {
        setShowQuality(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [showQuality]);

  /* ---------------------------------------------------------------------- */
  /* Controls                                                                */
  /* ---------------------------------------------------------------------- */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }, []);

  const jumpToLive = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const hls = hlsRef.current;
    const edge =
      hls?.liveSyncPosition ??
      (video.seekable.length
        ? video.seekable.end(video.seekable.length - 1)
        : null);
    if (edge != null) video.currentTime = edge;
    if (video.paused) void video.play().catch(() => {});
    setBehindLive(false);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void video.requestPictureInPicture?.().catch(() => {});
  }, []);

  const selectLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = index;
    setLevel(index);
    setShowQuality(false);
  }, []);

  const clock = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  /* ---------------------------------------------------------------------- */

  return (
    <div
      ref={containerRef}
      className={cn(
        "group bg-canvas border-line relative aspect-video w-full overflow-hidden rounded-lg border",
        className,
      )}
    >
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        playsInline
        className="h-full w-full bg-black"
        onClick={togglePlay}
      />

      {/* Live / drift badge. Red means broadcasting and nothing else; amber
          means "you have fallen behind", which is a different message. */}
      {isLive ? (
        <button
          type="button"
          onClick={jumpToLive}
          disabled={!behindLive}
          aria-label={behindLive ? "Jump to live" : "Playing live"}
          className={cn(
            "font-display absolute top-3 left-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold tracking-[0.1em] uppercase transition-colors",
            behindLive
              ? "border-drift/40 bg-drift/15 text-drift hover:bg-drift/25 cursor-pointer"
              : "border-live/40 bg-live/15 text-live cursor-default",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              behindLive ? "bg-drift" : "bg-live pulse-live",
            )}
          />
          {behindLive ? "Go live" : "Live"}
        </button>
      ) : null}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
          <p className="text-ink text-sm">{error}</p>
        </div>
      ) : null}

      {!playing && !error ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="bg-volt text-volt-ink flex size-16 items-center justify-center rounded-full transition-transform hover:scale-105">
            <Play className="ml-1 size-7" fill="currentColor" />
          </span>
        </button>
      ) : null}

      {/* Control bar: visible on hover, on focus, and whenever paused, so it
          is reachable by keyboard and does not vanish on a touch device. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pt-10 pb-3 transition-opacity",
          playing
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100",
        )}
      >
        {/* Scrub bar — VOD only. A live stream has no meaningful timeline. */}
        {!isLive && duration > 0 ? (
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const video = videoRef.current;
              if (video) video.currentTime = Number(e.target.value);
            }}
            aria-label="Seek"
            className="accent-volt mb-2 w-full cursor-pointer"
          />
        ) : null}

        <div className="flex items-center gap-2">
          <ControlButton onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </ControlButton>

          <ControlButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </ControlButton>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const video = videoRef.current;
              if (!video) return;
              video.volume = Number(e.target.value);
              video.muted = Number(e.target.value) === 0;
            }}
            aria-label="Volume"
            className="accent-volt hidden w-20 cursor-pointer sm:block"
          />

          <span className="text-ink tabular ml-1 text-xs">
            {isLive ? "LIVE" : `${clock(currentTime)} / ${clock(duration)}`}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {levels.length > 1 ? (
              <div className="relative" ref={qualityMenuRef}>
                <ControlButton
                  onClick={() => setShowQuality((v) => !v)}
                  label="Quality"
                  expanded={showQuality}
                >
                  <Settings className="size-4" />
                </ControlButton>
                {showQuality ? (
                  <ul className="border-line bg-surface absolute right-0 bottom-full mb-2 min-w-28 overflow-hidden rounded-md border py-1 text-xs">
                    <QualityOption
                      active={level === -1}
                      onClick={() => selectLevel(-1)}
                    >
                      Auto
                    </QualityOption>
                    {levels
                      .slice()
                      .sort((a, b) => b.height - a.height)
                      .map((l) => (
                        <QualityOption
                          key={l.index}
                          active={level === l.index}
                          onClick={() => selectLevel(l.index)}
                        >
                          {l.height}p
                        </QualityOption>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <ControlButton
              onClick={togglePip}
              label="Picture in picture"
              className="hidden sm:inline-flex"
            >
              <PictureInPicture2 className="size-4" />
            </ControlButton>

            <ControlButton
              onClick={toggleFullscreen}
              label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
  className,
  expanded,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      className={cn(
        "text-ink hover:text-volt inline-flex size-8 items-center justify-center rounded-md transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

function QualityOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={cn(
          "hover:bg-surface-2 w-full px-3 py-1.5 text-left transition-colors",
          active ? "text-volt" : "text-ink-muted",
        )}
      >
        {children}
      </button>
    </li>
  );
}
