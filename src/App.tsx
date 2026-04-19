import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Play,
  ArrowLeft,
  Loader2,
  Info,
  MonitorPlay,
  Mic,
  Captions,
  ServerIcon,
  AlertCircle,
  Bug,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Copy,
  Check,
  Calendar,
  ServerCrash,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Pause,
  Settings,
  RotateCcw,
  RotateCw
} from "lucide-react";
import type {
  AnimeResult,
  AnimeInfo,
  Episode,
  Server,
  TrendingAnime,
  AiringScheduleItem,
  NextAiringEpisode,
} from "./types";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";

const HlsPlayer = ({
  src,
  tracks = [],
  onEnded,
  proxyNeeded = false,
}: {
  src: string;
  tracks?: any[];
  onEnded?: () => void;
  proxyNeeded?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [qualities, setQualities] = useState<any[]>([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS and Tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerError(null);
    let hls: Hls;
    const finalSrc = proxyNeeded ? `/api/proxy?url=${encodeURIComponent(src)}` : src;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(finalSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        video.play().catch(() => {});
        setIsPlaying(!video.paused);
        setQualities(data.levels || []);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                 setPlayerError("Failed to load the video stream. The server might be blocking the request or is currently down.");
              } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR || data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT) {
                 setPlayerError("A network error occurred while fetching video segments. The connection timed out.");
              } else {
                 setPlayerError("A fatal network error occurred. Please check your connection.");
              }
              hls.destroy();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setPlayerError("A fatal media error occurred while decoding the video sequence. Try switching to a different server.");
              hls.destroy();
              break;
            default:
              setPlayerError("An unrecoverable playback error occurred. Please try a different server entirely.");
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = finalSrc;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
        setIsPlaying(!video.paused);
      });
      
      const onNativeVideoError = () => {
         const error = video.error;
         if (!error) return;
         switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
               setPlayerError("Video playback was aborted by the user.");
               break;
            case error.MEDIA_ERR_NETWORK:
               setPlayerError("A network error caused the video download to fail part-way. Server might be unresponsive.");
               break;
            case error.MEDIA_ERR_DECODE:
               setPlayerError("The video playback was aborted due to a corruption problem or because it used features your browser did not support.");
               break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
               setPlayerError("The video could not be loaded, either because the server or network failed or because the format is not supported.");
               break;
            default:
               setPlayerError("An unknown native video error occurred.");
               break;
         }
      };
      
      video.addEventListener("error", onNativeVideoError);
    }

    return () => {
      if (hls) hls.destroy();
      video.removeEventListener("error", () => {});
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const enableSubtitles = () => {
      const textTracks = video.textTracks;
      if (!textTracks) return;
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (
          (track.label && track.label.toLowerCase().includes("english")) ||
          track.language === "en"
        ) {
          track.mode = "showing";
        } else {
          track.mode = "hidden";
        }
      }
    };

    video.addEventListener("loadeddata", enableSubtitles);
    const timeout = setTimeout(enableSubtitles, 500);

    return () => {
      video.removeEventListener("loadeddata", enableSubtitles);
      clearTimeout(timeout);
    };
  }, [tracks]);

  // Video State Trackers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // UI Event Handlers
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
      setShowSettings(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
    setShowSettings(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const setSpeed = (speed: number) => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSettings(false);
  };

  const handleClientDownload = async (level: any) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setShowDownloadMenu(false);

      let playlistUrl = level.url ? (Array.isArray(level.url) ? level.url[0] : level.url) : null;
      if (!playlistUrl && level.attrs && level.attrs.URI) {
         playlistUrl = level.attrs.URI;
      }

      if (playlistUrl && playlistUrl.includes('/api/proxy?url=')) {
          playlistUrl = decodeURIComponent(playlistUrl.split('/api/proxy?url=')[1]);
      }
      
      if (playlistUrl && !playlistUrl.startsWith('http')) {
          try {
             playlistUrl = new URL(playlistUrl, src).href;
          } catch(e) {
             console.error("URL parsing error:", e);
          }
      }
      
      if (!playlistUrl) {
         throw new Error("Could not extract quality URL.");
      }

      const finalPlaylistUrl = proxyNeeded ? `/api/proxy?url=${encodeURIComponent(playlistUrl)}` : playlistUrl;
      const res = await fetch(finalPlaylistUrl);
      const text = await res.text();

      if (!res.ok) {
          throw new Error("Failed to fetch quality playlist from server.");
      }
      
      if (!text.includes('#EXTM3U')) {
          console.error("Invalid M3U8 content:", text.substring(0, 100));
          throw new Error("Received invalid playlist data (expected M3U8).");
      }

      const lines = text.split('\n');
      const tsUrls: string[] = [];
      const absoluteBase = new URL(playlistUrl).href.replace(/\/[^\/]*$/, '/');

      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          let url = line.trim();
          if (url.includes('/api/proxy?url=')) {
              url = decodeURIComponent(url.split('/api/proxy?url=')[1]);
          } else if (!url.startsWith('http')) {
            try {
               url = new URL(url, playlistUrl).href;
            } catch(e) {
               console.error("URL segment parse error:", e);
            }
          }
          tsUrls.push(url);
        }
      }

      if (tsUrls.length === 0) throw new Error("No video segments found.");

      const buffers: ArrayBuffer[] = [];
      let loaded = 0;
      
      const batchSize = 3;
      for (let i = 0; i < tsUrls.length; i += batchSize) {
         const batch = tsUrls.slice(i, i + batchSize);
         const batchPromises = batch.map(async (url) => {
            const fetchUrl = proxyNeeded ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
            const segRes = await fetch(fetchUrl);
            if (!segRes.ok) throw new Error(`Failed to fetch segment ${url}`);
            return await segRes.arrayBuffer();
         });
         
         const batchBuffers = await Promise.all(batchPromises);
         buffers.push(...batchBuffers);
         
         loaded += batch.length;
         setDownloadProgress(Math.floor((loaded / tsUrls.length) * 100));
      }

      setDownloadProgress(100);
      const blob = new Blob(buffers, { type: 'video/mp2t' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Episode_${level.height || 'Video'}p.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 2000);
    } catch (e: any) {
      console.error(e);
      alert("Download error: " + e.message + "\n\nPlease try the external download button below the player.");
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 15);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration || videoRef.current.duration, videoRef.current.currentTime + 15);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden focus:outline-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ') {
            e.preventDefault();
            togglePlay();
        } else if (e.key === 'f') {
            toggleFullscreen();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            skipBackward();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            skipForward();
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        onEnded={onEnded}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      >
        {tracks.map((track, i) => (
          <track
            key={i}
            kind={track.kind || "captions"}
            src={
              track.file?.startsWith("http")
                ? `/api/proxy?url=${encodeURIComponent(track.file)}`
                : track.file
            }
            srcLang={track.label?.toLowerCase().substring(0, 2) || "en"}
            label={track.label}
            default={
              track.default ||
              (track.label && track.label.toLowerCase().includes("english"))
            }
          />
        ))}
      </video>

      {/* Downloading Overlay */}
      {isDownloading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
           <Download className="w-12 h-12 text-[#FF3E3E] mb-4 animate-bounce" />
           <h3 className="text-xl font-bold text-white mb-2">Downloading Video</h3>
           <p className="text-[#A0A0A0] text-sm max-w-sm mb-6">Please keep this page open while the video chunks are being securely assembled.</p>
           
           <div className="w-full max-w-md bg-white/10 rounded-full h-3 mb-2 overflow-hidden border border-white/5 shadow-inner">
             <div 
               className="bg-[#FF3E3E] h-full rounded-full transition-all duration-300 relative overflow-hidden"
               style={{ width: `${downloadProgress}%` }}
             >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" style={{backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'}} />
             </div>
           </div>
           <div className="text-white font-mono font-bold text-lg">{downloadProgress}%</div>
        </div>
      )}

      {/* Error Overlay */}
      {playerError && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <AlertCircle className="w-12 h-12 text-[#FF3E3E] mb-4 shadow-sm" />
          <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
          <p className="text-[#A0A0A0] text-sm max-w-md mb-6">{playerError}</p>
          <div className="flex gap-3">
             <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors border border-white/10 shadow-lg cursor-pointer pointer-events-auto">
               Refresh Page
             </button>
          </div>
          <p className="text-xs text-[#666] mt-6 max-w-sm">If refreshing doesn't work, try selecting a different server from the list below the player.</p>
        </div>
      )}

      {/* Custom Controls */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-end transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32 pb-4 px-4 sm:px-6 flex flex-col gap-3 pointer-events-auto">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 w-full group/seek">
            <span className="text-white text-xs font-medium font-mono min-w-[40px] text-right">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 h-3 flex items-center cursor-pointer">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="absolute w-full h-[3px] bg-white/20 rounded-full appearance-none outline-none cursor-pointer z-20"
                style={{
                  background: `linear-gradient(to right, #FF3E3E ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`,
                }}
              />
              <style dangerouslySetInnerHTML={{__html: `
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: #FF3E3E;
                  cursor: pointer;
                  transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                  transform: scale(1.3);
                }
                input[type=range]::-moz-range-thumb {
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: #FF3E3E;
                  cursor: pointer;
                  border: none;
                  transition: transform 0.1s;
                }
                input[type=range]::-moz-range-thumb:hover {
                  transform: scale(1.3);
                }
              `}} />
            </div>
            <span className="text-white/70 text-xs font-medium font-mono min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                onClick={skipBackward}
                className="text-white hover:text-[#FF3E3E] transition-colors p-2"
                title="Backward 15s"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="text-white hover:text-[#FF3E3E] transition-colors p-2"
              >
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />}
              </button>

              <button
                onClick={skipForward}
                className="text-white hover:text-[#FF3E3E] transition-colors p-2"
                title="Forward 15s"
              >
                <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex items-center gap-2 group/volume relative hidden sm:flex ml-1">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-[#FF3E3E] transition-colors p-2"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center pr-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none outline-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <div className="relative">
                <button
                  title="Download Video"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="text-white hover:text-[#FF3E3E] transition-colors p-2"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showDownloadMenu && qualities.length > 0 && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#121212]/95 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden min-w-[120px] shadow-2xl origin-bottom-right animate-in fade-in slide-in-from-bottom-2 z-50">
                    <div className="px-4 py-2 text-xs font-bold text-white/50 uppercase tracking-wider border-b border-white/5 bg-[#0a0a0a]">
                      Download Quality
                    </div>
                    {qualities.map((level, i) => (
                      <button
                        key={i}
                        onClick={() => handleClientDownload(level)}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors text-white whitespace-nowrap"
                      >
                        {level.height ? `${level.height}p` : `Option ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {showDownloadMenu && qualities.length === 0 && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#121212]/95 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden min-w-[150px] shadow-2xl origin-bottom-right animate-in fade-in slide-in-from-bottom-2 z-50 p-4 text-center">
                    <p className="text-sm text-white font-medium mb-1">Qualities not parsed.</p>
                    <p className="text-xs text-[#A0A0A0]">Please use the external download button below the player.</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:text-[#FF3E3E] transition-colors p-2 flex items-center gap-1 font-medium text-xs sm:text-sm bg-white/5 hover:bg-white/10 rounded-md px-3"
                >
                  {playbackRate}x
                </button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#121212]/95 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden min-w-[100px] shadow-2xl origin-bottom-right animate-in fade-in slide-in-from-bottom-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setSpeed(speed)}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${playbackRate === speed ? "text-[#FF3E3E] font-medium" : "text-white"}`}
                      >
                        {speed === 1 ? "Normal" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-[#FF3E3E] transition-colors p-2 ml-1"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"search" | "info" | "watch" | "az">("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnimeResult[]>([]);

  const [recentUpdates, setRecentUpdates] = useState<AnimeResult[]>([]);
  const [popularUpdates, setPopularUpdates] = useState<AnimeResult[]>([]);
  const [trending, setTrending] = useState<TrendingAnime[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const [recentLoading, setRecentLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [hasMorePopular, setHasMorePopular] = useState(true);

  const [azResults, setAzResults] = useState<AnimeResult[]>([]);
  const [azLoading, setAzLoading] = useState(false);
  const [azPage, setAzPage] = useState(1);
  const [hasMoreAz, setHasMoreAz] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string>("A");

  const currentObserver = useRef<IntersectionObserver | null>(null);
  const observerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (recentLoading) return;
      if (currentObserver.current) currentObserver.current.disconnect();

      currentObserver.current = new IntersectionObserver(
        (entries) => {
          if (
             entries[0].isIntersecting &&
             hasMoreAz &&
             view === "az"
          ) {
             fetchAzList(selectedLetter, azPage + 1);
          }
        },
        { threshold: 0.1 },
      );

      if (node) currentObserver.current.observe(node);
    },
    [recentLoading, hasMoreRecent, view, query, recentPage],
  );

  const [selectedAnime, setSelectedAnime] = useState<
    AnimeResult | TrendingAnime | null
  >(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const fetchAzList = async (char: string, page: number) => {
    if (azLoading || (page > 1 && !hasMoreAz)) return;
    setAzLoading(true);
    try {
      const res = await fetch(`/api/az?char=${char}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setAzResults((prev) =>
            page === 1 ? data.results : [...prev, ...data.results],
          );
          setAzPage(page);
          if (data.results.length < 30) {
            setHasMoreAz(false);
          }
        } else {
          setHasMoreAz(false);
          if (page === 1) setAzResults([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setAzLoading(false);
  };

  const handleLetterSelect = (char: string) => {
     setSelectedLetter(char);
     setAzResults([]);
     setAzPage(1);
     setHasMoreAz(true);
     setQuery("");
     setView("az");
     fetchAzList(char, 1);
     window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchRecent = async (page: number) => {
    if (recentLoading) return;
    setRecentLoading(true);
    try {
      const res = await fetch(`/api/recent?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setRecentUpdates(data.results);
          if (page === 1 && data.trending) setTrending(data.trending);
          setRecentPage(page);
          setHasMoreRecent(true);
        } else {
          setHasMoreRecent(false);
          if (page === 1) setRecentUpdates([]);
        }
      } else {
        setHasMoreRecent(false);
      }
    } catch (err) {
      console.error("Failed to fetch recent updates", err);
      setHasMoreRecent(false);
    }
    setRecentLoading(false);
  };

  const fetchPopular = async (page: number) => {
    if (popularLoading) return;
    setPopularLoading(true);
    try {
      const res = await fetch(`/api/popular?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setPopularUpdates(data.results);
          setPopularPage(page);
          setHasMorePopular(true);
        } else {
          setHasMorePopular(false);
          if (page === 1) setPopularUpdates([]);
        }
      } else {
        setHasMorePopular(false);
      }
    } catch (err) {
      console.error("Failed to fetch popular updates", err);
      setHasMorePopular(false);
    }
    setPopularLoading(false);
  };

  useEffect(() => {
    fetchRecent(1);
    fetchPopular(1);
  }, []);

  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % trending.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [trending]);

  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const selectedEpisodeRef = useRef<HTMLButtonElement>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [sourceLink, setSourceLink] = useState<string>("");
  const [sourceTracks, setSourceTracks] = useState<any[]>([]);
  const [proxyNeeded, setProxyNeeded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<AiringScheduleItem[]>([]);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    const stored = localStorage.getItem("autoPlayNext");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("autoPlayNext", autoPlayNext.toString());
  }, [autoPlayNext]);

  const handleVideoEnded = () => {
    if (!autoPlayNext || !animeInfo || !selectedEpisode) return;
    const currentIndex = animeInfo.episodes.findIndex(
      (ep) => ep.id === selectedEpisode.id,
    );
    if (currentIndex >= 0 && currentIndex < animeInfo.episodes.length - 1) {
      // The episodes array might be reversed or sequential, we just follow the indexing order in arrays.
      // Typically episodes array is [ep1, ep2, ep3] or [ep12, ep11, ep10].
      // Let's assume the user is clicking next episode, so it would be episode.number + 1.
      // Let's find the episode with exact number + 1 just to be safe.
      const nextEp = animeInfo.episodes.find(
        (ep) => ep.number === selectedEpisode.number + 1,
      );
      if (nextEp) {
        watchEpisode(nextEp);
      }
    }
  };

  useEffect(() => {
    if (selectedEpisodeRef.current && (view === "watch" || view === "info")) {
      // Small timeout ensures the DOM has laid out the newly rendered episode list
      setTimeout(() => {
        selectedEpisodeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  }, [selectedEpisode?.id, view, animeInfo?.episodes]);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => {
        if (d.schedule) setSchedules(d.schedule);
      })
      .catch((err) => console.error("Global schedule fetch failed", err));
  }, []);

  const searchAnime = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to search anime. Please try again.");
    }
    setLoading(false);
  };

  const getInfo = async (anime: AnimeResult | TrendingAnime) => {
    setSelectedAnime(anime);
    setView("info");
    setLoading(true);
    setAnimeInfo(null);
    setError(null);
    setNextEpisode(null);
    try {
      const res = await fetch(`/api/info?id=${anime.id}`);
      if (!res.ok) throw new Error("Failed to fetch info");
      const data = await res.json();
      setAnimeInfo(data);

      // Try fetching schedule
      fetch(
        `/api/schedule?title=${encodeURIComponent(data.title.split(" (")[0])}`,
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.nextAiringEpisode) {
            setNextEpisode(d.nextAiringEpisode);
          }
        })
        .catch((err) => {
          console.error("Failed fetching next episode:", err);
        });
    } catch (err: any) {
      console.error(err);
      setError("Failed to load anime details. Please try again.");
    }
    setLoading(false);
  };

  const [serverLoading, setServerLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, boolean>>({});
  const [nextEpisode, setNextEpisode] = useState<NextAiringEpisode | null>(
    null,
  );

  const watchEpisode = async (ep: Episode) => {
    setSelectedEpisode(ep);
    setView("watch");
    setLoading(true);
    setServers([]);
    setSourceLink("");
    setProxyNeeded(false);
    setError(null);
    setServerErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch(`/api/servers?id=${ep.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to fetch servers. The upstream provider might be down.",
        );
      }

      if (!data.servers || data.servers.length === 0) {
        throw new Error(
          "No servers are available for this specific episode. Please check back later.",
        );
      }
      setServers(data.servers || []);
      setLoading(false); // Disable main loading before selecting server

      // Auto select first sub server if available
      const firstSub =
        data.servers.find(
          (s: Server) =>
            s.type === "sub" && s.name.toLowerCase().includes("vidstreaming"),
        ) ||
        data.servers.find((s: Server) => s.type === "sub") ||
        data.servers[0];
      if (firstSub) {
        selectServer(firstSub);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "A network error occurred while loading servers.",
      );
      setLoading(false);
    }
  };

  const selectServer = async (server: Server) => {
    setSelectedServer(server);
    setServerLoading(true);
    setError(null);
    setProxyNeeded(false);
    try {
      const res = await fetch(`/api/source?id=${server.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Video source provider returned an error.",
        );
      }

      if (!data.link)
        throw new Error("Video source link was empty. Try a different server.");

      setSourceLink(data.link);
      setSourceTracks(data.tracks || []);
      setProxyNeeded(!!data.proxyNeeded);
      setServerErrors((prev) => ({ ...prev, [server.id]: false }));
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "Could not load the video from this server. Please try a different server or refresh the page.",
      );
      setServerErrors((prev) => ({ ...prev, [server.id]: true }));
    }
    setServerLoading(false);
  };

  const [reportState, setReportState] = useState<
    "idle" | "reporting" | "reported"
  >("idle");
  const [showDownloaderModal, setShowDownloaderModal] = useState(false);
  const [downloadLinkCopied, setDownloadLinkCopied] = useState(false);

  const handleReportIssue = () => {
    setReportState("reporting");
    const reportData = {
      timestamp: new Date().toISOString(),
      error,
      action: view,
      anime: selectedAnime?.title || null,
      episode: selectedEpisode
        ? `EP ${selectedEpisode.number} - ${selectedEpisode.title}`
        : null,
      server: selectedServer?.name || null,
      query: query || null,
    };
    console.error("USER REPORTED ISSUE:", JSON.stringify(reportData, null, 2));
    setTimeout(() => {
      setReportState("reported");
      setTimeout(() => setReportState("idle"), 3000);
    }, 600);
  };

  const externalWatchUrl = selectedAnime
    ? selectedEpisode
      ? `https://kaido.to/watch/${selectedAnime.id}?ep=${selectedEpisode.id}`
      : `https://kaido.to/watch/${selectedAnime.id}`
    : "";

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF3E3E]/30 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => {
              setView("search");
              setSelectedAnime(null);
              setAnimeInfo(null);
            }}
            className="flex items-center gap-2 group outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3E3E] to-[#FF3E3E] flex items-center justify-center text-white shadow-lg shadow-[#FF3E3E]/20 group-hover:scale-105 transition-transform duration-300">
              <MonitorPlay className="w-4 h-4" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              ANIMXER
            </span>
          </button>

          <div className="flex-1 max-w-xl ml-4">
            <form onSubmit={searchAnime} className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value.trim()) setResults([]);
                }}
                placeholder="Search anime..."
                className="w-full bg-[#121212] border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3E3E]/50 focus:bg-[#121212] transition-all"
              />
              <Search className="w-4 h-4 text-[#A0A0A0] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#FF3E3E] transition-colors" />
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === "search" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FF3E3E] animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#FF3E3E] bg-[#FF3E3E]/5 rounded-2xl border border-[#FF3E3E]/20 max-w-2xl mx-auto text-center">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium text-lg mb-4">{error}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {externalWatchUrl && (
                    <a
                      href={externalWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#FF3E3E]/20 hover:bg-[#FF3E3E]/30 text-[#FF3E3E] rounded-lg text-sm font-medium transition-colors border border-[#FF3E3E]/20 hover:border-[#FF3E3E]/30"
                    >
                      Watch Externally
                    </a>
                  )}
                  <button
                    onClick={handleReportIssue}
                    disabled={reportState !== "idle"}
                    className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors border ${
                      reportState === "reported"
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                        : "bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white border-white/10"
                    }`}
                  >
                    {reportState === "idle" && (
                      <>
                        <Bug className="w-4 h-4" /> Report Issue
                      </>
                    )}
                    {reportState === "reporting" && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {reportState === "reported" && (
                      <>
                        <CheckCircle className="w-4 h-4" /> Reported!
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8">
                {results.map((anime) => (
                  <div
                    key={anime.id}
                    onClick={() => getInfo(anime)}
                    className="group cursor-pointer flex flex-col gap-3 outline-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && getInfo(anime)}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#121212] shadow-md ring-1 ring-white/10 group-hover:ring-[#FF3E3E]/50 transition-all duration-300">
                      <img
                        src={anime.poster}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <div className="w-10 h-10 rounded-full bg-[#FF3E3E] text-white flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <Play className="w-5 h-5 ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                        {anime.sub && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-black backdrop-blur-sm shadow-sm flex items-center">
                            SUB {anime.sub}
                          </span>
                        )}
                        {anime.dub && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FF3E3E]/90 text-white backdrop-blur-sm shadow-sm flex items-center">
                            DUB {anime.dub}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[#FF3E3E] transition-colors">
                        {anime.title}
                      </h3>
                      <p className="text-xs text-[#A0A0A0] mt-1.5 flex items-center gap-2">
                        <span>{anime.type}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span>{anime.duration}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUpdates.length > 0 ? (
              <div className="animate-in fade-in duration-1000">
                {trending.length > 0 && (
                  <div className="mb-12 relative rounded-2xl overflow-hidden aspect-[21/9] sm:aspect-[21/7] bg-[#121212] group">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSlideIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => getInfo(trending[activeSlideIndex])}
                      >
                        <img
                          src={trending[activeSlideIndex].poster}
                          alt={trending[activeSlideIndex].title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent flex flex-col justify-center p-6 sm:p-12">
                          <span className="flex items-center gap-2 text-[#FF3E3E] font-bold text-xs sm:text-sm tracking-wider uppercase mb-2">
                            <TrendingUp className="w-4 h-4" /> Trending Now
                          </span>
                          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 line-clamp-2 max-w-2xl leading-tight">
                            {trending[activeSlideIndex].title}
                          </h2>
                          <p className="text-[#A0A0A0] text-sm sm:text-base line-clamp-2 sm:line-clamp-3 max-w-xl mb-6">
                            {trending[activeSlideIndex].description}
                          </p>
                          <button className="flex items-center gap-2 bg-[#FF3E3E] hover:bg-[#ff5555] text-white px-6 py-3 rounded-full font-bold w-fit transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FF3E3E]/20">
                            <Play className="w-5 h-5 fill-current" />
                            Watch Now
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlideIndex(
                          (prev) =>
                            (prev - 1 + trending.length) % trending.length,
                        );
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-[#FF3E3E] text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    >
                      <ChevronLeft className="w-6 h-6 mr-0.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlideIndex(
                          (prev) => (prev + 1) % trending.length,
                        );
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-[#FF3E3E] text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    >
                      <ChevronRight className="w-6 h-6 ml-0.5" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                      {trending.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlideIndex(i);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-300 ${activeSlideIndex === i ? "w-6 bg-[#FF3E3E]" : "w-2 bg-white/30 hover:bg-white/50"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {schedules.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-[#FF3E3E]" />
                      Upcoming Airing Schedule
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                      {schedules.map((schedule, idx) => (
                        <div
                          key={idx}
                          className="snap-start shrink-0 w-64 md:w-72 bg-[#121212] rounded-xl overflow-hidden border border-white/5 shadow-lg group"
                        >
                          <div className="h-32 relative overflow-hidden">
                            <img
                              src={schedule.poster}
                              alt={schedule.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent" />
                            <div className="absolute bottom-2 left-3">
                              <span className="bg-[#FF3E3E] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                Episode {schedule.episode}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 pt-2">
                            <h3 className="text-white font-semibold line-clamp-1 mb-2 group-hover:text-[#FF3E3E] transition-colors">
                              {schedule.title}
                            </h3>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#A0A0A0] font-medium">
                                {new Intl.DateTimeFormat(navigator.language, {
                                  weekday: "short",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(schedule.time * 1000))}
                              </span>
                              <span className="text-zinc-500">
                                {new Date(
                                  schedule.time * 1000,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <MonitorPlay className="w-6 h-6 text-[#FF3E3E]" />
                  Recently Updated
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8">
                  {recentUpdates.map((anime, idx) => (
                    <div
                      key={anime.id + "-" + idx}
                      onClick={() => getInfo(anime)}
                      className="group cursor-pointer flex flex-col gap-3 outline-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && getInfo(anime)}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#121212] shadow-md ring-1 ring-white/10 group-hover:ring-[#FF3E3E]/50 transition-all duration-300">
                        <img
                          src={anime.poster}
                          alt={anime.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <div className="w-10 h-10 rounded-full bg-[#FF3E3E] text-white flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                          {anime.sub && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-black backdrop-blur-sm shadow-sm flex items-center">
                              SUB {anime.sub}
                            </span>
                          )}
                          {anime.dub && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FF3E3E]/90 text-white backdrop-blur-sm shadow-sm flex items-center">
                              DUB {anime.dub}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[#FF3E3E] transition-colors">
                          {anime.title}
                        </h3>
                        {anime.type && (
                          <p className="text-xs text-[#A0A0A0] mt-1.5 flex items-center gap-2">
                            <span>{anime.type}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>{anime.duration}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {recentUpdates.length > 0 && (
                  <div className="py-8 flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={() => {
                        fetchRecent(recentPage - 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={recentPage === 1 || recentLoading}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors border border-white/10 flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </button>
                    <span className="text-[#A0A0A0] font-medium text-sm">
                      Page {recentPage}
                    </span>
                    <button
                      onClick={() => {
                        fetchRecent(recentPage + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={!hasMoreRecent || recentLoading}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors border border-white/10 flex items-center"
                    >
                      {recentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Popular Anime Section */}
                <h2 id="popular-section" className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#FF3E3E]" />
                  Popular
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8">
                  {popularUpdates.map((anime, idx) => (
                    <div
                      key={anime.id + "-pop-" + idx}
                      onClick={() => getInfo(anime)}
                      className="group cursor-pointer flex flex-col gap-3 outline-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && getInfo(anime)}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#121212] shadow-md ring-1 ring-white/10 group-hover:ring-[#FF3E3E]/50 transition-all duration-300">
                        <img
                          src={anime.poster}
                          alt={anime.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <div className="w-10 h-10 rounded-full bg-[#FF3E3E] text-white flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                          {anime.sub && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-black backdrop-blur-sm shadow-sm flex items-center">
                              SUB {anime.sub}
                            </span>
                          )}
                          {anime.dub && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FF3E3E]/90 text-white backdrop-blur-sm shadow-sm flex items-center">
                              DUB {anime.dub}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[#FF3E3E] transition-colors">
                          {anime.title}
                        </h3>
                        {anime.type && (
                          <p className="text-xs text-[#A0A0A0] mt-1.5 flex items-center gap-2">
                            <span>{anime.type}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>{anime.duration}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {popularUpdates.length > 0 && (
                  <div className="py-8 flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={() => {
                        fetchPopular(popularPage - 1);
                        document.getElementById("popular-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      disabled={popularPage === 1 || popularLoading}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors border border-white/10 flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </button>
                    <span className="text-[#A0A0A0] font-medium text-sm">
                      Page {popularPage}
                    </span>
                    <button
                      onClick={() => {
                        fetchPopular(popularPage + 1);
                        document.getElementById("popular-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      disabled={!hasMorePopular || popularLoading}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors border border-white/10 flex items-center"
                    >
                      {popularLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-[#A0A0A0]">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Search for an anime to watch</p>
              </div>
            )}
          </div>
        )}

        {view === "info" && selectedAnime && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setView("search")}
              className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-white mb-6 group transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to search
            </button>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FF3E3E] animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#FF3E3E] bg-[#FF3E3E]/5 rounded-2xl border border-[#FF3E3E]/20 max-w-2xl mx-auto text-center">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium text-lg mb-4">{error}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {externalWatchUrl && (
                    <a
                      href={externalWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#FF3E3E]/20 hover:bg-[#FF3E3E]/30 text-[#FF3E3E] rounded-lg text-sm font-medium transition-colors border border-[#FF3E3E]/20 hover:border-[#FF3E3E]/30"
                    >
                      Watch Externally
                    </a>
                  )}
                  <button
                    onClick={handleReportIssue}
                    disabled={reportState !== "idle"}
                    className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors border ${
                      reportState === "reported"
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                        : "bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white border-white/10"
                    }`}
                  >
                    {reportState === "idle" && (
                      <>
                        <Bug className="w-4 h-4" /> Report Issue
                      </>
                    )}
                    {reportState === "reporting" && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {reportState === "reported" && (
                      <>
                        <CheckCircle className="w-4 h-4" /> Reported!
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              animeInfo && (
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-64 flex-shrink-0">
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative">
                      <img
                        src={animeInfo.poster}
                        alt={animeInfo.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
                      {animeInfo.title}
                    </h1>
                    <p className="text-[#A0A0A0] text-sm leading-relaxed mb-8 max-w-3xl">
                      {animeInfo.description || "No description available."}
                    </p>

                    {nextEpisode && (
                      <div className="mb-8 p-4 rounded-xl bg-[#FF3E3E]/10 border border-[#FF3E3E]/20 flex items-center justify-between shadow-lg">
                        <div>
                          <h3 className="text-[#FF3E3E] font-bold text-sm uppercase tracking-wider mb-1">
                            Airing Next
                          </h3>
                          <p className="text-white">
                            Episode {nextEpisode.episode}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-white/90">
                            {new Intl.DateTimeFormat(navigator.language, {
                              weekday: "long",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(nextEpisode.airingAt * 1000))}
                          </div>
                          <div className="text-xs text-[#A0A0A0] mt-0.5">
                            (
                            {new Date(
                              nextEpisode.airingAt * 1000,
                            ).toLocaleDateString()}
                            )
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                      <h2 className="text-lg font-semibold text-white">
                        Episodes
                      </h2>
                      <span className="text-sm text-[#A0A0A0]">
                        {animeInfo.episodes.length} episodes found
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {animeInfo.episodes.map((ep) => (
                        <button
                          key={ep.id}
                          ref={(el) => {
                            if (el && selectedEpisode?.id === ep.id) {
                              (
                                selectedEpisodeRef as React.MutableRefObject<HTMLButtonElement | null>
                              ).current = el;
                            }
                          }}
                          onClick={() => {
                            if (selectedEpisode?.id !== ep.id || view === "info") {
                              watchEpisode(ep);
                            }
                          }}
                          className={`border rounded-xl p-3 flex flex-col items-center gap-2 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[#FF3E3E] ${
                            selectedEpisode?.id === ep.id
                              ? "bg-[#FF3E3E] border-[#FF3E3E] shadow-[0_0_15px_rgba(255,62,62,0.5)] text-white scale-[1.03] z-10"
                              : "bg-[#121212] hover:bg-[#FF3E3E]/10 border-white/10 hover:border-[#FF3E3E]/50 text-[#A0A0A0]"
                          }`}
                        >
                          <span
                            className={`text-xs transition-colors ${selectedEpisode?.id === ep.id ? "text-white font-bold" : "group-hover:text-[#FF3E3E]"}`}
                          >
                            Episode {ep.number}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Recommendations Dropdown Match For Info View */}
            {view === "info" &&
              animeInfo?.recommended &&
              animeInfo.recommended.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-[#FF3E3E] pl-3">
                    Recommended For You
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {animeInfo.recommended.map((anime) => (
                      <button
                        key={anime.id}
                        onClick={() => {
                          getInfo(anime);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="group text-left outline-none"
                      >
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 border border-white/5 shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-[#FF3E3E]">
                          <img
                            src={anime.poster}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            {anime.sub && anime.sub !== "0" && (
                              <div className="bg-[#FF3E3E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Captions className="w-3 h-3" />
                                {anime.sub}
                              </div>
                            )}
                            {anime.dub && anime.dub !== "0" && (
                              <div className="bg-[#6b4cff] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Mic className="w-3 h-3" />
                                {anime.dub}
                              </div>
                            )}
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 rounded-full bg-[#FF3E3E] flex items-center justify-center shadow-[0_0_20px_rgba(255,62,62,0.5)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 text-white ml-1" />
                            </div>
                          </div>
                        </div>

                        <h3 className="font-semibold text-sm text-white/90 line-clamp-2 group-hover:text-[#FF3E3E] transition-colors leading-snug">
                          {anime.title}
                        </h3>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {view === "watch" && selectedAnime && selectedEpisode && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setView("info")}
                className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-white group transition-colors"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to {selectedAnime.title}
              </button>
            </div>

            <div className="bg-[#050505] rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-8">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#121212] gap-2 flex-wrap sm:flex-nowrap">
                <h2 className="text-lg font-medium text-white flex items-center gap-2 max-w-full sm:max-w-[50%]">
                  <span className="text-[#FF3E3E] font-bold shrink-0">
                    EP {selectedEpisode.number}
                  </span>
                  <span className="text-[#A0A0A0] text-sm mx-1 shrink-0">
                    &bull;
                  </span>
                  <span className="truncate">
                    {selectedEpisode.title || selectedAnime.title}
                  </span>
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {sourceLink && proxyNeeded && (
                    <button
                      onClick={() => setShowDownloaderModal(true)}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors border border-white/10"
                      title="Download options for this episode"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                </div>
              </div>

              <div className="aspect-video bg-black relative">
                {loading || (serverLoading && !error) ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#FF3E3E] animate-spin" />
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#FF3E3E] gap-3 p-6 text-center bg-[#121212]/50">
                    <AlertCircle className="w-10 h-10 shadow-sm" />
                    <p className="font-medium">{error}</p>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                      <button
                        onClick={() =>
                          selectedServer
                            ? selectServer(selectedServer)
                            : selectedEpisode && watchEpisode(selectedEpisode)
                        }
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 hover:border-white/20"
                      >
                        Try Again
                      </button>
                      <a
                        href={externalWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#FF3E3E]/20 hover:bg-[#FF3E3E]/30 text-[#FF3E3E] rounded-lg text-sm font-medium transition-colors border border-[#FF3E3E]/20 hover:border-[#FF3E3E]/30"
                      >
                        Watch Externally
                      </a>
                      <button
                        onClick={handleReportIssue}
                        disabled={reportState !== "idle"}
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors border ${
                          reportState === "reported"
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                            : "bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white border-white/5 hover:border-white/10"
                        }`}
                      >
                        {reportState === "idle" && (
                          <>
                            <Bug className="w-4 h-4" /> Report Issue
                          </>
                        )}
                        {reportState === "reporting" && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {reportState === "reported" && (
                          <>
                            <CheckCircle className="w-4 h-4" /> Reported!
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : sourceLink ? (
                  sourceLink.includes('.m3u8') || proxyNeeded ? (
                    <HlsPlayer
                      src={sourceLink}
                      tracks={sourceTracks}
                      onEnded={handleVideoEnded}
                      proxyNeeded={proxyNeeded}
                    />
                  ) : (
                    <>
                      <iframe
                        src={sourceLink}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        className="w-full h-full border-0 relative z-10"
                      ></iframe>
                      {/* Information overlay that appears behind the iframe just in case the iframe returns fake 404 natively without crashing our React app */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A0A0A0] text-center p-8 z-0">
                        <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                        <p className="mb-2">
                          If the video fails to load due to{" "}
                          <strong>browser streaming restrictions</strong>,
                        </p>
                        <a
                          href={externalWatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF3E3E] hover:underline underline-offset-4"
                        >
                          Click here to watch it safely in a new tab
                        </a>
                      </div>
                    </>
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A0A0A0] flex-col gap-2">
                    <Info className="w-8 h-8 opacity-50" />
                    <p>Select a server to play video</p>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 bg-[#121212]">
                <div className="mb-4">
                  <h3 className="text-sm text-[#A0A0A0] font-medium uppercase tracking-wider">
                    Available Servers
                  </h3>
                </div>
                {error && servers.length === 0 ? (
                  <div className="text-sm text-[#FF3E3E] p-4 bg-[#FF3E3E]/10 rounded-lg border border-[#FF3E3E]/20 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                      {externalWatchUrl && (
                        <a
                          href={externalWatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#FF3E3E]/20 hover:bg-[#FF3E3E]/30 text-[#FF3E3E] rounded-md text-xs font-medium transition-colors border border-[#FF3E3E]/20 hover:border-[#FF3E3E]/30"
                        >
                          Watch Externally
                        </a>
                      )}
                      <button
                        onClick={handleReportIssue}
                        disabled={reportState !== "idle"}
                        className={`px-3 py-1.5 flex items-center gap-2 rounded-md text-xs font-medium transition-colors border ${
                          reportState === "reported"
                            ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                            : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                        }`}
                      >
                        {reportState === "idle" && (
                          <>
                            <Bug className="w-3.5 h-3.5" /> Report Issue
                          </>
                        )}
                        {reportState === "reporting" && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {reportState === "reported" && (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Reported!
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : servers.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {/* Sub Servers Group */}
                    {servers.some((s) => s.type === "sub") && (
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-2.5 py-1.5 rounded-md text-white shrink-0 sm:mt-0.5 w-fit shadow-sm">
                          <Captions className="w-4 h-4 text-[#FF3E3E]" />
                          SUB
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {servers
                            .filter((s) => s.type === "sub")
                            .map((server) => (
                              <button
                                key={server.id}
                                onClick={() => selectServer(server)}
                                title={
                                  serverErrors[server.id]
                                    ? "Server reported an error. Click to retry."
                                    : ""
                                }
                                disabled={
                                  serverLoading &&
                                  selectedServer?.id === server.id
                                }
                                className={`group relative flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all duration-300 ${
                                  selectedServer?.id === server.id
                                    ? "bg-[#FF3E3E] text-white border-[#FF3E3E] shadow-[0_0_15px_rgba(255,62,62,0.4)] ring-2 ring-offset-2 ring-offset-[#121212] ring-[#FF3E3E]/50 scale-105 z-10"
                                    : serverErrors[server.id]
                                      ? "bg-[#FF3E3E]/10 border-[#FF3E3E]/50 text-[#FF3E3E] border-dashed shadow-[0_0_10px_rgba(255,62,62,0.1)] hover:bg-[#FF3E3E]/20"
                                      : "bg-[#1a1a1a] text-[#A0A0A0] border-white/5 hover:bg-white/10 hover:text-white hover:scale-[1.02] opacity-70 hover:opacity-100"
                                } disabled:cursor-wait`}
                              >
                                {serverLoading &&
                                selectedServer?.id === server.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white drop-shadow-md" />
                                ) : serverErrors[server.id] ? (
                                  <ServerCrash className="w-4 h-4 text-[#FF3E3E] shrink-0 drop-shadow-[0_0_5px_rgba(255,62,62,0.6)]" />
                                ) : (
                                  <ServerIcon
                                    className={`w-4 h-4 transition-colors ${selectedServer?.id === server.id ? "text-white" : "text-[#FF3E3E]/60 group-hover:text-[#FF3E3E]"}`}
                                  />
                                )}
                                {server.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Dub Servers Group */}
                    {servers.some((s) => s.type === "dub") && (
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-2.5 py-1.5 rounded-md text-white shrink-0 sm:mt-0.5 w-fit shadow-sm">
                          <Mic className="w-4 h-4 text-[#FF3E3E]" />
                          DUB
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {servers
                            .filter((s) => s.type === "dub")
                            .map((server) => (
                              <button
                                key={server.id}
                                onClick={() => selectServer(server)}
                                title={
                                  serverErrors[server.id]
                                    ? "Server reported an error. Click to retry."
                                    : ""
                                }
                                disabled={
                                  serverLoading &&
                                  selectedServer?.id === server.id
                                }
                                className={`group relative flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all duration-300 ${
                                  selectedServer?.id === server.id
                                    ? "bg-[#FF3E3E] text-white border-[#FF3E3E] shadow-[0_0_15px_rgba(255,62,62,0.4)] ring-2 ring-offset-2 ring-offset-[#121212] ring-[#FF3E3E]/50 scale-105 z-10"
                                    : serverErrors[server.id]
                                      ? "bg-[#FF3E3E]/10 border-[#FF3E3E]/50 text-[#FF3E3E] border-dashed shadow-[0_0_10px_rgba(255,62,62,0.1)] hover:bg-[#FF3E3E]/20"
                                      : "bg-[#1a1a1a] text-[#A0A0A0] border-white/5 hover:bg-white/10 hover:text-white hover:scale-[1.02] opacity-70 hover:opacity-100"
                                } disabled:cursor-wait`}
                              >
                                {serverLoading &&
                                selectedServer?.id === server.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white drop-shadow-md" />
                                ) : serverErrors[server.id] ? (
                                  <ServerCrash className="w-4 h-4 text-[#FF3E3E] shrink-0 drop-shadow-[0_0_5px_rgba(255,62,62,0.6)]" />
                                ) : (
                                  <ServerIcon
                                    className={`w-4 h-4 transition-colors ${selectedServer?.id === server.id ? "text-white" : "text-[#FF3E3E]/60 group-hover:text-[#FF3E3E]"}`}
                                  />
                                )}
                                {server.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Raw Servers Group */}
                    {servers.some((s) => s.type === "raw") && (
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-2.5 py-1.5 rounded-md text-white shrink-0 sm:mt-0.5 w-fit shadow-sm">
                          <Play className="w-4 h-4 text-[#FF3E3E]" />
                          RAW
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {servers
                            .filter((s) => s.type === "raw")
                            .map((server) => (
                              <button
                                key={server.id}
                                onClick={() => selectServer(server)}
                                title={
                                  serverErrors[server.id]
                                    ? "Server reported an error. Click to retry."
                                    : ""
                                }
                                disabled={
                                  serverLoading &&
                                  selectedServer?.id === server.id
                                }
                                className={`group relative flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all duration-300 ${
                                  selectedServer?.id === server.id
                                    ? "bg-[#FF3E3E] text-white border-[#FF3E3E] shadow-[0_0_15px_rgba(255,62,62,0.4)] ring-2 ring-offset-2 ring-offset-[#121212] ring-[#FF3E3E]/50 scale-105 z-10"
                                    : serverErrors[server.id]
                                      ? "bg-[#FF3E3E]/10 border-[#FF3E3E]/50 text-[#FF3E3E] border-dashed shadow-[0_0_10px_rgba(255,62,62,0.1)] hover:bg-[#FF3E3E]/20"
                                      : "bg-[#1a1a1a] text-[#A0A0A0] border-white/5 hover:bg-white/10 hover:text-white hover:scale-[1.02] opacity-70 hover:opacity-100"
                                } disabled:cursor-wait`}
                              >
                                {serverLoading &&
                                selectedServer?.id === server.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white drop-shadow-md" />
                                ) : serverErrors[server.id] ? (
                                  <ServerCrash className="w-4 h-4 text-[#FF3E3E] shrink-0 drop-shadow-[0_0_5px_rgba(255,62,62,0.6)]" />
                                ) : (
                                  <ServerIcon
                                    className={`w-4 h-4 transition-colors ${selectedServer?.id === server.id ? "text-white" : "text-[#FF3E3E]/60 group-hover:text-[#FF3E3E]"}`}
                                  />
                                )}
                                {server.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 text-[#FF3E3E] animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-[#A0A0A0] bg-white/5 rounded-xl border border-white/10 text-center gap-3">
                    <ServerIcon className="w-8 h-8 opacity-50" />
                    <p>
                      We couldn't find any servers for this episode right now.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Episodes List in Watch View */}
            {animeInfo && animeInfo.episodes.length > 0 && (
              <div className="bg-[#050505] rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-4 md:p-6 mb-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">Episodes</h2>
                    <span className="text-sm text-[#A0A0A0]">
                      {animeInfo.episodes.length} episodes
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors shrink-0">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded appearance-none cursor-pointer border border-white/20 checked:bg-[#FF3E3E] checked:border-[#FF3E3E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3E3E] relative flex items-center justify-center after:content-[''] after:absolute after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-translate-y-[1px] transition-all"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)} 
                    />
                    <span className="text-sm font-medium text-white/80 select-none">Auto-play next</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {animeInfo.episodes.map((ep) => (
                    <button
                      key={ep.id}
                      ref={(el) => {
                        if (el && selectedEpisode?.id === ep.id) {
                          (
                            selectedEpisodeRef as React.MutableRefObject<HTMLButtonElement | null>
                          ).current = el;
                        }
                      }}
                      onClick={() => {
                        if (selectedEpisode?.id !== ep.id) {
                          watchEpisode(ep);
                        }
                      }}
                      className={`border rounded-xl p-3 flex flex-col items-center gap-2 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[#FF3E3E] ${
                        selectedEpisode?.id === ep.id
                          ? "bg-[#FF3E3E] border-[#FF3E3E] shadow-[0_0_15px_rgba(255,62,62,0.5)] text-white scale-[1.03] z-10"
                          : "bg-[#121212] hover:bg-[#FF3E3E]/10 border-white/10 hover:border-[#FF3E3E]/50 text-[#A0A0A0]"
                      }`}
                    >
                      <span
                        className={`text-xs transition-colors ${selectedEpisode?.id === ep.id ? "text-white font-bold" : "group-hover:text-[#FF3E3E]"}`}
                      >
                        Episode {ep.number}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Dropdown Match */}
            {animeInfo &&
              animeInfo.recommended &&
              animeInfo.recommended.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-[#FF3E3E] pl-3">
                    Recommended For You
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {animeInfo.recommended.map((anime) => (
                      <button
                        key={anime.id}
                        onClick={() => {
                          getInfo(anime);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="group text-left outline-none"
                      >
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 border border-white/5 shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-[#FF3E3E]">
                          <img
                            src={anime.poster}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            {anime.sub && anime.sub !== "0" && (
                              <div className="bg-[#FF3E3E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Captions className="w-3 h-3" />
                                {anime.sub}
                              </div>
                            )}
                            {anime.dub && anime.dub !== "0" && (
                              <div className="bg-[#6b4cff] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Mic className="w-3 h-3" />
                                {anime.dub}
                              </div>
                            )}
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 rounded-full bg-[#FF3E3E] flex items-center justify-center shadow-[0_0_20px_rgba(255,62,62,0.5)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 text-white ml-1" />
                            </div>
                          </div>
                        </div>

                        <h3 className="font-semibold text-sm text-white/90 line-clamp-2 group-hover:text-[#FF3E3E] transition-colors leading-snug">
                          {anime.title}
                        </h3>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
        {view === "az" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => {
                    setView("search");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                   A-Z List: <span className="text-[#FF3E3E] uppercase">{selectedLetter === "Other" ? "#" : selectedLetter}</span>
                </h1>
             </div>

             {azResults.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8 mb-8">
                  {azResults.map((anime) => (
                    <div
                      key={anime.id}
                      onClick={() => getInfo(anime)}
                      className="group cursor-pointer flex flex-col gap-3 outline-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && getInfo(anime)}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#121212] shadow-md ring-1 ring-white/10 group-hover:ring-[#FF3E3E]/50 transition-all duration-300">
                        <img
                          src={anime.poster}
                          alt={anime.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <div className="w-10 h-10 rounded-full bg-[#FF3E3E] text-white flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                          {anime.sub && anime.sub !== "0" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-black backdrop-blur-sm shadow-sm flex items-center">
                              SUB {anime.sub}
                            </span>
                          )}
                          {anime.dub && anime.dub !== "0" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FF3E3E]/90 text-white backdrop-blur-sm shadow-sm flex items-center">
                              DUB {anime.dub}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-[#FF3E3E] transition-colors">
                          {anime.title}
                        </h3>
                        <p className="text-xs text-[#A0A0A0] mt-1.5 flex items-center gap-2">
                          <span>{anime.type}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span>{anime.duration}</span>
                        </p>
                      </div>
                    </div>
                  ))}
               </div>
             ) : azLoading ? null : (
               <div className="text-center py-20 text-[#A0A0A0]">
                 No results found for this letter.
               </div>
             )}

             {azLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-[#FF3E3E] animate-spin" />
                </div>
             )}
             {!hasMoreAz && azResults.length > 0 && (
                <div className="text-center py-8 text-[#A0A0A0] text-sm font-medium">
                  You've reached the end of the list.
                </div>
             )}
             
             {/* Infinite scroll marker */}
             {hasMoreAz && !azLoading && azResults.length > 0 && (
               <div ref={observerRef} className="h-10 w-full" />
             )}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-white/5 bg-[#0a0a0a] pt-10 pb-8 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative z-10 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
             A-Z Anime List
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button 
              onClick={() => handleLetterSelect("All")} 
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedLetter === "All" ? "bg-[#FF3E3E] text-white shadow-lg shadow-[#FF3E3E]/20" : "bg-white/5 text-[#A0A0A0] hover:bg-white/10 hover:text-white border border-white/5"}`}
            >
              All
            </button>
            <button 
              onClick={() => handleLetterSelect("Other")} 
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedLetter === "Other" ? "bg-[#FF3E3E] text-white shadow-lg shadow-[#FF3E3E]/20" : "bg-white/5 text-[#A0A0A0] hover:bg-white/10 hover:text-white border border-white/5"}`}
            >
              #
            </button>
            {["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"].map(char => (
               <button 
                 key={char} 
                 onClick={() => handleLetterSelect(char)}
                 className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${selectedLetter === char ? "bg-[#FF3E3E] text-white shadow-lg shadow-[#FF3E3E]/20 scale-110" : "bg-white/5 text-[#A0A0A0] hover:bg-white/10 hover:text-white hover:scale-105 border border-white/5"}`}
               >
                 {char}
               </button>
            ))}
          </div>
          <p className="text-xs text-[#A0A0A0]/50 mt-10 text-center uppercase tracking-wider font-medium">
             © {new Date().getFullYear()} ANIMXER
          </p>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333333;
        }
      `,
        }}
      />

      <AnimatePresence>
        {showDownloaderModal && sourceLink && proxyNeeded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDownloaderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Download className="w-6 h-6 text-[#FF3E3E]" />
                Offline Downloading
              </h2>
              <p className="text-[#A0A0A0] text-sm mb-6 leading-relaxed">
                We've extracted the raw HLS (M3U8) stream for this episode. You
                can copy this link and paste it into any web-based downloader or
                media player (like VLC) to capture it offline.
              </p>

              <div className="bg-[#050505] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 mb-6">
                <div className="truncate text-xs font-mono text-[#A0A0A0] cursor-text select-all overflow-x-hidden">
                  {sourceLink}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sourceLink);
                    setDownloadLinkCopied(true);
                    setTimeout(() => setDownloadLinkCopied(false), 2000);
                  }}
                  className={`shrink-0 p-2 rounded-lg transition-colors border ${downloadLinkCopied ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-white/5 hover:bg-white/10 text-white border-white/10"}`}
                  title="Copy link"
                >
                  {downloadLinkCopied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => setShowDownloaderModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Close
                </button>
                <a
                  href={`https://9xbuddy.com/process?url=${encodeURIComponent(sourceLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 text-sm font-bold bg-[#FF3E3E] hover:bg-[#ff5555] text-white rounded-xl shadow-lg shadow-[#FF3E3E]/20 transition-all hover:scale-105"
                >
                  Download using 9xbuddy
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
