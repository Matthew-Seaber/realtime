import { NextResponse } from "next/server";

import { JourneyOptions } from "@/lib/journey-options";
import { fetchTrainData } from "@/lib/providers/train-leg-info";
import { fetchBusData } from "@/lib/providers/bus-leg-info";

export async function GET() {
  const arrivalTime = new Date();
  arrivalTime.setHours(9, 0, 0, 0);

  try {
    for (const journey of JourneyOptions) {
      let currentTime = arrivalTime;

      for (const leg of journey.legs.toReversed()) {
        let duration;

        if (leg.type === "train") {
          const trainData = await fetchTrainData(leg, currentTime);

          duration =
            trainData.duration * 60 * 1000 +
            journey.connectionMinutesRequired * 60 * 1000;
        } else if (leg.type === "bus") {
          const busData = await fetchBusData(leg, currentTime);

          duration =
            busData.duration * 60 * 1000 +
            journey.connectionMinutesRequired * 60 * 1000;
        } else if (leg.type === "walk") {
          duration = leg.duration * 60 * 1000;
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
    }
  } catch (error) {
    console.log("Error fetching data:", error);

    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
