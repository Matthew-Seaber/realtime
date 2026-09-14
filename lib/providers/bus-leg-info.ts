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
  expected_departure_time: string | null;
  best_departure_estimate: string;
}

interface TransportAPIStopTimetable {
  departures: Record<string, TransportAPIDeparture[]>;
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
    const departureParams = new URLSearchParams({
      app_id: process.env.TRANSPORT_API_APP_ID!,
      app_key: process.env.TRANSPORT_API_APP_KEY!,
      atcocode: leg.from,
    });
    const arrivalParams = new URLSearchParams({
      app_id: process.env.TRANSPORT_API_APP_ID!,
      app_key: process.env.TRANSPORT_API_APP_KEY!,
      atcocode: leg.to,
    });

    const [departureResponse, arrivalResponse] = await Promise.all([
      fetch(
        `https://transportapi.com/v3/uk/bus/stop_timetables/?${departureParams.toString()}`,
      ),
      fetch(
        `https://transportapi.com/v3/uk/bus/stop_timetables/?${arrivalParams.toString()}`,
      ),
    ]);

    if (!departureResponse.ok || !arrivalResponse.ok) {
      throw new Error(
        `Failed to fetch bus data: ${departureResponse.status}, ${arrivalResponse.status}`,
      );
    }

    const departureData: TransportAPIStopTimetable =
      await departureResponse.json();
    const arrivalData: TransportAPIStopTimetable = await arrivalResponse.json();

    const departures: TransportAPIDeparture[] = Object.values(
      departureData.departures,
    ).flat();
    const arrivals: TransportAPIDeparture[] = Object.values(
      arrivalData.departures,
    ).flat();

    const filteredDepartures = departures.filter((departure) => {
      if (!leg.busService || leg.busService.includes(departure.line)) {
        return true;
      }
      return false;
    });

    const matchedJourneys = filteredDepartures
      .map((departure) => {
        const matchingArrival = arrivals.find((bus) => bus.id === departure.id);

        if (!matchingArrival) {
          return null;
        }

        const departureTime = new Date(
          `${departure.date}T${departure.best_departure_estimate}`,
        );
        const arrivalTime = new Date(
          `${matchingArrival.date}T${matchingArrival.best_departure_estimate}`,
        );

        return {
          departure,
          matchingArrival,
          departureTime,
          arrivalTime,
        };
      })
      .filter((journey) => journey !== null)
      .filter((journey) => {
        return (
          journey.departureTime < currentTime &&
          journey.arrivalTime < currentTime
        );
      });

    if (matchedJourneys.length === 0) {
      return null;
    }

    matchedJourneys.sort(
      (a, b) => b.arrivalTime.getTime() - a.arrivalTime.getTime(),
    );

    const bestJourney = matchedJourneys[0];

    if (!bestJourney) {
      return null;
    }

    const departure = bestJourney.departure;
    const arrival = bestJourney.matchingArrival;

    const arrivalAimed = new Date(
      `${arrival.date}T${arrival.aimed_departure_time}`,
    );
    const arrivalEstimate = new Date(
      `${arrival.date}T${arrival.best_departure_estimate}`,
    );

    const delayMinutes = Math.round(
      (arrivalEstimate.getTime() - arrivalAimed.getTime()) / 60000,
    );
    const status: BusData["status"] = delayMinutes > 1 ? "delayed" : "on time";

    const busData: BusData = {
      id: bestJourney.departure.id,

      busService: bestJourney.departure.line,

      arrival: {
        scheduled: arrival.aimed_departure_time,
        estimated: arrival.best_departure_estimate,
      },

      departure: {
        scheduled: departure.aimed_departure_time,
        estimated: departure.best_departure_estimate,
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
