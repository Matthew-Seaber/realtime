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

  status: {
    cancellation: {
      value: boolean;
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
  atco_code: string;
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

export async function fetchBusData(leg: BusLeg, currentTime: Date) {
  try {
    const params = new URLSearchParams({
      app_id: process.env.TRANSPORT_API_APP_ID!,
      app_key: process.env.TRANSPORT_API_APP_KEY!,
    });

    const arrivalResponse = await fetch(
      `https://transportapi.com/v3/uk/bus/stop_timetables/${leg.to}?${params.toString()}`,
    );

    if (!arrivalResponse.ok) {
      throw new Error(`Failed to fetch bus data: ${arrivalResponse.status}`);
    }

    const arrivalData: TransportAPIStopTimetable = await arrivalResponse.json();

    const arrivals: TransportAPIDeparture[] = arrivalData.departures.all;

    const filteredArrivals = arrivals.filter((arrival) => {
      if (leg.busService && !leg.busService.includes(arrival.line)) {
        return false;
      }

      if (arrival.status.cancellation.value) {
        return false;
      }

      return true;
    });

    const latestDepartureTime = new Date(currentTime.getTime() - 60 * 1000); // Allows for unloading/loading time at the stop

    const viableArrivals = filteredArrivals
      .map((arrival) => {
        const bestDepartureTime = new Date(
          `${arrival.date}T${arrival.best_departure_estimate}`,
        );
        const scheduledDepartureTime = new Date(
          `${arrival.date}T${arrival.aimed_departure_time}`,
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

    const bestArrival = viableArrivals[0];

    if (!bestArrival) {
      return null;
    }

    const journeyResponse = await fetch(
      `${bestArrival.arrival.id}&${params.toString()}`,
    );

    if (!journeyResponse.ok) {
      throw new Error(
        `Failed to fetch bus journey data: ${journeyResponse.status}`,
      );
    }

    const journeyData: TransportAPIJourney = await journeyResponse.json();

    const arrivalAimed = bestArrival.scheduledDepartureTime;
    const arrivalEstimate = bestArrival.bestDepartureTime;

    const delayMinutes = Math.round(
      (arrivalEstimate.getTime() - arrivalAimed.getTime()) / 60000,
    );
    const status: BusData["status"] = delayMinutes > 1 ? "delayed" : "on time";

    const busData: BusData = {
      id: bestArrival.arrival.id,

      busService: bestArrival.arrival.line,

      arrival: {
        scheduled: bestArrival.scheduledDepartureTime.toISOString(),
        estimated: bestArrival.bestDepartureTime.toISOString(),
      },

      departure: {
        scheduled: ,
        estimated: ,
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
