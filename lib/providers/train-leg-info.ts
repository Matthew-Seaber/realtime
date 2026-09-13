import { NextResponse } from "next/server";

interface TrainLeg {
  type: "train";
  from: string; // CRS code
  to: string; // CRS code
  fromName: string;
  toName: string;
}

export async function fetchTrainData(leg: TrainLeg, currentTime: Date) {
  try {
    const params = new URLSearchParams({});

    const response = await fetch(
      `https://data.rtt.io/rtt/location?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.RTT_API_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch train data: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.log("Error fetching train data:", error);

    return NextResponse.json(
      { error: "Failed to fetch train data" },
      { status: 500 },
    );
  }
}
