interface HeightAnimationOptions {
  morphContainer: HTMLDivElement;
  targetHeight: number;
  duration: number;
  easing: string;
}

interface QueueEnterAnimationOptions {
  queueContent: HTMLDivElement;
  emptyEl: HTMLDivElement | null;
  listEl: HTMLDivElement | null;
  hasItems: boolean;
  enter: {
    duration: number;
    header: number;
    settings: number;
    rowsStart: number;
    rowStagger: number;
  };
  contentEasing: string;
}

interface QueueExitAnimationOptions {
  queueContent: HTMLDivElement;
  emptyEl: HTMLDivElement | null;
  listEl: HTMLDivElement | null;
  hasItems: boolean;
  exit: {
    duration: number;
    header: number;
    settings: number;
    rowStagger: number;
  };
  contentEasing: string;
}

export function animateHeightTransition(
  options: HeightAnimationOptions
): void {
  const { morphContainer, targetHeight, duration, easing } = options;
  morphContainer.style.transition = `height ${duration}ms ${easing}`;
  morphContainer.style.height = `${targetHeight}px`;
}

export function animateHeightTransitionFromCurrent(
  options: HeightAnimationOptions
): void {
  const { morphContainer, targetHeight, duration, easing } = options;
  const currentComputedHeight = morphContainer.offsetHeight;
  if (currentComputedHeight === targetHeight) {
    return;
  }

  morphContainer.style.height = `${currentComputedHeight}px`;

  requestAnimationFrame(() => {
    morphContainer.style.transition = `height ${duration}ms ${easing}`;
    morphContainer.style.height = `${targetHeight}px`;
  });
}

export function animateQueueContentIn(
  options: QueueEnterAnimationOptions
): void {
  const { queueContent, emptyEl, listEl, hasItems, enter, contentEasing } = options;
  const header = queueContent.querySelector('.notis-unified-header') as HTMLElement | null;
  const settings = queueContent.querySelector('.notis-unified-settings') as HTMLElement | null;
  const rows = listEl?.querySelectorAll('.notis-unified-row');

  if (header) {
    header.style.opacity = '0';
    header.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      header.style.transition = `opacity ${enter.duration}ms ${contentEasing}, transform ${enter.duration}ms ${contentEasing}`;
      header.style.opacity = '1';
      header.style.transform = 'translateY(0)';
    }, enter.header);
  }

  if (!hasItems && emptyEl) {
    emptyEl.style.opacity = '0';
    emptyEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      emptyEl.style.transition = `opacity ${enter.duration}ms ${contentEasing}, transform ${enter.duration}ms ${contentEasing}`;
      emptyEl.style.opacity = '1';
      emptyEl.style.transform = 'scale(1)';
    }, enter.settings);
  }

  rows?.forEach((row, index) => {
    const element = row as HTMLElement;
    element.style.opacity = '0';
    element.style.transform = 'translateX(-12px)';
    setTimeout(() => {
      element.style.transition = `opacity ${enter.duration}ms ${contentEasing}, transform ${enter.duration}ms ${contentEasing}`;
      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';
    }, enter.rowsStart + index * enter.rowStagger);
  });

  if (settings && hasItems) {
    settings.style.opacity = '0';
    settings.style.transform = 'translateY(6px)';
    setTimeout(() => {
      settings.style.transition = `opacity ${enter.duration}ms ${contentEasing}, transform ${enter.duration}ms ${contentEasing}`;
      settings.style.opacity = '1';
      settings.style.transform = 'translateY(0)';
    }, enter.settings);
  }
}

export function animateQueueContentOut(
  options: QueueExitAnimationOptions
): void {
  const { queueContent, emptyEl, listEl, hasItems, exit, contentEasing } = options;
  const header = queueContent.querySelector('.notis-unified-header') as HTMLElement | null;
  const settings = queueContent.querySelector('.notis-unified-settings') as HTMLElement | null;
  const rows = listEl?.querySelectorAll('.notis-unified-row');
  const rowCount = rows?.length ?? 0;

  rows?.forEach((row, index) => {
    const element = row as HTMLElement;
    const reverseIndex = rowCount - 1 - index;
    setTimeout(() => {
      element.style.transition = `opacity ${exit.duration}ms ${contentEasing}, transform ${exit.duration}ms ${contentEasing}`;
      element.style.opacity = '0';
      element.style.transform = 'translateX(-8px) scale(0.97)';
    }, reverseIndex * exit.rowStagger);
  });

  if (settings && hasItems) {
    setTimeout(() => {
      settings.style.transition = `opacity ${exit.duration}ms ${contentEasing}, transform ${exit.duration}ms ${contentEasing}`;
      settings.style.opacity = '0';
      settings.style.transform = 'translateY(6px)';
    }, exit.settings);
  }

  if (!hasItems && emptyEl) {
    setTimeout(() => {
      emptyEl.style.transition = `opacity ${exit.duration}ms ${contentEasing}, transform ${exit.duration}ms ${contentEasing}`;
      emptyEl.style.opacity = '0';
      emptyEl.style.transform = 'scale(0.95)';
    }, exit.settings);
  }

  if (header) {
    setTimeout(() => {
      header.style.transition = `opacity ${exit.duration}ms ${contentEasing}, transform ${exit.duration}ms ${contentEasing}`;
      header.style.opacity = '0';
      header.style.transform = 'translateY(-6px)';
    }, exit.header);
  }
}
