import logoImage from './logo.jpeg';

export default function RoadEyeLogo({ compact = false, className = '', onClick = null }) {
  const commonClasses = `object-contain ${className}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex shrink-0 items-center justify-center rounded-md p-0 hover:opacity-90"
        aria-label="Refresh page"
      >
        <img
          src={logoImage}
          alt="Road Eye logo"
          className={`h-7 w-auto ${commonClasses}`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md p-0 hover:opacity-90"
      aria-label="Refresh page"
    >
      <img
        src={logoImage}
        alt="Road Eye logo"
        className={`h-auto w-full max-w-[300px] ${commonClasses}`}
      />
    </button>
  );
}
