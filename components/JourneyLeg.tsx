import { ArrowRight, BusFront, Footprints, TrainFront } from "lucide-react";

interface TrainLegResult {
  type: "train";

  from: string; // CRS code
  to: string; // CRS code
  fromName: string;
  toName: string;

  operatorName: string;

  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;

  platform?: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

interface BusLegResult {
  type: "bus";

  from: string; // ATCO code
  to: string; // ATCO code
  fromName: string;
  toName: string;

  busService: string;
  direction: string;

  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;

  status: "on time" | "delayed" | "cancelled";
  delayMinutes: number;
}

interface WalkingLegResult {
  type: "walk";

  description: string;
  duration: number; // In minutes

  departureTime: string;
  arrivalTime: string;
}

type JourneyLegResult = TrainLegResult | BusLegResult | WalkingLegResult;

function JourneyLeg({
  leg,
  lastLeg,
}: {
  leg: JourneyLegResult;
  lastLeg: boolean;
}) {
  const status =
    leg.type === "walk"
      ? new Date(leg.departureTime) < new Date()
        ? "on time"
        : "late"
      : leg.status;

  return (
    <div className="relative flex flex-row gap-4">
      <div className="w-4 relative flex justify-center shrink-0">
        {!lastLeg && (
          <div className="absolute top-2 -bottom-px w-0.5 bg-theme-blue/80" />
        )}

        <div className="mt-1 relative size-4 rounded-full z-20 bg-theme-blue" />
      </div>

      <div className="flex-1 flex flex-row justify-between gap-4 pb-8">
        <h5 className="text-xl text-theme-blue">{leg.departureTime}</h5>

        {leg.type === "train" && (
          <TrainFront className="size-8 text-theme-blue" />
        )}
        {leg.type === "bus" && <BusFront className="size-8 text-theme-blue" />}
        {leg.type === "walk" && (
          <Footprints className="size-8 text-theme-blue" />
        )}

        <div className="flex flex-col gap-1">
          <h4 className="flex flex-row items-center gap-2 text-2xl text-theme-blue">
            {leg.type === "walk" ? (
              leg.description
            ) : (
              <>
                <span>{leg.fromName}</span>
                <ArrowRight className="shrink-0 size-8" />
                <span>{leg.toName}</span>
              </>
            )}
          </h4>
          <p className="text-theme-blue/60">
            {leg.type === "train" &&
              `${leg.operatorName} • ${leg.platform ? `Platform ${leg.platform}` : "Platform unknown"}`}
            {leg.type === "bus" && `${leg.busService} towards ${leg.direction}`}
            {leg.type === "walk" &&
              `${leg.duration} minute walk for ${new Date(
                leg.arrivalTime,
              ).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })} arrival`}
          </p>
        </div>

        <p
          className={`capitalize ${status === "on time" ? "text-theme-green" : status === "delayed" || status === "late" ? "text-theme-yellow" : "text-theme-red"}`}
        >
          {status}
        </p>
      </div>
    </div>
  );
}

export default JourneyLeg;
