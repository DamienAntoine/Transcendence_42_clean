


export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    id?: string;
    textContent?: string;
    innerHTML?: string;
    attributes?: Record<string, string>;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.id) {
    element.id = options.id;
  }

  if (options?.textContent) {
    element.textContent = options.textContent;
  }

  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}


export function setText(element: HTMLElement, text: string): void {
  element.textContent = text;
}


export function setHTML(element: HTMLElement, html: string): void {
  element.innerHTML = html;
}


export function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}


export function addClass(element: HTMLElement, ...classNames: string[]): void {
  element.classList.add(...classNames);
}


export function removeClass(element: HTMLElement, ...classNames: string[]): void {
  element.classList.remove(...classNames);
}


export function toggleClass(element: HTMLElement, className: string, force?: boolean): void {
  element.classList.toggle(className, force);
}


export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}


export function addListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler as EventListener, options);
  return () => element.removeEventListener(event, handler as EventListener, options);
}


export function querySelector<E extends HTMLElement = HTMLElement>(
  selector: string,
  parent: HTMLElement | Document = document
): E | null {
  return parent.querySelector<E>(selector);
}


export function querySelectorAll<E extends HTMLElement = HTMLElement>(
  selector: string,
  parent: HTMLElement | Document = document
): E[] {
  return Array.from(parent.querySelectorAll<E>(selector));
}


export function show(element: HTMLElement, displayType: string = 'block'): void {
  element.style.display = displayType;
}


export function hide(element: HTMLElement): void {
  element.style.display = 'none';
}


export function toggleVisibility(element: HTMLElement, visible?: boolean): void {
  if (visible === undefined) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  } else {
    element.style.display = visible ? 'block' : 'none';
  }
}


export function appendChildren(parent: HTMLElement, ...children: (HTMLElement | string)[]): void {
  children.forEach(child => {
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  });
}


export function replaceElement(oldElement: HTMLElement, newElement: HTMLElement): void {
  oldElement.parentNode?.replaceChild(newElement, oldElement);
}


export function removeElement(element: HTMLElement): void {
  element.parentNode?.removeChild(element);
}


export function getInputValue(input: HTMLInputElement | HTMLTextAreaElement): string {
  return input.value.trim();
}


export function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
}


export function setDisabled(element: HTMLInputElement | HTMLButtonElement, disabled: boolean): void {
  element.disabled = disabled;
}


export function focusElement(element: HTMLElement): void {
  element.focus();
}


export function scrollToElement(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  element.scrollIntoView({ behavior, block: 'center' });
}
