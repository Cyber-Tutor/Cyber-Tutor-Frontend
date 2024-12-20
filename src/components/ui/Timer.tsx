import React, { useEffect } from "react";

interface TimerProps {
  secondsElapsed: number;
  setSecondsElapsed: React.Dispatch<React.SetStateAction<number>>;
}

const TimerComponent: React.FC<TimerProps> = ({
  secondsElapsed,
  setSecondsElapsed,
}) => {
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [secondsElapsed, setSecondsElapsed]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const paddedSeconds = seconds.toString().padStart(2, "0");
    return `${minutes}:${paddedSeconds}`;
  };

  return (
    <div>
      <p className="hidden">Time Elapsed: {formatTime(secondsElapsed)}</p>
    </div>
  );
};

export default TimerComponent;
