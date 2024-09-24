import DiagramZoomDragPlugin from '../core/diagram-zoom-drag-plugin';

export default class EventController {
    constructor(public plugin: DiagramZoomDragPlugin) {}

    /**
     * Adds mouse events to the given container element.
     *
     * This method adds event listeners to the container element for the following
     * events:
     * - `wheel`: Zooms the diagram when the user scrolls while holding the Ctrl
     *   key.
     * - `mousedown`: Starts dragging the diagram when the user clicks and holds
     *   the left mouse button.
     * - `mousemove`: Moves the diagram when the user drags the diagram while
     *   holding the left mouse button.
     * - `mouseup`: Stops dragging the diagram when the user releases the left
     *   mouse button.
     * - `mouseleave`: Stops dragging the diagram when the user leaves the
     *   container element while holding the left mouse button.
     *
     * @param container - The container element to add the events to.
     */
    addMouseEvents(container: HTMLElement): void {
        let startX: number, startY: number, initialX: number, initialY: number;
        let isDragging = false;

        const diagramElement = container.querySelector(
            this.plugin.compoundSelector
        ) as HTMLElement;

        if (diagramElement.classList.contains('events-bound')) {
            return;
        }

        diagramElement.classList.add('events-bound');

        this.plugin.view.registerDomEvent(
            container as HTMLElement,
            'wheel',
            (event: WheelEvent) => {
                if (!event.ctrlKey) {
                    return;
                }
                this.plugin.activeContainer = container;
                event.preventDefault();
                const rect = diagramElement.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                const offsetY = event.clientY - rect.top;

                const prevScale = this.plugin.scale;
                this.plugin.scale += event.deltaY * -0.001;
                this.plugin.scale = Math.max(0.125, this.plugin.scale);

                const dx = offsetX * (1 - this.plugin.scale / prevScale);
                const dy = offsetY * (1 - this.plugin.scale / prevScale);

                this.plugin.dx += dx;
                this.plugin.dy += dy;

                diagramElement.setCssStyles({
                    transform: `translate(${this.plugin.dx}px, ${this.plugin.dy}px) scale(${this.plugin.scale})`,
                });
            }
        );
        this.plugin.view.registerDomEvent(
            container as HTMLElement,
            'mousedown',
            (event: MouseEvent) => {
                if (event.button !== 0) {
                    return;
                }
                this.plugin.activeContainer = container;
                const c_html = container as HTMLElement;
                c_html.focus({ preventScroll: true });
                isDragging = true;
                startX = event.clientX;
                startY = event.clientY;

                initialX = this.plugin.dx;
                initialY = this.plugin.dy;
                diagramElement.setCssStyles({
                    cursor: 'grabbing',
                });
                event.preventDefault();
            }
        );
        this.plugin.view.registerDomEvent(
            container as HTMLElement,
            'mousemove',
            (event: MouseEvent) => {
                if (!isDragging) {
                    return;
                }
                this.plugin.activeContainer = container;

                const dx = event.clientX - startX;
                const dy = event.clientY - startY;
                this.plugin.dx = initialX + dx;
                this.plugin.dy = initialY + dy;
                diagramElement.setCssStyles({
                    transform: `translate(${this.plugin.dx}px, ${this.plugin.dy}px) scale(${this.plugin.scale})`,
                });
            }
        );
        this.plugin.view.registerDomEvent(
            container as HTMLElement,
            'mouseup',
            () => {
                this.plugin.activeContainer = container;
                if (isDragging) {
                    isDragging = false;
                    diagramElement.setCssStyles({ cursor: 'grab' });
                }
            }
        );
        this.plugin.view.registerDomEvent(
            container as HTMLElement,
            'mouseleave',
            () => {
                this.plugin.activeContainer = container;
                if (isDragging) {
                    isDragging = false;
                    diagramElement.setCssStyles({ cursor: 'grab' });
                }
            }
        );
    }

