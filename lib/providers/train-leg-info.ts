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

let cachedRTTAccessToken: string | null = null;
let cachedRTTAccessTokenExpiry: number = 0;

async function getRTTAccessToken() {
  if (cachedRTTAccessToken && Date.now() < cachedRTTAccessTokenExpiry - 60000) {
    return cachedRTTAccessToken;
  }

  const refreshToken = process.env.RTT_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Missing RTT refresh token");
  }

  const response = await fetch("https://data.rtt.io/api/get_access_token", {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get RTT access token: ${response.statusText}`);
  }

  const data = await response.json();

  cachedRTTAccessToken = data.token;
  cachedRTTAccessTokenExpiry = Date.parse(data.validUntil);

  return data.token;
}

export async function fetchTrainData(
  leg: TrainLeg,
  currentTime: Date,
): Promise<TrainData[] | null> {
  try {
    const accessToken = await getRTTAccessToken();

    const timeFrom = new Date(currentTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before currentTime

    const departureParams = new URLSearchParams({
      code: `gb-nr:${leg.from}`,
      filterTo: `gb-nr:${leg.to}`,
      timeFrom: timeFrom.toISOString(),
      timeTo: currentTime.toISOString(),
    });

    const arrivalParams = new URLSearchParams({
      code: `gb-nr:${leg.to}`,
      filterFrom: `gb-nr:${leg.from}`,
      timeFrom: timeFrom.toISOString(),
      timeTo: currentTime.toISOString(),
    });

    const [departureResponse, arrivalResponse] = await Promise.all([
      fetch(`https://data.rtt.io/rtt/location?${departureParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      fetch(`https://data.rtt.io/rtt/location?${arrivalParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    if (!departureResponse.ok || !arrivalResponse.ok) {
      console.log(
        `Failed to fetch train data: ${departureResponse.statusText} | ${arrivalResponse.statusText}`,
      );
      return null;
    }

    const departureData = await departureResponse.json();
    const arrivalData = await arrivalResponse.json();

    const departures = new Map<string, RTTService>();

    for (const service of departureData.services) {
      departures.set(service.scheduleMetadata.uniqueIdentity, service);
    }

    const trainData: TrainData[] = [];

    for (const arrivalService of arrivalData.services) {
      const id = arrivalService.scheduleMetadata.uniqueIdentity;

      if (!id) {
        continue;
      }

      const departureService = departures.get(id);

      if (!departureService) {
        continue;
      }

      const departure =
        departureService.temporalData?.departure ??
        departureService.temporalData?.pass;
      const arrival =
        arrivalService.temporalData?.arrival ??
        arrivalService.temporalData?.pass;

      if (!departure || !arrival) {
        continue;
      }

      const arrivalScheduled =
        arrival.scheduleAdvertised ?? arrival.scheduleInternal;
      const departureScheduled =
        departure.scheduleAdvertised ?? departure.scheduleInternal;

      if (!arrivalScheduled || !departureScheduled) {
        continue;
      }

      const delayMinutes =
        arrival.realtimeAdvertisedLateness ??
        departure.realtimeAdvertisedLateness ??
        0;
      const status: TrainData["status"] =
        arrival.isCancelled || departure.isCancelled
          ? "cancelled"
          : delayMinutes > 1
            ? "delayed"
            : "on time";

      trainData.push({
        id,

        operatorName: departureService.scheduleMetadata.operator.name,

        arrival: {
          scheduled: arrivalScheduled,
          estimated:
            arrival.realtimeActual ??
            arrival.realtimeForecast ??
            arrival.realtimeEstimate,
        },

        departure: {
          scheduled: departureScheduled,
          estimated:
            departure.realtimeActual ??
            departure.realtimeForecast ??
            departure.realtimeEstimate,
        },

        platform:
          departureService.locationMetadata?.platform?.actual ??
          departureService.locationMetadata?.platform?.forecast ??
          departureService.locationMetadata?.platform?.planned,

        status,
        delayMinutes,
      });
    }

    return trainData;
  } catch (error) {
    console.log("Error fetching train data:", error);

    throw error;
  }
}
