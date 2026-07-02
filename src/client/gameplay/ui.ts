import * as Phaser from 'phaser';

export type ButtonOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  /** Ghosted, non-interactive button with a small badge label (e.g. "SOON"). */
  disabledBadge?: string;
};

export const UI_FONT = 'Arial Black, Arial, sans-serif';

/**
 * A large, touch-friendly text button: a filled rectangle with centered label,
 * press/hover tweens, wrapped in a container so scenes can position it freely.
 */
export const makeTextButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {}
): Phaser.GameObjects.Container => {
  const width = options.width ?? 260;
  const height = options.height ?? 64;
  const fill = options.fill ?? 0x2ee6c8;
  const fontSize = options.fontSize ?? 26;
  const disabled = options.disabledBadge !== undefined;

  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, fill, disabled ? 0.25 : 1);
  bg.setStrokeStyle(2, 0x0c1220, disabled ? 0.4 : 1);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: UI_FONT,
      fontSize: `${fontSize}px`,
      color: disabled ? '#8fa3b8' : '#0c1220',
    })
    .setOrigin(0.5);
  container.add([bg, text]);

  if (disabled) {
    const badge = scene.add
      .text(width / 2 - 8, -height / 2 + 4, options.disabledBadge ?? '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#ffd34d',
      })
      .setOrigin(1, 0);
    container.add(badge);
    container.setAlpha(0.75);
    return container;
  }

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.05, duration: 90 });
  });
  bg.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 90 });
  });
  bg.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.93, duration: 60 });
  });
  bg.on('pointerup', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 60 });
    onClick();
  });
  return container;
};
