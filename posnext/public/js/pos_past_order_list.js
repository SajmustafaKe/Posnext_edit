frappe.provide('posnext.PointOfSale');

posnext.PointOfSale.PastOrderList = class {
	static CONSTANTS = {
		SEARCH: {
			DEBOUNCE_DELAY: 300,
			PLACEHOLDER: 'Search by invoice id or customer name'
		},
		STATUS: {
			OPTIONS: 'Draft\nPaid\nUnpaid\nReturn',
			DEFAULT: 'Draft'
		},
		DISPLAY: {
			CUSTOMER_NAME_LENGTH: 20,
			CURRENCY_DECIMALS: 0
		},
		API: {
			ENDPOINT: 'posnext.posnext.page.posnext.point_of_sale.get_past_order_list'
		},
		SELECTORS: {
			INVOICE_WRAPPER: '.invoice-wrapper',
			BACK_BUTTON: '.back'
		},
		INDICATORS: {
			GREEN: 'green',
			RED: 'red',
			ORANGE: 'orange',
			BLUE: 'blue'
		}
	};

	constructor({ wrapper, events, settings }) {
		try {
			this.wrapper = wrapper;
			this.events = events;
			this.pos_profile = settings.name;
			this.custom_filter_order_list_by_profile = settings.custom_filter_order_list_by_profile;
			this.invoices = []; // Instance variable instead of global
			this.last_search = null; // Store timeout reference
			this.init_component();
		} catch (error) {
			console.error('PastOrderList constructor error:', error);
			frappe.show_alert({
				message: __('Failed to initialize order list component'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	init_component() {
		try {
			this.prepare_dom();
			this.make_filter_section();
			this.bind_events();
		} catch (error) {
			console.error('Component initialization error:', error);
			frappe.show_alert({
				message: __('Order list component initialization failed'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	prepare_dom() {
		try {
			this.wrapper.append(
				`<section class="past-order-list">
					<div class="filter-section">
						<div class="label back" style="font-size: 13px ">
							<a>
								<svg class="es-line" style="width: 13px;height: 13px">
									<use class="" href="#es-line-left-chevron"></use></svg> Back
							</a>
						</div>
						<br>
						<div class="label">${__('Recent Orders')}</div>
						<div class="search-field"></div>
						<div class="status-field"></div>
					</div>
					<div class="invoices-container"></div>
				</section>`
			);

			this.$component = this.wrapper.find('.past-order-list');
			this.$invoices_container = this.$component.find('.invoices-container');

			// Validate DOM elements
			if (!this.$component.length || !this.$invoices_container.length) {
				throw new Error('Required DOM elements not found');
			}
		} catch (error) {
			console.error('DOM preparation error:', error);
			frappe.show_alert({
				message: __('Failed to prepare order list interface'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	bind_events() {
		try {
			this.search_field.$input.on('input', (e) => {
				clearTimeout(this.last_search);
				this.last_search = setTimeout(() => {
					const search_term = e.target.value;
					this.refresh_list(search_term, this.status_field.get_value());
				}, this.constructor.CONSTANTS.SEARCH.DEBOUNCE_DELAY);
			});
			
			const me = this;
			this.$invoices_container.on('click', this.constructor.CONSTANTS.SELECTORS.INVOICE_WRAPPER, function() {
				try {
					const invoice_name = unescape($(this).attr('data-invoice-name'));
					if (invoice_name && me.events.open_invoice_data) {
						me.events.open_invoice_data(invoice_name);
					}
				} catch (error) {
					console.error('Invoice click error:', error);
					frappe.show_alert({
						message: __('Failed to open invoice'),
						indicator: me.constructor.CONSTANTS.INDICATORS.RED
					});
				}
			});
			
			this.$component.on('click', this.constructor.CONSTANTS.SELECTORS.BACK_BUTTON, function() {
				try {
					if (me.events.previous_screen) {
						me.events.previous_screen();
					}
				} catch (error) {
					console.error('Back button error:', error);
					frappe.show_alert({
						message: __('Navigation failed'),
						indicator: me.constructor.CONSTANTS.INDICATORS.RED
					});
				}
			});
		} catch (error) {
			console.error('Event binding error:', error);
			frappe.show_alert({
				message: __('Failed to setup event listeners'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	make_filter_section() {
		try {
			const me = this;
			this.search_field = frappe.ui.form.make_control({
				df: {
					label: __('Search'),
					fieldtype: 'Data',
					placeholder: __(this.constructor.CONSTANTS.SEARCH.PLACEHOLDER)
				},
				parent: this.$component.find('.search-field'),
				render_input: true,
			});
			
			this.status_field = frappe.ui.form.make_control({
				df: {
					label: __('Invoice Status'),
					fieldtype: 'Select',
					options: this.constructor.CONSTANTS.STATUS.OPTIONS,
					placeholder: __('Filter by invoice status'),
					onchange: function() {
						try {
							if (me.$component.is(':visible')) me.refresh_list();
						} catch (error) {
							console.error('Status change error:', error);
							frappe.show_alert({
								message: __('Filter update failed'),
								indicator: me.constructor.CONSTANTS.INDICATORS.RED
							});
						}
					}
				},
				parent: this.$component.find('.status-field'),
				render_input: true,
			});
			
			this.search_field.toggle_label(false);
			this.status_field.toggle_label(false);
			this.status_field.set_value(this.constructor.CONSTANTS.STATUS.DEFAULT);
		} catch (error) {
			console.error('Filter section creation error:', error);
			frappe.show_alert({
				message: __('Failed to create search filters'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	refresh_list() {
		try {
			frappe.dom.freeze();
			this.events.reset_summary();
			
			const search_term = this.search_field.get_value();
			const status = this.status_field.get_value();
			const pos_profile = this.pos_profile;
			
			this.$invoices_container.html('');
			
			let filter = { search_term, status };
			if(this.custom_filter_order_list_by_profile){
				filter = { search_term, status, pos_profile };
			}
			
			return frappe.call({
				method: this.constructor.CONSTANTS.API.ENDPOINT,
				freeze: true,
				args: filter,
				callback: (response) => {
					try {
						frappe.dom.unfreeze();
						if (response.message && Array.isArray(response.message)) {
							this.invoices = response.message;
							if (response.message.length === 0) {
								this.show_empty_state();
							} else {
								response.message.forEach(invoice => {
									const invoice_html = this.get_invoice_html(invoice);
									this.$invoices_container.append(invoice_html);
								});
							}
						} else {
							this.show_empty_state();
						}
					} catch (error) {
						console.error('Response processing error:', error);
						frappe.dom.unfreeze();
						frappe.show_alert({
							message: __('Failed to process order data'),
							indicator: this.constructor.CONSTANTS.INDICATORS.RED
						});
					}
				},
				error: (error) => {
					console.error('API call error:', error);
					frappe.dom.unfreeze();
					frappe.show_alert({
						message: __('Failed to fetch orders. Please try again.'),
						indicator: this.constructor.CONSTANTS.INDICATORS.RED
					});
					this.show_error_state();
				}
			});
		} catch (error) {
			console.error('Refresh list error:', error);
			frappe.dom.unfreeze();
			frappe.show_alert({
				message: __('Failed to refresh order list'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	get_invoice_html(invoice) {
		try {
			if (!invoice || !invoice.name) {
				console.warn('Invalid invoice data:', invoice);
				return '';
			}
			
			const posting_datetime = moment(invoice.posting_date+" "+invoice.posting_time).format("Do MMMM, h:mma");
			const customer_name = invoice.customer || __('Unknown Customer');
			const grand_total = invoice.grand_total || 0;
			const currency = invoice.currency || frappe.defaults.get_default("currency");
			
			return (
				`<div class="invoice-wrapper" data-invoice-name="${escape(invoice.name)}">
					<div class="invoice-name-date">
						<div class="invoice-name">${invoice.name}</div>
						<div class="invoice-date">
							<svg class="mr-2" width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
							</svg>
							${frappe.ellipsis(customer_name, this.constructor.CONSTANTS.DISPLAY.CUSTOMER_NAME_LENGTH)}
						</div>
					</div>
					<div class="invoice-total-status">
						<div class="invoice-total">${format_currency(grand_total, currency, this.constructor.CONSTANTS.DISPLAY.CURRENCY_DECIMALS)}</div>
						<div class="invoice-date">${posting_datetime}</div>
					</div>
				</div>
				<div class="seperator"></div>`
			);
		} catch (error) {
			console.error('Invoice HTML generation error:', error);
			return `<div class="invoice-wrapper error">
				<div class="invoice-name-date">
					<div class="invoice-name">${__('Error loading invoice')}</div>
				</div>
			</div>`;
		}
	}

	toggle_component(show) {
		try {
			if (show) {
				this.$component.css('display', 'flex');
				this.refresh_list();
			} else {
				this.$component.css('display', 'none');
			}
		} catch (error) {
			console.error('Toggle component error:', error);
			frappe.show_alert({
				message: __('Failed to toggle order list view'),
				indicator: this.constructor.CONSTANTS.INDICATORS.RED
			});
		}
	}

	show_empty_state() {
		this.$invoices_container.html(`
			<div class="empty-state" style="text-align: center; padding: 2rem; color: #8d99a6;">
				<div style="font-size: 48px; margin-bottom: 1rem;">📄</div>
				<div style="font-size: 18px; margin-bottom: 0.5rem;">${__('No Orders Found')}</div>
				<div style="font-size: 14px;">${__('Try adjusting your search criteria or create a new order')}</div>
			</div>
		`);
	}

	show_error_state() {
		this.$invoices_container.html(`
			<div class="error-state" style="text-align: center; padding: 2rem; color: #d1453b;">
				<div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
				<div style="font-size: 18px; margin-bottom: 0.5rem;">${__('Failed to Load Orders')}</div>
				<div style="font-size: 14px;">${__('Please check your connection and try again')}</div>
			</div>
		`);
	}

	// Memory leak prevention - cleanup method
	destroy() {
		try {
			// Clear timeouts
			if (this.last_search) {
				clearTimeout(this.last_search);
				this.last_search = null;
			}

			// Remove event listeners
			if (this.$invoices_container) {
				this.$invoices_container.off('click', this.constructor.CONSTANTS.SELECTORS.INVOICE_WRAPPER);
			}
			
			if (this.$component) {
				this.$component.off('click', this.constructor.CONSTANTS.SELECTORS.BACK_BUTTON);
			}

			if (this.search_field && this.search_field.$input) {
				this.search_field.$input.off('input');
			}

			// Clear references
			this.invoices = null;
			this.search_field = null;
			this.status_field = null;
			this.$component = null;
			this.$invoices_container = null;
			this.wrapper = null;
			this.events = null;
		} catch (error) {
			console.error('Cleanup error:', error);
		}
	}
};
