"use client";

import { useEffect, useState } from "react";

// Menyederhanakan pembacaan jam. Timer dihitung dari deadline, bukan dari counter.
export const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);

  return now;
};