    /**
     * Adds touch event listeners to the given container element.
     *
     * This function adds the following event listeners to the given container element:
     * - `touchstart`: Handles the start of a touch event for the diagram element.
     * - `touchmove`: Handles the move event for the diagram element. If the element is being pinched, zoom the element. If the element is being dragged, move it.
     * - `touchend`: Handles the end of a touch event for the diagram element.
     * - `scroll`: Handles the scroll event for the diagram element.
     *
     * @param container - The container element to add the touch event listeners to.
     */
    addTouchEvents(container: HTMLElement): void {
        let startX: number;
        let startY: number;
        let initialDistance: number;
        let isDragging: boolean = false;
        let isPinching: boolean = false;
        const BUTTON_SELECTOR =
            '.diagram-zoom-panel button, .diagram-move-panel button, .diagram-service-panel button';

        /**
         * Calculates the distance between two touch points.
         * @param touches - The two touch points.
         * @returns The distance between the two touch points.
         */
        const calculateDistance = (touches: TouchList): number => {
            const [touch1, touch2] = [touches[0], touches[1]];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        /**
         * Handles the start of a touch event for the diagram element.
         * @param plugin - The plugin instance.
         * @returns A function that handles the touchstart event.
         */
        function touchStart(plugin: DiagramZoomDragPlugin) {
            return function innerTS(e: TouchEvent) {
                if (plugin.nativeTouchEventsEnabled) {
                    return;
                }
                plugin.activeContainer = container;

                const target = e.target as HTMLElement;
                // we got touch to a button panel - returning
                if (target.closest(BUTTON_SELECTOR)) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();

                if (e.touches.length === 1) {
                    isDragging = true;
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    isPinching = true;
                    initialDistance = calculateDistance(e.touches);
                }
            };
        }

        /**
         * Handles the move event for the diagram element. If the element is being pinched, zoom the element. If the element is being dragged, move it.
         * @param plugin - The plugin instance.
         * @returns A function that handles the touchmove event.
         */
        function touchMove(plugin: DiagramZoomDragPlugin) {
            return function innerTM(e: TouchEvent) {
                if (plugin.nativeTouchEventsEnabled) {
                    return;
                }
                plugin.activeContainer = container;

                e.preventDefault();
                e.stopPropagation();

                const element = container.querySelector(
                    plugin.compoundSelector
                ) as HTMLElement | null;
                if (!element) {
                    return;
                }

                if (isDragging && e.touches.length === 1) {
                    const dx = e.touches[0].clientX - startX;
                    const dy = e.touches[0].clientY - startY;

                    plugin.diagramController.moveElement(container, dx, dy);

                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                } else if (isPinching && e.touches.length === 2) {
                    const currentDistance = calculateDistance(e.touches);
                    const factor = currentDistance / initialDistance;

                    plugin.diagramController.zoomElement(container, factor);

                    initialDistance = currentDistance;
                }
            };
        }

        /**
         * Handles the end of a touch event for the diagram element.
         * @param plugin - The plugin instance.
         * @returns A function that handles the touchend event.
         */
        function touchEnd(plugin: DiagramZoomDragPlugin) {
            return function innerTE(e: TouchEvent) {
                if (plugin.nativeTouchEventsEnabled) {
                    return;
                }
                plugin.activeContainer = container;

                const target = e.target as HTMLElement;
                // we got touch to a button panel - returning
                if (target.closest(BUTTON_SELECTOR)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                isDragging = false;
                isPinching = false;
            };
        }

        /**
         * Handles the scroll event for the diagram element.
         * @param plugin - The plugin instance.
         * @returns A function that handles the scroll event.
         */
        function scroll(plugin: DiagramZoomDragPlugin) {
            return function innerScroll(e: Event) {
                if (plugin.nativeTouchEventsEnabled) {
                    return;
                }
                plugin.activeContainer = container;

                e.preventDefault();
                e.stopPropagation();
            };
        }

        const touchStartHandler = touchStart(this.plugin);
        const touchMoveHandler = touchMove(this.plugin);
        const touchEndHandler = touchEnd(this.plugin);
        const scrollHandler = scroll(this.plugin);

        this.plugin.view.registerDomEvent(
            container,
            'touchstart',
            touchStartHandler,
            {
                passive: false,
            }
        );
        this.plugin.view.registerDomEvent(
            container,
            'touchmove',
            touchMoveHandler,
            {
                passive: false,
            }
        );
        this.plugin.view.registerDomEvent(
            container,
            'touchend',
            touchEndHandler,
            {
                passive: false,
            }
        );
        this.plugin.view.registerDomEvent(container, 'scroll', scrollHandler, {
            passive: false,
        });
    }
    /**
     * Adds keyboard event handling for a given container element.
     *
     * This function returns an event handler for `keydown` events that enables
     * keyboard-based navigation and zoom controls for diagram elements.
     *
     * The following keys are supported:
     * - Arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) to move the element.
     * - `=` or `+` (with `Ctrl`/`Cmd`) to zoom in.
     * - `-` (with `Ctrl`/`Cmd`) to zoom out.
     * - `0` (with `Ctrl`/`Cmd`) to reset zoom and position.
     *
     * When one of the supported keys is pressed, the corresponding action is
     * applied to the `container` element, and the event's default behavior is prevented.
     *
     * @param {HTMLElement} container - The container element to which keyboard events will be bound.
     * @returns {(e: KeyboardEvent) => void} A function to handle keyboard events.
     */
    addKeyboardEvents(container: HTMLElement) {
        return (e: KeyboardEvent): void => {
            const key = e.key;
            const KEYS = [
                'ArrowUp',
                'ArrowDown',
                'ArrowLeft',
                'ArrowRight',
                '=',
                '+',
                '-',
                '0',
            ];
            if (!KEYS.includes(key)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.plugin.activeContainer = container;

            switch (key) {
                case 'ArrowUp':
                    this.plugin.diagramController.moveElement(
                        container,
                        0,
                        50,
                        true
                    );
                    break;
                case 'ArrowDown':
                    this.plugin.diagramController.moveElement(
                        container,
                        0,
                        -50,
                        true
                    );
                    break;
                case 'ArrowLeft':
                    this.plugin.diagramController.moveElement(
                        container,
                        50,
                        0,
                        true
                    );
                    break;
                case 'ArrowRight':
                    this.plugin.diagramController.moveElement(
                        container,
                        -50,
                        0,
                        true
                    );
                    break;
            }

            if (e.ctrlKey) {
                switch (key) {
                    case '=':
                    case '+':
                        this.plugin.diagramController.zoomElement(
                            container,
                            1.1,
                            true
                        );
                        break;
                    case '-':
                        this.plugin.diagramController.zoomElement(
                            container,
                            0.9,
                            true
                        );
                        break;
                    case '0':
                        this.plugin.diagramController.resetZoomAndMove(
                            container,
                            true
                        );
                        break;
                }
            }
        };
    }

    addFocusEvents(container: HTMLElement): void {
        this.plugin.view.registerDomEvent(container, 'focusin', () => {
            if (this.plugin.settings.automaticFolding) {
                container.removeClass('folded');
            }
        });

        this.plugin.view.registerDomEvent(container, 'focusout', () => {
            if (this.plugin.settings.automaticFolding) {
                container.addClass('folded');
            }
        });
    }

    addPanelHoverReact(panel: HTMLElement): void {
        this.plugin.view?.registerDomEvent(
            panel,
            'mouseenter',
            (e: MouseEvent) => {
                const target = e.target as HTMLElement | null;
                if (
                    target?.matches(
                        '.hide-when-parent-folded, .diagram-fold-panel'
                    )
                ) {
                    target.setCssStyles({
                        opacity: '1',
                    });
                }
            }
        );

        this.plugin.view.registerDomEvent(
            panel,
            'mouseleave',
            (e: MouseEvent) => {
                const target = e.target as HTMLElement | null;

                if (!target) {
                    return;
                }

                const wasIsPanel = target.matches(
                    '.hide-when-parent-folded, .diagram-fold-panel'
                );

                if (wasIsPanel) {
                    target.setCssStyles({
                        opacity: (
                            this.plugin.settings.panelsOpacityOnHide * 0.1
                        ).toString(),
                    });
                }
            }
        );
    }
}
