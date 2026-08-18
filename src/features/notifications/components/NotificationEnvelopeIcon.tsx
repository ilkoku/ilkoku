type NotificationEnvelopeIconProps = {
  read: boolean;
};

export function NotificationEnvelopeIcon({ read }: NotificationEnvelopeIconProps) {
  if (read) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M3.5 10.25 12 4l8.5 6.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-8.25Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="m3.8 10.7 7.25 5.15a1.65 1.65 0 0 0 1.9 0l7.25-5.15M8.25 6.8 12 9.55l3.75-2.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
        width="18"
        x="3"
        y="5"
      />
      <path
        d="m4 7 6.95 5.15a1.75 1.75 0 0 0 2.1 0L20 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
