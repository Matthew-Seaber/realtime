"use client";

import { useEffect, useState } from "react";

import JourneyLeg from "@/components/JourneyLeg";

import { Separator } from "@/components/ui/separator";
import { ArrowRight, Split } from "lucide-react";

interface TrainLegResult {
  type: "train";

  from: string; // CRS code
  to: string; // CRS code
  fromName: string;
  toName: string;

  operatorName: string;

  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;

  platform?: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

interface BusLegResult {
  type: "bus";

  from: string; // ATCO code
  to: string; // ATCO code
  fromName: string;
  toName: string;

  busService?: string;

  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

interface WalkingLegResult {
  type: "walk";

  description: string;
  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;
}

type JourneyLegResult = TrainLegResult | BusLegResult | WalkingLegResult;

interface JourneyResult {
  id: string;
  description: string;
  legs: JourneyLegResult[];
  connectionMinutesRequired: number;
}

export default function Home() {
  const [journeyOptions, setJourneyOptions] = useState<JourneyResult[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated] = useState(new Date());
  const [lastUpdatedVisible, setLastUpdatedVisible] = useState(false);
  const [bestRouteStatus, setBestRouteStatus] = useState<
    "early" | "close to start" | "late"
  >("early");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const arrivalTime = new Date();
      arrivalTime.setHours(17, 0, 0, 0);

      if (new Date(arrivalTime) < new Date()) return;

      const response = await fetch(
        `/api/fetch_full_data?arrivalTime=${arrivalTime.toISOString()}`,
      );

      if (!response.ok) {
        console.error("Failed to fetch data:", response.statusText);

        return;
      }

      const data = (await response.json()) as {
        bestRoute: JourneyResult;
        secondBestRoute: JourneyResult | null;
        thirdBestRoute: JourneyResult | null;
      };

      if (!data.bestRoute || !data.bestRoute.legs) {
        console.error("No viable route found");

        return;
      }

      setJourneyOptions(
        [data.bestRoute, data.secondBestRoute, data.thirdBestRoute].filter(
          (route): route is JourneyResult => route !== null,
        ),
      );

      const bestRouteLastLeg = data.bestRoute.legs.at(-1);

      if (!bestRouteLastLeg) {
        console.error("No last leg found on the best route");

        return;
      }

      const bestDateArrivalTime = new Date(bestRouteLastLeg.arrivalTime);

      if (bestDateArrivalTime > new Date(arrivalTime)) {
        setBestRouteStatus("late");
      } else if (
        bestDateArrivalTime > new Date(arrivalTime.getTime() - 5 * 60 * 1000)
      ) {
        setBestRouteStatus("close to start");
      } else {
        setBestRouteStatus("early");
      }

      setLoading(false);
    }

    fetchData();
  }, []);

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

  function formatDuration(duration: number): string {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return `${hours > 0 ? `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}` : `${minutes} min${minutes === 1 ? "" : "s"}`}`;
  }

  if (loading) {
    return (
      <div className="matrix-dots flex items-center justify-center min-h-screen p-6 font-mono">
        <h1 className="text-4xl cursor-default">Fetching the latest data...</h1>
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

      <div className="w-full flex flex-row items-center justify-between gap-4">
        <div className="basis-3/5 flex flex-col gap-2 border-t border-theme-blue/60 p-6">
          <div className="flex flex-col">
            {journeyOptions[0].legs.map((leg, index) => (
              <JourneyLeg
                key={index}
                leg={leg}
                lastLeg={index === journeyOptions[0].legs.length - 1}
              />
            ))}
          </div>

          <Separator />

          <div className="flex flex-row items-center justify-between gap-4 text-theme-blue text-xl">
            <p className="font-semibold">Total journey time</p>
            <p>
              {formatDuration(
                journeyOptions[0].legs.reduce(
                  (sum, leg) => sum + leg.duration,
                  0,
                ),
              )}
            </p>
          </div>
        </div>

        <div className="basis-2/5 flex flex-col gap-4 border border-theme-blue/60 p-6 text-theme-blue">
          <div className="flex flex-row items-center gap-4">
            <Split strokeWidth={2.25} className="size-8 shrink-0" />

            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-2xl">Alternative route</h3>
              <p>{journeyOptions[1].description}</p>
            </div>
          </div>

          <div className="flex flex-col">
            {journeyOptions[1].legs.map((leg, index) => (
              <JourneyLeg
                key={index}
                leg={leg}
                lastLeg={index === journeyOptions[1].legs.length - 1}
              />
            ))}
          </div>

          <Separator />

          <div className="flex flex-row items-center justify-between gap-4">
            <p className="font-semibold">Total journey time</p>
            <p>
              {formatDuration(
                journeyOptions[1].legs.reduce(
                  (sum, leg) => sum + leg.duration,
                  0,
                ),
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
