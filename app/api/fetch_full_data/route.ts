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

  departureTime: string;
  arrivalTime: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

interface WalkingLegResult {
  type: "walk";

  description: string;

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

  if (!arrivalTime) {
    return NextResponse.json(
      { error: "Missing parameter: arrivalTime" },
      { status: 400 },
    );
  }

  if (new Date(arrivalTime) < new Date()) {
    return NextResponse.json(
      { error: "Arrival time is in the past" },
      { status: 400 },
    );
  }

  const topRoutes = [] as Route[];

  try {
    for (const journey of JourneyOptions) {
      let currentTime = new Date(arrivalTime);

      const legResults: JourneyLegResult[] = [];

      for (const leg of journey.legs.toReversed()) {
        let duration;

        if (leg.type === "train") {
          const trainData = await fetchTrainData(leg, currentTime);

          if (!trainData || trainData.length === 0) {
            break;
          }

          const validTrains = trainData.filter(
            (train) =>
              train.status !== "cancelled" &&
              train.arrival.estimated &&
              train.departure.estimated &&
              new Date(train.arrival.estimated).getTime() <=
                currentTime.getTime(),
          );

          if (validTrains.length === 0) {
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

            departureTime: bestTrain.departure.estimated!,
            arrivalTime: bestTrain.arrival.estimated!,

            platform: bestTrain.platform,

            status: bestTrain.status,
            delayMinutes: bestTrain.delayMinutes,
          });

          duration =
            new Date(bestTrain.arrival.estimated!).getTime() -
            new Date(bestTrain.departure.estimated!).getTime() +
            journey.connectionMinutesRequired * 60 * 1000;
        } else if (leg.type === "bus") {
          const busData = await fetchBusData(leg, currentTime);

          if (!busData) {
            break;
          }

          legResults.push({
            type: "bus",

            from: leg.from,
            to: leg.to,
            fromName: leg.fromName,
            toName: leg.toName,

            busService: busData.busService,

            departureTime: busData.departure.estimated!,
            arrivalTime: busData.arrival.estimated!,

            status: busData.status,
            delayMinutes: busData.delayMinutes,
          });

          duration =
            new Date(busData.arrival.estimated!).getTime() -
            new Date(busData.departure.estimated!).getTime() +
            journey.connectionMinutesRequired * 60 * 1000;
        } else if (leg.type === "walk") {
          duration = leg.duration * 60 * 1000;

          legResults.push({
            type: "walk",

            description: leg.description,

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

        currentTime = new Date(currentTime.getTime() - duration);

        if (currentTime < new Date()) {
          break;
        }
      }

      const detailedJourney: JourneyResult = {
        id: journey.id,
        description: journey.description,
        legs: legResults.reverse(),
        connectionMinutesRequired: journey.connectionMinutesRequired,
      };

      if (currentTime >= new Date() && currentTime < new Date(arrivalTime)) {
        if (currentTime < topRoutes[0]?.startTime || !topRoutes[0]) {
          topRoutes[0] = {
            startTime: currentTime,
            rank: 1,

            detailedJourney: detailedJourney,
          };
        } else if (currentTime < topRoutes[1]?.startTime || !topRoutes[1]) {
          topRoutes[1] = {
            startTime: currentTime,
            rank: 2,

            detailedJourney: detailedJourney,
          };
        } else if (currentTime < topRoutes[2]?.startTime || !topRoutes[2]) {
          topRoutes[2] = {
            startTime: currentTime,
            rank: 3,

            detailedJourney: detailedJourney,
          };
        }
      }
    }

    return NextResponse.json(
      {
        bestRoute: topRoutes[0].detailedJourney,
        secondBestRoute: topRoutes[1].detailedJourney,
        thirdBestRoute: topRoutes[2].detailedJourney,
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
