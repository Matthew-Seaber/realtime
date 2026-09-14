import { NextResponse } from "next/server";

import { JourneyOptions } from "@/lib/journey-options";
import { fetchTrainData } from "@/lib/providers/train-leg-info";
import { fetchBusData } from "@/lib/providers/bus-leg-info";

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

  busService: string;
  direction: string;

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

interface Route {
  rank: number;
  startTime: Date;

  detailedJourney: JourneyResult;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const arrivalTime = url.searchParams.get("arrivalTime");
  const now = new Date();

  if (!arrivalTime) {
    return NextResponse.json(
      { error: "Missing parameter: arrivalTime" },
      { status: 400 },
    );
  }

  const targetArrivalTime = new Date(arrivalTime);

  if (Number.isNaN(targetArrivalTime.getTime())) {
    return NextResponse.json(
      { error: "Invalid parameter: arrivalTime" },
      { status: 400 },
    );
  }

  if (targetArrivalTime < now) {
    return NextResponse.json(
      { error: "Arrival time is in the past" },
      { status: 400 },
    );
  }

  const topRoutes = [] as Route[];

  try {
    for (const journey of JourneyOptions) {
      let currentTime = new Date(targetArrivalTime);
      let routeFailed = false;

      const legResults: JourneyLegResult[] = [];

      for (const leg of journey.legs.toReversed()) {
        let duration;

        if (leg.type === "train") {
          const trainData = await fetchTrainData(leg, currentTime);

          if (!trainData || trainData.length === 0) {
            routeFailed = true;
            break;
          }

          const validTrains = trainData.filter(
            (train) =>
              train.status !== "cancelled" &&
              train.arrival.estimated &&
              train.departure.estimated &&
              !Number.isNaN(new Date(train.arrival.estimated).getTime()) &&
              !Number.isNaN(new Date(train.departure.estimated).getTime()) &&
              new Date(train.departure.estimated).getTime() <=
                new Date(train.arrival.estimated).getTime() &&
              new Date(train.arrival.estimated).getTime() <=
                currentTime.getTime(),
          );

          if (validTrains.length === 0) {
            routeFailed = true;
            break;
          }

          const bestTrain = validTrains.reduce((best, currentTrain) => {
            if (!best) return currentTrain;

            const closerArrival =
              new Date(currentTrain.arrival.estimated!).getTime() >
              new Date(best.arrival.estimated!).getTime();

            return closerArrival ? currentTrain : best;
          });

          legResults.push({
            type: "train",

            from: leg.from,
            to: leg.to,
            fromName: leg.fromName,
            toName: leg.toName,

            operatorName: bestTrain.operatorName,

            duration:
              (new Date(bestTrain.arrival.estimated!).getTime() -
                new Date(bestTrain.departure.estimated!).getTime()) /
              60000,

            departureTime: bestTrain.departure.estimated!,
            arrivalTime: bestTrain.arrival.estimated!,

            platform: bestTrain.platform,

            status: bestTrain.status,
            delayMinutes: bestTrain.delayMinutes,
          });

          duration =
            new Date(bestTrain.arrival.estimated!).getTime() -
            new Date(bestTrain.departure.estimated!).getTime();

          currentTime = new Date(
            new Date(bestTrain.departure.estimated!).getTime() -
              journey.connectionMinutesRequired * 60000,
          );
        } else if (leg.type === "bus") {
          const busData = await fetchBusData(leg, currentTime);

          if (!busData) {
            routeFailed = true;
            break;
          }

          legResults.push({
            type: "bus",

            from: leg.from,
            to: leg.to,
            fromName: leg.fromName,
            toName: leg.toName,

            busService: busData.busService,
            direction: busData.direction,

            duration:
              (new Date(busData.arrival.estimated!).getTime() -
                new Date(busData.departure.estimated!).getTime()) /
              60000,

            departureTime: busData.departure.estimated!,
            arrivalTime: busData.arrival.estimated!,

            status: busData.status,
            delayMinutes: busData.delayMinutes,
          });

          duration =
            new Date(busData.arrival.estimated!).getTime() -
            new Date(busData.departure.estimated!).getTime();

          currentTime = new Date(
            new Date(busData.departure.estimated!).getTime() -
              journey.connectionMinutesRequired * 60000,
          );
        } else if (leg.type === "walk") {
          duration = leg.duration * 60000;

          legResults.push({
            type: "walk",

            description: leg.description,
            duration: leg.duration,

            departureTime: new Date(
              currentTime.getTime() - duration,
            ).toISOString(),
            arrivalTime: currentTime.toISOString(),
          });
        } else {
          return NextResponse.json(
            { error: "Invalid leg type" },
            { status: 400 },
          );
        }

        if (leg.type === "walk") {
          currentTime = new Date(currentTime.getTime() - duration);
        }

        if (currentTime < now) {
          routeFailed = true;
          break;
        }
      }

      if (routeFailed) {
        continue;
      }

      const detailedJourney: JourneyResult = {
        id: journey.id,
        description: journey.description,
        legs: legResults.reverse(),
        connectionMinutesRequired: journey.connectionMinutesRequired,
      };

      if (currentTime >= now && currentTime < targetArrivalTime) {
        topRoutes.push({
          startTime: currentTime,
          rank: 0,
          detailedJourney,
        });

        topRoutes.sort(
          (first, second) =>
            first.startTime.getTime() - second.startTime.getTime(),
        );
        topRoutes.splice(3);
      }
    }

    return NextResponse.json(
      {
        bestRoute: topRoutes[0].detailedJourney,
        secondBestRoute: topRoutes[1]?.detailedJourney ?? null,
        thirdBestRoute: topRoutes[2]?.detailedJourney ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error fetching data:", error);

    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
