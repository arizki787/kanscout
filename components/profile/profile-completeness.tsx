interface CircularProgressProps {
  progress: number; // Value between 0 and 100
  size?: number;    // Diameter of the circle in pixels
  strokeWidth?: number;
}

export default function CircularProgressBar ({
    progress,
    size = 120 ,
    strokeWidth = 10,
}: CircularProgressProps){

  // Ensure progress stays between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the offset to hide/show the stroke
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background Track Circle */}
        <circle
          className="text-gray-200"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
        />
        {/* Animated Active Progress Circle */}
        <circle
          className="text-primary transition-all duration-300 ease-out"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={center}
          cy={center}
        />
      </svg>
      {/* Centered Text Percentage */}
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-foreground">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
};