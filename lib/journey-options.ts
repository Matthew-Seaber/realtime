interface TrainLeg {
  type: "train";
  from: string; // CRS code
  to: string; // CRS code
  fromName: string;
  toName: string;
}

interface BusLeg {
  type: "bus";
  from: string; // ATCO code
  to: string; // ATCO code
  fromName: string;
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
        fromName: "Kenilworth",
        toName: "Coventry",
      },
      {
        type: "train",
        from: "COV",
        to: "BHM",
        fromName: "Coventry",
        toName: "Birmingham New St",
      },
      {
        type: "train",
        from: "BHM",
        to: "UNI",
        fromName: "Birmingham New St",
        toName: "University",
      },
      {
        type: "walk",
        description: "Walk to uni",
        duration: 5,
      },
    ],

    connectionMinutesRequired: 5,
  },

  {
    id: "2",
    description: "Via bus from New St to University",

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
        fromName: "Kenilworth",
        toName: "Coventry",
      },
      {
        type: "train",
        from: "COV",
        to: "BHM",
        fromName: "Coventry",
        toName: "Birmingham New St",
      },
      {
        type: "bus",
        from: "43000201703",
        to: "43000309401",
        fromName: "St Martin's Queensway (NS3)",
        toName: "University Station (QE)",
        busService: "",
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
