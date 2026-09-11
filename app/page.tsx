"use client";

import { useEffect, useState } from "react";

import { ArrowRight } from "lucide-react";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated] = useState(new Date());
  const [lastUpdatedVisible, setLastUpdatedVisible] = useState(false);
  const [bestRouteStatus, setBestRouteStatus] = useState<
    "early" | "close to start" | "late"
  >("early");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdatedVisible((prevVisible) => !prevVisible);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="matrix-dots flex items-center justify-center min-h-screen p-6 font-mono">
        <h1 className="text-4xl">Fetching the latest data...</h1>
      </div>
    );
  }

  return (
    <div className="matrix-dots flex flex-col justify-between gap-4 min-h-screen p-12 font-mono">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-4">
          <h1 className="flex flex-row items-center gap-4 text-7xl">
            <span>{process.env.NEXT_PUBLIC_START_PLACE_NAME}</span>
            <ArrowRight className="shrink-0 size-12" />
            <span>{process.env.NEXT_PUBLIC_END_PLACE_NAME}</span>
          </h1>

          <h2
            className={`text-5xl ${bestRouteStatus === "early" ? "text-theme-green" : bestRouteStatus === "close to start" ? "text-theme-amber" : "text-theme-red"}`}
          >
            Best route - Arrives {bestRouteStatus}
          </h2>
        </div>

        <div className="text-theme-blue">
          {!lastUpdatedVisible ? (
            <p className="text-4xl">{currentTime.toLocaleTimeString()}</p>
          ) : (
            <div className="flex flex-col items-end">
              <p className="text-xl">Last updated</p>
              <p
                className={`text-4xl ${lastUpdated.getTime() < currentTime.getTime() - 600000 ? "text-theme-red" : lastUpdated.getTime() < currentTime.getTime() - 300000 ? "text-theme-amber" : ""}`}
              >
                {lastUpdated.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-4">
        <div className="border border-theme-blue"></div>
        <div className="border border-theme-blue"></div>
      </div>
    </div>
  );
}
