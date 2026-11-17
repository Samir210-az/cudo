import { useEffect, useRef } from 'react';
import { listLinks } from './links';
import { publishSchedules } from './publish';

const DELAY = 2500;

export function useAutoPublish(data, config, onError) {
  const latest = useRef(null);
  const failed = useRef(false);
  latest.current = { data, config, onError };

  useEffect(() => {
    if (!data || !config) return undefined;
    const timer = setTimeout(async () => {
      const { data: d, config: c, onError: report } = latest.current;
      try {
        const links = (await listLinks(d.competition.id)).filter((l) => l.active);
        if (!links.length) return;
        await publishSchedules(d.competition, links, d.athletes, d.brackets, c, { onlyChanged: true });
        failed.current = false;
      } catch (err) {
        if (!failed.current) report?.(err);
        failed.current = true;
      }
    }, DELAY);
    return () => clearTimeout(timer);
  }, [data, config]);
}
