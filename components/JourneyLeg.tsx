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
  textSize,
}: {
  leg: JourneyLegResult;
  lastLeg: boolean;
  textSize: "small" | "normal";
}) {
  const status =
    leg.type === "walk"
      ? new Date(leg.departureTime) < new Date()
        ? "late"
        : "on time"
      : leg.status;

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return (
    <div
      className={`relative grid ${textSize === "small" ? "grid-cols-[10px_48px_28px_1fr_92px]" : "grid-cols-[24px_96px_48px_1fr_124px]"} gap-4`}
    >
      <div className="w-4 relative flex justify-center shrink-0">
        {!lastLeg && (
          <div className="absolute top-2 -bottom-px w-0.5 bg-theme-blue/80" />
        )}

        <div
          className={`mt-1.5 relative ${textSize === "small" ? "size-3" : "size-4"} rounded-full z-20 bg-theme-blue`}
        />
      </div>

      <h5 className={`${textSize === "small" ? "text-md" : "text-2xl"}`}>
        {formatTime(leg.departureTime)}
      </h5>

      <div className="mt-2 flex justify-center">
        {leg.type === "train" && (
          <TrainFront
            className={`${textSize === "small" ? "size-6" : "size-8"}`}
          />
        )}
        {leg.type === "bus" && (
          <BusFront
            className={`${textSize === "small" ? "size-6" : "size-8"}`}
          />
        )}
        {leg.type === "walk" && (
          <Footprints
            className={`${textSize === "small" ? "size-6" : "size-8"}`}
          />
        )}
      </div>

      <div
        className={`min-w-0 ${lastLeg ? "pb-2" : textSize === "small" ? "pb-4" : "pb-12"}`}
      >
        <h4
          className={`flex flex-row items-center gap-1.5 ${textSize === "small" ? "text-lg" : "text-3xl"}`}
        >
          {leg.type === "walk" ? (
            leg.description
          ) : (
            <>
              <span>{leg.fromName}</span>
              <ArrowRight className="shrink-0 size-6" />
              <span>{leg.toName}</span>
            </>
          )}
        </h4>

        <p
          className={`${textSize === "small" ? "text-sm" : "text-lg"} text-theme-blue/80`}
        >
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
        className={`first-letter:uppercase ${textSize === "small" ? "text-md" : "text-xl"} text-end ${status === "on time" ? "text-theme-green" : status === "delayed" || status === "late" ? "text-theme-amber" : "text-theme-red"}`}
      >
        {status}{" "}
        {leg.type !== "walk" &&
          leg.delayMinutes > 1 &&
          `(${leg.delayMinutes} mins)`}
      </p>
    </div>
  );
}

export default JourneyLeg;
