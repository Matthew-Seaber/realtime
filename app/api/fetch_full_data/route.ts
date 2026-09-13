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
}

interface WalkingLegResult {
  type: "walk";

  description: string;
  duration: number; // In minutes

  departureTime: string;
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

export async function GET() {
  const arrivalTime = new Date();
  arrivalTime.setHours(9, 0, 0, 0);

  if (arrivalTime < new Date()) {
    return NextResponse.json(
      { error: "Arrival time is in the past" },
      { status: 400 },
    );
  }

  const topRoutes = [] as Route[];

  try {
    for (const journey of JourneyOptions) {
      let currentTime = arrivalTime;

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
                currentTime.getTime() &&
              new Date(train.departure.estimated).getTime() <=
                new Date().getTime(),
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

          duration =
            busData.duration * 60 * 1000 +
            journey.connectionMinutesRequired * 60 * 1000;
        } else if (leg.type === "walk") {
          duration = leg.duration * 60 * 1000;

          legResults.push({
            type: "walk",

            description: leg.description,
            duration: leg.duration,

            departureTime: new Date(
              currentTime.getTime() - duration,
            ).toISOString(),
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

      if (currentTime >= new Date() && currentTime < arrivalTime) {
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
