export type Theme = 'dark' | 'light';

const key = 'api-archaeologist:theme';
const themeColors: Record<Theme, string> = {
  dark: '#121110',
  light: '#f4f0ea',
};

export function storedTheme(): Theme {
  try {
    return localStorage.getItem(key) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme]);
}

function remember(theme: Theme) {
  try {
    localStorage.setItem(key, theme);
  } catch {
    // The choice still applies to this visit when storage is unavailable.
  }
}

// The new theme spreads from the toggle as a soft-edged disc while the old
// page sinks back slightly, so the switch reads as light moving, not a flash.
export function switchTheme(theme: Theme, origin: HTMLElement) {
  remember(theme);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('startViewTransition' in document)) {
    applyTheme(theme);
    return;
  }
  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  // The gradient turns transparent between 70% and 100% of the disc, so the
  // disc must outgrow the farthest corner by that margin.
  const size = (radius / 0.7) * 2;
  const transition = document.startViewTransition(() => applyTheme(theme));
  const timing: KeyframeAnimationOptions = {
    duration: 850,
    easing: 'cubic-bezier(0.65, 0.05, 0.2, 1)',
    fill: 'both',
  };
  void transition.ready
    .then(() => {
      const root = document.documentElement;
      root.animate(
        {
          maskSize: ['0px 0px', `${size}px ${size}px`],
          maskPosition: [
            `${x}px ${y}px`,
            `${x - size / 2}px ${y - size / 2}px`,
          ],
        },
        { ...timing, pseudoElement: '::view-transition-new(root)' },
      );
      root.animate(
        {
          transform: ['scale(1)', 'scale(0.965)'],
          filter: ['blur(0px) brightness(1)', 'blur(3px) brightness(0.7)'],
          borderRadius: ['0px', '18px'],
        },
        { ...timing, pseudoElement: '::view-transition-old(root)' },
      );
    })
    .catch(() => {
      // A skipped transition still applies the theme through its callback.
    });
}
