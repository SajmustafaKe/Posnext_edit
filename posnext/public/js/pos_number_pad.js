frappe.provide('posnext.PointOfSale');

posnext.PointOfSale.NumberPad = class {
	static CONSTANTS = {
		CSS: {
			CONTAINER: 'numpad-container',
			BUTTON: 'numpad-btn',
			BUTTON_ACTIVE: 'numpad-btn-active',
			BUTTON_DISABLED: 'numpad-btn-disabled',
			BUTTON_LOADING: 'numpad-btn-loading'
		},
		SELECTORS: {
			BUTTON: '.numpad-btn',
			CONTAINER: '.numpad-container'
		},
		ARIA: {
			ROLE_BUTTON: 'button',
			LABEL_PREFIX: 'Number pad button',
			DISABLED: 'disabled',
			PRESSED: 'aria-pressed'
		},
		DEFAULTS: {
			COLS: 3,
			KEYS: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '']],
			CSS_CLASSES: [],
			FIELDNAMES: {}
		},
		INDICATORS: {
			GREEN: 'green',
			RED: 'red',
			ORANGE: 'orange',
			BLUE: 'blue'
		},
		EVENTS: {
			CLICK: 'click',
			KEYDOWN: 'keydown',
			FOCUS: 'focus',
			BLUR: 'blur'
		}
	};

	constructor({ wrapper, events, cols, keys, css_classes, fieldnames_map }) {
		try {
			// Validate required parameters
			this.validate_constructor_params({ wrapper, events, cols, keys, css_classes, fieldnames_map });
			
			this.wrapper = wrapper;
			this.events = events;
			this.cols = cols || this.constructor.CONSTANTS.DEFAULTS.COLS;
			this.keys = keys || this.constructor.CONSTANTS.DEFAULTS.KEYS;
			this.css_classes = css_classes || this.constructor.CONSTANTS.DEFAULTS.CSS_CLASSES;
			this.fieldnames = fieldnames_map || this.constructor.CONSTANTS.DEFAULTS.FIELDNAMES;
			
			// Component state
			this.is_disabled = false;
			this.button_states = new Map(); // Track individual button states
			
			this.init_component();
		} catch (error) {
			console.error('NumberPad constructor error:', error);
			frappe.show_alert({
				message: __('Failed to initialize number pad'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	validate_constructor_params({ wrapper, events, cols, keys, css_classes, fieldnames_map }) {
		// Validate wrapper
		if (!wrapper) {
			throw new Error('NumberPad requires a wrapper element');
		}
		if (!wrapper.jquery && !wrapper.nodeType) {
			throw new Error('Wrapper must be a jQuery object or DOM element');
		}

		// Validate events
		if (!events) {
			throw new Error('NumberPad requires an events object');
		}
		if (typeof events.numpad_event !== 'function') {
			throw new Error('Events object must have a numpad_event method');
		}

		// Validate keys if provided
		if (keys && !Array.isArray(keys)) {
			throw new Error('Keys must be an array');
		}
		if (keys) {
			keys.forEach((row, i) => {
				if (!Array.isArray(row)) {
					throw new Error(`Keys row ${i} must be an array`);
				}
			});
		}

		// Validate cols if provided
		if (cols && (typeof cols !== 'number' || cols < 1)) {
			throw new Error('Cols must be a positive number');
		}

		// Validate css_classes if provided
		if (css_classes && !Array.isArray(css_classes)) {
			throw new Error('CSS classes must be an array');
		}

		// Validate fieldnames_map if provided
		if (fieldnames_map && typeof fieldnames_map !== 'object') {
			throw new Error('Fieldnames map must be an object');
		}
	}

	init_component() {
		try {
			this.prepare_dom();
			this.bind_events();
			this.setup_accessibility();
		} catch (error) {
			console.error('NumberPad initialization error:', error);
			frappe.show_alert({
				message: __('Number pad initialization failed'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	prepare_dom() {
		try {
			const container_html = this.generate_container_html();
			this.wrapper.html(container_html);
			
			// Cache DOM references
			this.$container = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.CONTAINER);
			this.$buttons = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON);
			
			// Validate DOM creation
			if (!this.$container.length) {
				throw new Error('Failed to create number pad container');
			}
		} catch (error) {
			console.error('DOM preparation error:', error);
			frappe.show_alert({
				message: __('Failed to create number pad interface'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	generate_container_html() {
		const buttons_html = this.generate_buttons_html();
		return `<div class="${this.constructor.CONSTANTS.CSS.CONTAINER}">${buttons_html}</div>`;
	}

	generate_buttons_html() {
		return this.keys.reduce((html, row, row_index) => {
			return html + row.reduce((row_html, key, col_index) => {
				return row_html + this.generate_button_html(key, row_index, col_index);
			}, '');
		}, '');
	}

	generate_button_html(key, row_index, col_index) {
		const button_data = this.prepare_button_data(key, row_index, col_index);
		
		return `<div class="${button_data.classes}" 
				data-button-value="${button_data.fieldname}"
				role="${this.constructor.CONSTANTS.ARIA.ROLE_BUTTON}"
				aria-label="${button_data.aria_label}"
				tabindex="${button_data.tabindex}">
					${button_data.display_text}
				</div>`;
	}

	prepare_button_data(key, row_index, col_index) {
		const extra_class = this.css_classes && this.css_classes[row_index] ? 
			this.css_classes[row_index][col_index] || '' : '';
		
		const fieldname = this.fieldnames && this.fieldnames[key] ?
			this.fieldnames[key] : typeof key === 'string' ? frappe.scrub(key) : key;
		
		const display_text = this.sanitize_html(__(key));
		const is_empty = !key || key === '';
		
		return {
			classes: `${this.constructor.CONSTANTS.CSS.BUTTON} ${extra_class}`.trim(),
			fieldname: this.sanitize_attribute(fieldname),
			aria_label: `${this.constructor.CONSTANTS.ARIA.LABEL_PREFIX} ${key || 'empty'}`,
			display_text: display_text,
			tabindex: is_empty ? '-1' : '0'
		};
	}

	sanitize_html(text) {
		if (typeof text !== 'string') return '';
		return text.replace(/[<>&"']/g, (match) => {
			const escape_map = {
				'<': '&lt;',
				'>': '&gt;',
				'&': '&amp;',
				'"': '&quot;',
				"'": '&#x27;'
			};
			return escape_map[match];
		});
	}

	sanitize_attribute(value) {
		if (typeof value !== 'string' && typeof value !== 'number') return '';
		return String(value).replace(/[<>&"']/g, '');
	}

	bind_events() {
		try {
			const me = this;
			
			// Click events
			this.wrapper.on(this.constructor.CONSTANTS.EVENTS.CLICK, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
				me.handle_button_click($(this), event);
			});
			
			// Keyboard events for accessibility
			this.wrapper.on(this.constructor.CONSTANTS.EVENTS.KEYDOWN, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
				me.handle_button_keydown($(this), event);
			});
			
			// Focus events for visual feedback
			this.wrapper.on(this.constructor.CONSTANTS.EVENTS.FOCUS, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
				me.handle_button_focus($(this), event);
			});
			
			this.wrapper.on(this.constructor.CONSTANTS.EVENTS.BLUR, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
				me.handle_button_blur($(this), event);
			});
		} catch (error) {
			console.error('Event binding error:', error);
			frappe.show_alert({
				message: __('Failed to setup number pad interactions'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	handle_button_click($button, event) {
		try {
			event.preventDefault();
			
			if (this.is_button_disabled($button) || this.is_disabled) {
				return;
			}
			
			this.add_button_feedback($button);
			this.trigger_numpad_event($button);
		} catch (error) {
			console.error('Button click error:', error);
			frappe.show_alert({
				message: __('Button action failed'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	handle_button_keydown($button, event) {
		try {
			// Handle Enter and Space key presses
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				this.handle_button_click($button, event);
			}
			// Handle arrow key navigation
			else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
				event.preventDefault();
				this.navigate_buttons($button, event.key);
			}
		} catch (error) {
			console.error('Keyboard event error:', error);
		}
	}

	handle_button_focus($button, event) {
		try {
			$button.addClass('focused');
		} catch (error) {
			console.error('Focus event error:', error);
		}
	}

	handle_button_blur($button, event) {
		try {
			$button.removeClass('focused');
		} catch (error) {
			console.error('Blur event error:', error);
		}
	}

	navigate_buttons($current_button, direction) {
		try {
			const $buttons = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON + ':not([tabindex="-1"])');
			const current_index = $buttons.index($current_button);
			const total_buttons = $buttons.length;
			
			if (current_index === -1) return;
			
			let next_index;
			const cols = this.cols;
			const rows = Math.ceil(total_buttons / cols);
			const current_row = Math.floor(current_index / cols);
			const current_col = current_index % cols;
			
			switch (direction) {
				case 'ArrowLeft':
					next_index = current_index > 0 ? current_index - 1 : total_buttons - 1;
					break;
				case 'ArrowRight':
					next_index = current_index < total_buttons - 1 ? current_index + 1 : 0;
					break;
				case 'ArrowUp':
					next_index = current_row > 0 ? current_index - cols : current_index + (rows - 1) * cols;
					if (next_index >= total_buttons) next_index = current_col;
					break;
				case 'ArrowDown':
					next_index = current_row < rows - 1 ? current_index + cols : current_col;
					if (next_index >= total_buttons) next_index = current_index;
					break;
				default:
					return;
			}
			
			if (next_index >= 0 && next_index < total_buttons) {
				$buttons.eq(next_index).focus();
			}
		} catch (error) {
			console.error('Button navigation error:', error);
		}
	}

	setup_accessibility() {
		try {
			// Set container role
			this.$container.attr('role', 'grid');
			this.$container.attr('aria-label', __('Number pad'));
			
			// Ensure first button is focusable
			const $first_button = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON + ':not([tabindex="-1"])').first();
			if ($first_button.length) {
				$first_button.attr('tabindex', '0');
			}
		} catch (error) {
			console.error('Accessibility setup error:', error);
		}
	}

	add_button_feedback($button) {
		try {
			// Visual feedback
			$button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_ACTIVE);
			
			// Remove feedback after short delay
			setTimeout(() => {
				$button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_ACTIVE);
			}, 150);
			
			// Audio feedback (optional)
			this.play_button_sound();
		} catch (error) {
			console.error('Button feedback error:', error);
		}
	}

	play_button_sound() {
		try {
			// Optional: Play system sound or custom sound
			if (frappe.utils && frappe.utils.play_sound) {
				frappe.utils.play_sound('click');
			}
		} catch (error) {
			// Silently fail for audio
		}
	}

	trigger_numpad_event($button) {
		try {
			if (this.events && typeof this.events.numpad_event === 'function') {
				this.events.numpad_event($button);
			}
		} catch (error) {
			console.error('Numpad event trigger error:', error);
			frappe.show_alert({
				message: __('Number pad action failed'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	is_button_disabled($button) {
		return $button.hasClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED) ||
			   $button.attr('aria-disabled') === 'true';
	}

	// Public API methods for external control
	disable_button(value) {
		try {
			const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
			if ($button.length) {
				$button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
				$button.attr('aria-disabled', 'true');
				$button.attr('tabindex', '-1');
				this.button_states.set(value, 'disabled');
			}
		} catch (error) {
			console.error('Button disable error:', error);
		}
	}

	enable_button(value) {
		try {
			const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
			if ($button.length) {
				$button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
				$button.removeAttr('aria-disabled');
				$button.attr('tabindex', '0');
				this.button_states.delete(value);
			}
		} catch (error) {
			console.error('Button enable error:', error);
		}
	}

	disable_all() {
		try {
			this.is_disabled = true;
			this.$buttons.addClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
			this.$buttons.attr('aria-disabled', 'true');
			this.$buttons.attr('tabindex', '-1');
		} catch (error) {
			console.error('Disable all error:', error);
		}
	}

	enable_all() {
		try {
			this.is_disabled = false;
			this.$buttons.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
			this.$buttons.removeAttr('aria-disabled');
			this.$buttons.attr('tabindex', '0');
		} catch (error) {
			console.error('Enable all error:', error);
		}
	}

	set_loading_state(value, loading = true) {
		try {
			const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
			if ($button.length) {
				if (loading) {
					$button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_LOADING);
					$button.attr('aria-busy', 'true');
				} else {
					$button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_LOADING);
					$button.removeAttr('aria-busy');
				}
			}
		} catch (error) {
			console.error('Loading state error:', error);
		}
	}

	// Memory leak prevention - cleanup method
	destroy() {
		try {
			// Remove all event listeners
			if (this.wrapper) {
				this.wrapper.off(this.constructor.CONSTANTS.EVENTS.CLICK, this.constructor.CONSTANTS.SELECTORS.BUTTON);
				this.wrapper.off(this.constructor.CONSTANTS.EVENTS.KEYDOWN, this.constructor.CONSTANTS.SELECTORS.BUTTON);
				this.wrapper.off(this.constructor.CONSTANTS.EVENTS.FOCUS, this.constructor.CONSTANTS.SELECTORS.BUTTON);
				this.wrapper.off(this.constructor.CONSTANTS.EVENTS.BLUR, this.constructor.CONSTANTS.SELECTORS.BUTTON);
			}

			// Clear button states
			if (this.button_states) {
				this.button_states.clear();
			}

			// Clear DOM references
			this.$container = null;
			this.$buttons = null;
			this.wrapper = null;
			this.events = null;
			this.keys = null;
			this.css_classes = null;
			this.fieldnames = null;
			this.button_states = null;
		} catch (error) {
			console.error('Cleanup error:', error);
		}
	}
}
