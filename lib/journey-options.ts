interface TrainLeg {
  type: "train";
  from: string; // CRS code
  to: string; // CRS code
}

interface BusLeg {
  type: "bus";
  from: string; // ATCO code
  to: string; // ATCO code
  toName: string;
  busService?: string;
}

interface WalkingLeg {
  type: "walk";
  description: string;
  duration: number; // In minutes
}

type JourneyLeg = TrainLeg | BusLeg | WalkingLeg;

interface Journey {
  id: string;
  description: string;
  legs: JourneyLeg[];
  connectionMinutesRequired: number;
}

export const JourneyOptions: Journey[] = [
  {
    id: "1",
    description: "Train-only route",

    legs: [
      {
        type: "walk",
        description: "Walk to Kenilworth Station",
        duration: 20,
      },
      {
        type: "train",
        from: "KNW",
        to: "COV",
      },
      {
        type: "train",
        from: "COV",
        to: "BHM",
      },
      {
        type: "train",
        from: "BHM",
        to: "UNI",
      },
      {
        type: "walk",
        description: "Walk to uni",
        duration: 5,
      },
    ],

    connectionMinutesRequired: 5,
  },
];
