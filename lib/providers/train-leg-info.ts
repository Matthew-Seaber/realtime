import { NextResponse } from "next/server";

interface TrainLeg {
  type: "train";
  from: string; // CRS code
  to: string; // CRS code
  fromName: string;
  toName: string;
}

interface RTTTimeData {
  scheduleInternal?: string;
  scheduleAdvertised?: string;

  realtimeForecast?: string;
  realtimeEstimate?: string;
  realtimeActual?: string;

  realtimeNoReport?: boolean;

  realtimeInternalLateness?: number;
  realtimeAdvertisedLateness?: number;

  isCancelled?: boolean;
  cancellationReasonCode?: string;
}

interface RTTService {
  temporalData: {
    arrival?: RTTTimeData;
    departure?: RTTTimeData;
    pass?: RTTTimeData;

    scheduledCallType?: string | null;
    realtimeCallType?: string | null;
    displayAs?: string | null;
    status?: string | null;

    isInterpolated?: boolean;
  };

  locationMetadata: {
    platform?: {
      planned?: string;
      forecast?: string;
      actual?: string;
    };

    line?: {
      planned?: string;
      forecast?: string;
      actual?: string;
    };

    path?: {
      planned?: string;
      forecast?: string;
      actual?: string;
    };

    numberOfVehicles?: number;
    allocationIndex?: number;
    isRequestStop?: boolean;
  };

  scheduleMetadata: {
    uniqueIdentity: string;
    namespace: string;
    identity: string;
    departureDate: string;

    operator: {
      code: string;
      name: string;
    };

    modeType: "TRAIN" | "SHIP" | "BUS" | "SCHEDULED_BUS" | "REPLACEMENT_BUS";
    inPassengerService: boolean;
  };
}

interface TrainData {
  id: string;

  operatorName: string;

  arrival: {
    scheduled: string;
    estimated?: string;
  };

  departure: {
    scheduled: string;
    estimated?: string;
  };

  platform?: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

export async function fetchTrainData(leg: TrainLeg, currentTime: Date) {
  try {
    const params = new URLSearchParams({
      code: `gb-nr:${leg.to}`,
      filterFrom: `gb-nr:${leg.from}`,
      timeFrom: new Date().toISOString(),
      timeTo: currentTime.toISOString(),
    });

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

    const trainData: TrainData[] = data.services.map((service: RTTService) => {
      const scheduleData = service.scheduleMetadata;
      const temporalData = service.temporalData;
      const locationData = service.locationMetadata;

      const delayMinutes =
        temporalData.arrival?.realtimeAdvertisedLateness ??
        temporalData.departure?.realtimeAdvertisedLateness ??
        0;
      const status: TrainData["status"] =
        temporalData.arrival?.isCancelled || temporalData.departure?.isCancelled
          ? "cancelled"
          : delayMinutes > 1
            ? "delayed"
            : "on time";

      return {
        id: scheduleData.uniqueIdentity,

        operatorName: scheduleData.operator.name,

        arrival: {
          scheduled: temporalData.arrival?.scheduleAdvertised ?? "",
          estimated:
            temporalData.arrival?.realtimeActual ??
            temporalData.arrival?.realtimeForecast ??
            "",
        },

        departure: {
          scheduled: temporalData.departure?.scheduleAdvertised ?? "",
          estimated:
            temporalData.departure?.realtimeActual ??
            temporalData.departure?.realtimeForecast ??
            "",
        },

        platform:
          locationData.platform?.actual ??
          locationData.platform?.forecast ??
          locationData.platform?.planned,

        status,
        delayMinutes,
      };
    });

    return NextResponse.json(trainData, { status: 200 });
  } catch (error) {
    console.log("Error fetching train data:", error);

    return NextResponse.json(
      { error: "Failed to fetch train data" },
      { status: 500 },
    );
  }
}
