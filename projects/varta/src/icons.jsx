import React from 'react';
const paths = {
  camera: <><path d="M15 9l6-4v14l-6-4M3 4l18 18M3 8v11h12V9H8" /></>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  journal: <><path d="M9 3h7l5 5v13H5V3h4m7 0v6h5M9 13h8M9 17h5" /></>,
  list: <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />,
  chat: <path d="M21 11c0 5-5 9-10 8l-7 3 2-6C-1 8 6 1 13 3c5 0 8 3 8 8Z" />,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3 1-2h4l1 2 3 2 3 1 1 4-2 2v3l1 3-3 3-3-1h-3l-3 1-3-3 1-3v-3l-2-2 1-4 3-1Z" /></>,
  disk: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v13c0 4 16 4 16 0V5M4 11c0 4 16 4 16 0"/></>,
  cloud: <path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12H6Z" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
};
export default function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
