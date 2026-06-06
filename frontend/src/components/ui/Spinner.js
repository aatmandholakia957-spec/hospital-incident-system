'use client';

export default function Spinner({ size = 'md', color = 'primary' }) {
  const sizeClass = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
  }[size];

  const colorClass = {
    primary: 'spinner-primary',
    white: 'spinner-white',
  }[color];

  return (
    <div className={`spinner ${sizeClass} ${colorClass}`} />
  );
}
