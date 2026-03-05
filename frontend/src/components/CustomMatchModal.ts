import { createElement } from '@/utils/dom';
import { showModal } from '@/components/Modal';
import { showSuccess, showError } from '@/components/Notification';
import { customMatchService, CustomMatchSettings } from '@/services/CustomMatchService';
import type { User } from '@/types';

export function openCustomMatchModal(opponent: User): void {
  const form = createElement('form', {
    className: 'space-y-6',
  }) as HTMLFormElement;

  const opponentSection = createElement('div', {
    className: 'bg-gray-700 rounded-lg p-4',
  });

  const opponentLabel = createElement('div', {
    className: 'text-sm text-gray-400 mb-2',
    textContent: 'Opponent',
  });

  const opponentName = createElement('div', {
    className: 'text-lg font-semibold text-white',
    textContent: opponent.displayName,
  });

  opponentSection.appendChild(opponentLabel);
  opponentSection.appendChild(opponentName);
  form.appendChild(opponentSection);

  const paddleSizeSection = createSliderSection(
    'Paddle Size',
    'paddleSize',
    10,
    40,
    20,
    (value) => `${value}px`
  );
  form.appendChild(paddleSizeSection);

  const gameSpeedSection = createSliderSection(
    'Game Speed',
    'gameSpeed',
    0.5,
    2,
    1,
    (value) => `${value.toFixed(1)}x`,
    0.1
  );
  form.appendChild(gameSpeedSection);

  const powerupsSection = createElement('div', {
    className: 'space-y-3',
  });

  const powerupsTitle = createElement('label', {
    className: 'block text-sm font-medium text-gray-300 mb-3',
    textContent: 'Power-ups',
  });
  powerupsSection.appendChild(powerupsTitle);

  const bigPaddleDiv = createCheckbox(
    'bigPaddle',
    '🎯 Big Paddle',
    'Temporarily increases your paddle size',
    true
  );
  powerupsSection.appendChild(bigPaddleDiv);

  const shieldDiv = createCheckbox(
    'shield',
    '🛡️ Shield',
    'Protects against one opponent point',
    true
  );
  powerupsSection.appendChild(shieldDiv);

  form.appendChild(powerupsSection);

  const modal = showModal({
    title: '🎮 Challenge a Friend',
    content: form,
    size: 'md',
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        onClick: () => modal.close(),
      },
      {
        label: 'Send Invitation',
        variant: 'primary',
        onClick: async () => {
          const formData = new FormData(form);

          const settings: CustomMatchSettings = {
            paddleSize: parseInt(formData.get('paddleSize') as string, 10),
            gameSpeed: parseFloat(formData.get('gameSpeed') as string),
            powerups: {
              bigPaddle: formData.get('bigPaddle') === 'on',
              shield: formData.get('shield') === 'on',
            },
          };

          try {
            await customMatchService.sendInvitation(opponent.id, settings);
            showSuccess(`Invitation sent to ${opponent.displayName}!`);
            modal.close();
          } catch (error) {
            console.error('Failed to send invitation:', error);
            const message = error instanceof Error ? error.message : 'Failed to send invitation';
            showError(message);
          }
        },
      },
    ],
  });
}

function createSliderSection(
  label: string,
  name: string,
  min: number,
  max: number,
  defaultValue: number,
  formatLabel: (value: number) => string,
  step: number = 1
): HTMLElement {
  const section = createElement('div', {
    className: 'space-y-2',
  });

  const headerDiv = createElement('div', {
    className: 'flex justify-between items-center',
  });

  const labelElement = createElement('label', {
    className: 'block text-sm font-medium text-gray-300',
    textContent: label,
    attributes: { for: name },
  });

  const valueDisplay = createElement('span', {
    className: 'text-sm font-semibold text-primary-400',
    id: `${name}-value`,
    textContent: formatLabel(defaultValue),
  });

  headerDiv.appendChild(labelElement);
  headerDiv.appendChild(valueDisplay);
  section.appendChild(headerDiv);

  const slider = createElement('input', {
    className: 'w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500',
    attributes: {
      type: 'range',
      id: name,
      name: name,
      min: String(min),
      max: String(max),
      step: String(step),
      value: String(defaultValue),
    },
  }) as HTMLInputElement;

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    valueDisplay.textContent = formatLabel(value);
  });

  section.appendChild(slider);

  return section;
}

function createCheckbox(
  name: string,
  label: string,
  description: string,
  defaultChecked: boolean
): HTMLElement {
  const container = createElement('div', {
    className: 'flex items-start gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition',
  });

  const checkbox = createElement('input', {
    className: 'mt-1 w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500',
    attributes: {
      type: 'checkbox',
      id: name,
      name: name,
      ...(defaultChecked ? { checked: 'true' } : {}),
    },
  }) as HTMLInputElement;

  const textDiv = createElement('div', {
    className: 'flex-1',
  });

  const labelElement = createElement('label', {
    className: 'block text-sm font-medium text-white cursor-pointer',
    textContent: label,
    attributes: { for: name },
  });

  const desc = createElement('p', {
    className: 'text-xs text-gray-400 mt-1',
    textContent: description,
  });

  textDiv.appendChild(labelElement);
  textDiv.appendChild(desc);

  container.appendChild(checkbox);
  container.appendChild(textDiv);

  return container;
}
