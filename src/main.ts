import './styles.css';
import { initClock, initMail, initProbe, initReveal } from './ui';

document.documentElement.classList.add('js');

initClock();
initMail();
initProbe();
initReveal();

/**
 * Cięższe moduły doczytywane leniwie:
 * — oscyloskop hero, gdy przeglądarka ma chwilę (jest na pierwszym ekranie),
 * — laboratorium NN dopiero, gdy sekcja #lab zbliża się do viewportu.
 */
const idle = (cb: () => void) => {
  if ('requestIdleCallback' in window) requestIdleCallback(cb, { timeout: 1200 });
  else setTimeout(cb, 250);
};

idle(() => {
  const heroCanvas = document.querySelector<HTMLCanvasElement>('#scope-canvas');
  if (heroCanvas) import('./scope').then((m) => m.initScope(heroCanvas)).catch(() => {});
});

const labSection = document.querySelector('#lab');
if (labSection && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      import('./lab').then((m) => {
        const canvas = document.querySelector<HTMLCanvasElement>('#lab-canvas');
        if (canvas) m.initLab(canvas);
      }).catch(() => {});
    }
  }, { rootMargin: '600px 0px' });
  io.observe(labSection);
} else {
  import('./lab').then((m) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#lab-canvas');
    if (canvas) m.initLab(canvas);
  }).catch(() => {});
}
