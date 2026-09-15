interface BusLeg {
  type: "bus";
  from: string; // ATCO code
  to: string; // ATCO code
  fromName: string;
  toName: string;
  busService?: string[];
}

interface TransportAPIDeparture {
  id: string;
  mode: "bus";

  line: string;
  line_name: string;
  direction: string;
  operator_name: string;

  date: string;
  aimed_departure_time: string;

  expected_departure_date?: string;
  expected_departure_time?: string;

  best_departure_estimate: string;

  status?: {
    cancellation?: {
      value?: boolean;
      reason?: string;
    };
  };
}

interface TransportAPIStopTimetable {
  departures: {
    all: TransportAPIDeparture[];
  };
}

interface TransportAPIJourneyStop {
  atcocode: string;
  name: string;

  arrival?: {
    aimed: {
      date: string;
      time: string;
    };
    expected?: {
      date: string;
      time: string;
    };
  };

  departure?: {
    aimed: {
      date: string;
      time: string;
    };
    expected?: {
      date: string;
      time: string;
    };
  };
}

function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

interface TransportAPIJourney {
  id: string;
  mode: "bus";

  line: string;
  line_name: string;
  direction: string;
  operator_name: string;

  stops: TransportAPIJourneyStop[];
}

interface BusData {
  id: string;

  busService: string;
  direction: string;

  arrival: {
    scheduled: string;
    estimated?: string;
  };

  departure: {
    scheduled: string;
    estimated?: string;
  };

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

export async function fetchBusData(
  leg: BusLeg,
  currentTime: Date,
): Promise<BusData | null> {
  try {
    const params = new URLSearchParams({
      app_id: process.env.TRANSPORT_API_APP_ID!,
      app_key: process.env.TRANSPORT_API_APP_KEY!,
      live: "true",
    });

    const arrivalResponse = await fetch(
      `https://transportapi.com/v3/uk/bus/stop_timetables/${leg.to}.json?${params.toString()}`,
    );

    if (!arrivalResponse.ok) {
      const errorText = await arrivalResponse.text();
      console.log(errorText);

      console.log(
        `Failed to fetch bus data: ${arrivalResponse.statusText} (${arrivalResponse.status})`,
      );
      return null;
    }

    const arrivalData: TransportAPIStopTimetable = await arrivalResponse.json();

    const arrivals: TransportAPIDeparture[] = arrivalData.departures.all;

    const filteredArrivals = arrivals.filter((arrival) => {
      if (leg.busService && !leg.busService.includes(arrival.line)) {
        return false;
      }

      if (arrival.status?.cancellation?.value) {
        return false;
      }

      return true;
    });

    const latestDepartureTime = new Date(currentTime.getTime() - 60 * 1000); // Allows for unloading/loading time at the stop

    const viableArrivals = filteredArrivals
      .map((arrival) => {
        const bestDepartureTime = parseDateTime(
          arrival.expected_departure_date ?? arrival.date,
          arrival.best_departure_estimate,
        );
        const scheduledDepartureTime = parseDateTime(
          arrival.date,
          arrival.aimed_departure_time,
        );

        return {
          arrival,
          bestDepartureTime,
          scheduledDepartureTime,
        };
      })
      .filter(({ bestDepartureTime }) => {
        return bestDepartureTime <= latestDepartureTime;
      });

    if (viableArrivals.length === 0) {
      return null;
    }

    viableArrivals.sort(
      (a, b) => b.bestDepartureTime.getTime() - a.bestDepartureTime.getTime(),
    );

    const bestArrivalBus = viableArrivals[0];

    if (!bestArrivalBus) {
      return null;
    }

    const journeyURL = new URL(bestArrivalBus.arrival.id);
    journeyURL.searchParams.set("app_id", process.env.TRANSPORT_API_APP_ID!);
    journeyURL.searchParams.set("app_key", process.env.TRANSPORT_API_APP_KEY!);

    const journeyResponse = await fetch(journeyURL.toString());

    if (!journeyResponse.ok) {
      console.log(
        `Failed to fetch bus journey data: ${journeyResponse.statusText} (${journeyResponse.status})`,
      );

      return null;
    }

    const journeyData: TransportAPIJourney = await journeyResponse.json();
    console.log("Raw bus journey data:", journeyData);

    const departureStop = journeyData.stops.find(
      (stop) => stop.atcocode === leg.from,
    );

    if (!departureStop) {
      console.log("No departure stop found");
      return null;
    }

    const destinationStop = journeyData.stops.find(
      (stop) => stop.atcocode === leg.to,
    );

    const departureAimed = departureStop.departure?.aimed;
    const departureExpected = departureStop.departure?.expected;
    const arrivalAimed = destinationStop?.arrival?.aimed;
    const arrivalExpected = destinationStop?.arrival?.expected;

    if (!departureAimed || !arrivalAimed) {
      console.log("No departure or arrival aimed times");
      return null;
    }

    const departureAimedTime = parseDateTime(
      departureAimed.date,
      departureAimed.time,
    );
    const departureEstimateTime = departureExpected
      ? parseDateTime(departureExpected.date, departureExpected.time)
      : departureAimedTime;
    const arrivalAimedTime = parseDateTime(
      arrivalAimed.date,
      arrivalAimed.time,
    );
    const arrivalEstimateTime = arrivalExpected
      ? parseDateTime(arrivalExpected.date, arrivalExpected.time)
      : arrivalAimedTime;

    if (
      [
        departureAimedTime,
        departureEstimateTime,
        arrivalAimedTime,
        arrivalEstimateTime,
      ].some((time) => Number.isNaN(time.getTime())) ||
      departureEstimateTime >= arrivalEstimateTime
    ) {
      return null;
    }

    const delayMinutes = Math.round(
      (arrivalEstimateTime.getTime() - arrivalAimedTime.getTime()) / 60000,
    );
    const status: BusData["status"] = delayMinutes > 1 ? "delayed" : "on time";

    const busData: BusData = {
      id: bestArrivalBus.arrival.id,

      busService: bestArrivalBus.arrival.line,
      direction: bestArrivalBus.arrival.direction,

      arrival: {
        scheduled: arrivalAimedTime.toISOString(),
        estimated: arrivalEstimateTime.toISOString(),
      },

      departure: {
        scheduled: departureAimedTime.toISOString(),
        estimated: departureEstimateTime.toISOString(),
      },

      status,
      delayMinutes,
    };

    return busData;
  } catch (error) {
    console.log("Error fetching bus data:", error);

    throw error;
  }
}
