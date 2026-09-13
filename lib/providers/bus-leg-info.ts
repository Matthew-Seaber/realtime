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
      atcocode: leg.from,
    });

    const departureResponse = await fetch(
      `https://transportapi.com/v3/uk/bus/stop_timetables/?${params.toString()}`,
    );

    if (!departureResponse.ok) {
      throw new Error(`Failed to fetch bus data: ${departureResponse.status}`);
    }

    const data = await departureResponse.json();

    const departures = Object.values(data.departures).flat();

    const relevantDepartures = departures.filter(
      (departure: TransportAPIDeparture) => {
        const departureTime = new Date(
          `${departure.date}T${departure.best_departure_estimate}`,
        );

        if (departureTime < currentTime) {
          return false;
        } else if (leg.busService && !leg.busService.includes(departure.line)) {
          return false;
        }
      },
    );
  } catch (error) {
    console.log("Error fetching bus data:", error);

    throw error;
  }
}
