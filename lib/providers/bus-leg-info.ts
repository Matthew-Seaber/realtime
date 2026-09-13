interface BusLeg {
  type: "bus";
  from: string; // ATCO code
  to: string; // ATCO code
  fromName: string;
  toName: string;
  busService?: string;
}

export async function fetchBusData(leg: BusLeg, currentTime: Date) {
  try {
  } catch (error) {
    console.log("Error fetching bus data:", error);

    throw error;
  }
}
