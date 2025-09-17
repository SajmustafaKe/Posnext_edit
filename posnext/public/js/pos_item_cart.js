frappe.provide('posnext.PointOfSale');
posnext.PointOfSale.ItemCart = class {
	static CONSTANTS = {
		FIELD_NAMES: {
			CUSTOMER: 'customer',
			BRANCH: 'branch',
			CREATED_BY_NAME: 'created_by_name'
		},
		DOCTYPE: {
			SALES_INVOICE: 'Sales Invoice'
		},
		CSS_CLASSES: {
			CUSTOMER_CART_CONTAINER: 'customer-cart-container1',
			CART_CONTAINER: 'cart-container',
			CUSTOMER_SECTION: 'customer-section',
			CART_ITEMS_WRAPPER: 'cart-items-section',
			BUTTON_CHECKOUT: 'checkout-btn',
			BUTTON_HELD: 'checkout-btn-held',
			BUTTON_ORDER: 'checkout-btn-order'
		},
		SELECTORS: {
			BRANCH_WRAPPER: '.add-branch-wrapper',
			CUSTOMER_DISPLAY: '.customer-display',
			RESET_CUSTOMER_BTN: '.reset-customer-btn',
			CLOSE_DETAILS_BTN: '.close-details-btn'
		},
		EVENTS: {
			CLICK: 'click',
			KEYDOWN: 'keydown'
		},
		KEYS: {
			F1: 'F1',
			F2: 'F2', 
			F3: 'F3',
			F4: 'F4',
			ESCAPE: 'Escape'
		},
		MESSAGES: {
			NO_ITEMS: 'No items in cart',
			EMPTY_INVOICE: 'Cannot save empty invoice',
			SELECT_CUSTOMER: 'Please select a customer before holding the invoice',
			MOBILE_LENGTH_ERROR: 'Mobile Number must be exactly {0} digits long. Currently entered: {1} digits',
			MOBILE_DIGITS_ONLY: 'Mobile Number must contain only digits'
		}
	};

	constructor({ wrapper, events, settings }) {
		this.wrapper = wrapper;
		this.events = events;
		this.settings = settings;
		this.init_settings();
		this.init_component();
	}

	init_settings() {
		// Initialize all settings from the configuration
		this.customer_info = undefined;
		this.hide_images = this.settings.hide_images;
		this.allowed_customer_groups = this.settings.customer_groups;
		this.allow_rate_change = this.settings.allow_rate_change;
		this.allow_discount_change = this.settings.allow_discount_change;
		this.show_held_button = this.settings.custom_show_held_button;
		this.show_order_list_button = this.settings.custom_show_order_list_button;
		this.mobile_number_based_customer = this.settings.custom_mobile_number_based_customer;
		this.show_checkout_button = this.settings.custom_show_checkout_button;
		this.custom_edit_rate = this.settings.custom_edit_rate_and_uom;
		this.custom_use_discount_percentage = this.settings.custom_use_discount_percentage;
		this.custom_use_discount_amount = this.settings.custom_use_discount_amount;
		this.custom_use_additional_discount_amount = this.settings.custom_use_additional_discount_amount;
		this.custom_show_incoming_rate = this.settings.custom_show_incoming_rate && this.settings.custom_edit_rate_and_uom;
		this.custom_show_last_customer_rate = this.settings.custom_show_last_customer_rate;
		this.custom_show_logical_rack_in_cart = this.settings.custom_show_logical_rack_in_cart && this.settings.custom_edit_rate_and_uom;
		this.custom_show_uom_in_cart = this.settings.custom_show_uom_in_cart && this.settings.custom_edit_rate_and_uom;
		this.show_branch = this.settings.show_branch;
		this.show_batch_in_cart = this.settings.show_batch_in_cart;
		this.custom_show_item_discription = this.settings.custom_show_item_discription;
		this.custom_show_item_barcode = this.settings.custom_show_item_barcode;
		this.warehouse = this.settings.warehouse;
	}

	init_component() {
		try {
			this.prepare_dom();
			this.init_child_components();
			this.bind_events();
			this.attach_shortcuts();
		} catch (error) {
			console.error('Error initializing item cart component:', error);
			frappe.show_alert({
				message: __('Error initializing cart component: {0}', [error.message]),
				indicator: 'red'
			});
		}
	}

	prepare_dom() {
		try {
			if(this.custom_edit_rate){
				this.wrapper.append(
				    `<section class="customer-cart-container customer-cart-container1 " 
				             style="grid-column: span 5 / span 5;" 
				             id="customer-cart-container2"
				             role="region" 
				             aria-label="${__('Shopping Cart and Customer Information')}"
				             tabindex="0"></section>`
			    )
			} else {
				this.wrapper.append(
				    `<section class="customer-cart-container customer-cart-container1 " 
				             id="customer-cart-container2"
				             role="region" 
				             aria-label="${__('Shopping Cart and Customer Information')}"
				             tabindex="0"></section>`
			    )
			}			this.$component = this.wrapper.find('.' + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CUSTOMER_CART_CONTAINER);
		} catch (error) {
			console.error('Error preparing DOM:', error);
			frappe.show_alert({
				message: __('Error preparing cart interface: {0}', [error.message]),
				indicator: 'red'
			});
		}
	}

	init_child_components() {
		this.init_customer_selector();
		this.init_cart_components();
	}

	init_customer_selector() {
		this.$component.append(
			`<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CUSTOMER_SECTION}" 
			      role="region" 
			      aria-label="${__('Customer Selection')}"
			      aria-live="polite"></div>`
		)
		this.$customer_section = this.$component.find('.' + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CUSTOMER_SECTION);
		this.make_customer_selector();
	}

	reset_customer_selector() {
		try {
			const frm = this.events.get_frm();
			frm.set_value(posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, '');
			this.make_customer_selector();
			this.customer_field.set_focus();
		} catch (error) {
			console.error('Error resetting customer selector:', error);
			frappe.show_alert({
				message: __('Error resetting customer selection: {0}', [error.message]),
				indicator: 'red'
			});
		}
	}

	init_cart_components() {
		var html = `<div class="cart-container" role="region" aria-label="${__('Shopping Cart Items')}">
				<div class="abs-cart-container">
					<div class="cart-label" role="heading" aria-level="2">${__('Item Cart')}</div>
					<div class="cart-header" role="row">
						<div class="name-header" style="flex:3" role="columnheader" aria-label="${__('Item Name')}">${__('Item')}</div>
						<div class="qty-header" style="flex: 1" role="columnheader" aria-label="${__('Quantity')}">${__('Qty')}</div>
						`
			if(this.custom_show_uom_in_cart){
				html += `<div class="uom-header" style="flex: 1" role="columnheader" aria-label="${__('Unit of Measure')}">${__('UOM')}</div>`
			}
			if(this.show_batch_in_cart){
				html += `<div class="batch-header" style="flex: 1" role="columnheader" aria-label="${__('Batch Number')}">${__('Batch')}</div>`
			}
			if(this.custom_edit_rate){
				html += `<div class="rate-header" style="flex: 1" role="columnheader" aria-label="${__('Item Rate')}">${__('Rate')}</div>`
			}
			if(this.custom_use_discount_percentage){
				html += `<div class="discount-perc-header" style="flex: 1" role="columnheader" aria-label="${__('Discount Percentage')}">${__('Disc%')}</div>`
			}
			if(this.custom_use_discount_amount){
				html += `<div class="discount-amount-header" style="flex: 1" role="columnheader" aria-label="${__('Discount Amount')}">${__('Disc')}</div>`
			}
			if(this.custom_show_incoming_rate){
				html += `<div class="incoming-rate-header" style="flex: 1" role="columnheader" aria-label="${__('Incoming Rate')}">${__('Inc.Rate')}</div>`
			}
			if(this.custom_show_logical_rack_in_cart){
				html += `<div class="incoming-rate-header" style="flex: 1" role="columnheader" aria-label="${__('Storage Rack')}">${__('Rack')}</div>`
			}
			if(this.custom_show_last_customer_rate){
				html += `<div class="last-customer-rate-header" style="flex: 1" role="columnheader" aria-label="${__('Last Customer Rate')}">${__('LC Rate')}</div>`
			}
			

		html += `<div class="rate-amount-header" style="flex: 1;text-align: left" role="columnheader" aria-label="${__('Total Amount')}">${__('Amount')}</div>
					</div>
					<div class="cart-items-section" role="grid" aria-label="${__('Cart Items List')}" aria-live="polite"></div>
					<div class="cart-branch-section" role="region" aria-label="${__('Branch Selection')}"></div>
					<div class="cart-totals-section" role="region" aria-label="${__('Cart Totals and Actions')}" aria-live="polite"></div>
					<div class="numpad-section" role="region" aria-label="${__('Number Pad for Item Editing')}"></div>
				</div>
			</div>`
		this.$component.append(html);
		this.$cart_container = this.$component.find('.cart-container');
		this.make_branch_section();
		this.make_cart_totals_section();
		this.make_cart_items_section();
		this.make_cart_numpad();
		
		// Cache frequently accessed DOM elements for performance
		this.cache_dom_elements();
	}

	cache_dom_elements() {
		// Cache frequently accessed elements to avoid repeated DOM queries
		this.$checkout_btn = this.$component.find('.checkout-btn');
		this.$checkout_btn_held = this.$component.find('.checkout-btn-held');
		this.$checkout_btn_order = this.$component.find('.checkout-btn-order');
		this.$edit_cart_btn = this.$component.find('.edit-cart-btn');
		this.$add_discount_wrapper = this.$component.find('.add-discount-wrapper');
		this.$reset_customer_btn = this.$customer_section.find('.reset-customer-btn');
		this.$customer_display = this.$customer_section.find('.customer-display');
		this.refresh_cart_item_cache();
	}

	refresh_cart_item_cache() {
		// Refresh cached cart item wrappers when items change
		this.$cart_item_wrappers = this.$cart_container.find('.cart-item-wrapper');
	}

	// Security and validation utilities
	validate_mobile_number(mobile_number) {
		if (!mobile_number) {
			throw new Error(__('Mobile number is required'));
		}
		
		// Sanitize input - remove any non-digit characters
		const sanitized = mobile_number.toString().replace(/\D/g, '');
		
		const required_length = this.settings.custom_mobile_number_length || 10;
		
		if (sanitized.length !== required_length) {
			throw new Error(__('Mobile Number must be exactly {0} digits long. Currently entered: {1} digits', [required_length, sanitized.length]));
		}
		
		// Additional validation - ensure it's a valid phone number format
		if (!/^\d+$/.test(sanitized)) {
			throw new Error(__('Mobile Number must contain only digits'));
		}
		
		// Prevent common attack patterns
		if (sanitized.includes('0000000000') || sanitized.includes('1111111111') || 
			sanitized.includes('2222222222') || sanitized.includes('3333333333') ||
			sanitized.includes('4444444444') || sanitized.includes('5555555555') ||
			sanitized.includes('6666666666') || sanitized.includes('7777777777') ||
			sanitized.includes('8888888888') || sanitized.includes('9999999999')) {
			throw new Error(__('Invalid mobile number pattern'));
		}
		
		return sanitized;
	}

	sanitize_customer_input(input) {
		if (!input) return '';
		
		// Remove potentially dangerous characters
		return input.toString()
			.replace(/[<>]/g, '') // Remove angle brackets
			.replace(/javascript:/gi, '') // Remove javascript: protocol
			.replace(/on\w+=/gi, '') // Remove event handlers
			.trim();
	}

	validate_numeric_input(value, field_name, min = 0, max = null) {
		const num = flt(value);
		
		if (isNaN(num)) {
			throw new Error(__('Invalid {0}: must be a number', [field_name]));
		}
		
		if (num < min) {
			throw new Error(__('Invalid {0}: cannot be less than {1}', [field_name, min]));
		}
		
		if (max !== null && num > max) {
			throw new Error(__('Invalid {0}: cannot be greater than {1}', [field_name, max]));
		}
		
		return num;
	}

	make_cart_items_section() {
		this.$cart_header = this.$component.find('.cart-header');
		this.$cart_items_wrapper = this.$component.find('.' + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_ITEMS_WRAPPER);

		this.make_no_items_placeholder();
	}

	make_no_items_placeholder() {
		this.$cart_header.css('display', 'none');
		this.$cart_items_wrapper.html(
			`<div class="no-item-wrapper">${__(posnext.PointOfSale.ItemCart.CONSTANTS.MESSAGES.NO_ITEMS)}</div>`
		);
	}

	get_discount_icon() {
		return (
			`<svg class="discount-icon" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M19 15.6213C19 15.2235 19.158 14.842 19.4393 14.5607L20.9393 13.0607C21.5251 12.4749 21.5251 11.5251 20.9393 10.9393L19.4393 9.43934C19.158 9.15804 19 8.7765 19 8.37868V6.5C19 5.67157 18.3284 5 17.5 5H15.6213C15.2235 5 14.842 4.84196 14.5607 4.56066L13.0607 3.06066C12.4749 2.47487 11.5251 2.47487 10.9393 3.06066L9.43934 4.56066C9.15804 4.84196 8.7765 5 8.37868 5H6.5C5.67157 5 5 5.67157 5 6.5V8.37868C5 8.7765 4.84196 9.15804 4.56066 9.43934L3.06066 10.9393C2.47487 11.5251 2.47487 12.4749 3.06066 13.0607L4.56066 14.5607C4.84196 14.842 5 15.2235 5 15.6213V17.5C5 18.3284 5.67157 19 6.5 19H8.37868C8.7765 19 9.15804 19.158 9.43934 19.4393L10.9393 20.9393C11.5251 21.5251 12.4749 21.5251 13.0607 20.9393L14.5607 19.4393C14.842 19.158 15.2235 19 15.6213 19H17.5C18.3284 19 19 18.3284 19 17.5V15.6213Z" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M15 9L9 15" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M10.5 9.5C10.5 10.0523 10.0523 10.5 9.5 10.5C8.94772 10.5 8.5 10.0523 8.5 9.5C8.5 8.94772 8.94772 8.5 9.5 8.5C10.0523 8.5 10.5 8.94772 10.5 9.5Z" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M15.5 14.5C15.5 15.0523 15.0523 15.5 14.5 15.5C13.9477 15.5 13.5 15.0523 13.5 14.5C13.5 13.9477 13.9477 13.5 14.5 13.5C15.0523 13.5 15.5 13.9477 15.5 14.5Z" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>`
		);
	}

	get_branch_icon() {
		return `
			<svg class="branch-icon" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M5 3V9M5 3C6.65685 3 8 4.34315 8 6C8 7.65685 6.65685 9 5 9M5 3C3.34315 3 2 4.34315 2 6C2 7.65685 3.34315 9 5 9M19 15V21M19 15C20.6569 15 22 16.3431 22 18C22 19.6569 20.6569 21 19 21M19 15C17.3431 15 16 16.3431 16 18C16 19.6569 17.3431 21 19 21M5 9C5 13.4183 8.58172 17 13 17H16" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`;
	}
	
	make_branch_section() {
		if (this.show_branch) {
			this.$branch_section = this.$component.find('.cart-branch-section');
	
			if (this.$branch_section.length) {
				this.$branch_section.append(`
					<br>
					<div class="add-branch-wrapper">
						${this.get_branch_icon()} <span class="add-branch-text">${__('Add Branch')}</span>
					</div>
				`);
				// Change cursor on hover
				this.$branch_section.find('.add-branch-wrapper').hover(
					function () {
						$(this).css("background-color", "#f9f9f9");
					},
					function () {
						$(this).css("background-color", "transparent");
					}
				);
			}
		}
	}
	
	
	make_cart_totals_section() {
		this.$totals_section = this.$component.find('.cart-totals-section');
		
		this.$totals_section.append(
			`<div class="add-discount-wrapper">
				${this.get_discount_icon()} ${__('Add Discount')}
			</div>
			<div class="item-qty-total-container">
				<div class="item-qty-total-label">${__('Total Items')}</div>
				<div class="item-qty-total-value">0.00</div>
			</div>
			<div class="net-total-container">
				<div class="net-total-label">${__("Net Total")}</div>
				<div class="net-total-value">0.00</div>
			</div>
			<div class="taxes-container"></div>
			<div class="grand-total-container">
				<div>${__('Grand Total')}</div>
				<div>0.00</div>
			</div>
			<div style=" display: flex;justify-content: space-between;gap: 10px;">
				<div class="checkout-btn" 
				     role="button" 
				     tabindex="0" 
				     aria-label="${__('Checkout Order (F1)')}"
				     aria-describedby="checkout-description"
				     style="
							padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1; ">${__('Checkout (F1)')}</div>
				<div class="checkout-btn-held checkout-btn" 
				     role="button" 
				     tabindex="0" 
				     aria-label="${__('Hold Invoice (F2)')}"
				     aria-describedby="hold-description"
				     style="
							padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1;">${__('Held (F2)')}</div>
				<div class="checkout-btn-order checkout-btn" 
				     role="button" 
				     tabindex="0" 
				     aria-label="${__('View Order List (F3)')}"
				     aria-describedby="order-description"
				     style="
				padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1;">${__('Orders (F3)')}</div>
			</div>
			<div style="display: none;">
				<span id="checkout-description">${__('Process customer checkout and complete transaction')}</span>
				<span id="hold-description">${__('Save current invoice for later completion')}</span>
				<span id="order-description">${__('View list of pending and saved orders')}</span>
			</div>	
			<div class="edit-cart-btn">${__('Edit Cart')}</div>`
		)

		this.$add_discount_elem = this.$component.find(".add-discount-wrapper");
this.highlight_checkout_btn(true);
	}

	make_cart_numpad() {
		this.$numpad_section = this.$component.find('.numpad-section');

		this.number_pad = new posnext.PointOfSale.NumberPad({
			wrapper: this.$numpad_section,
			events: {
				numpad_event: this.on_numpad_event.bind(this)
			},
			cols: 5,
			keys: [
				[ 1, 2, 3, 'Quantity' ],
				[ 4, 5, 6, 'Discount' ],
				[ 7, 8, 9, 'Rate' ],
				[ '.', 0, 'Delete', 'Remove' ]
			],
			css_classes: [
				[ '', '', '', 'col-span-2' ],
				[ '', '', '', 'col-span-2' ],
				[ '', '', '', 'col-span-2' ],
				[ '', '', '', 'col-span-2 remove-btn' ]
			],
			fieldnames_map: { 'Quantity': 'qty', 'Discount': 'discount_percentage' }
		})

		this.$numpad_section.prepend(
			`<div class="numpad-totals" 
			      role="region" 
			      aria-label="${__('Order Summary Totals')}"
			      aria-live="polite">
				<span class="numpad-item-qty-total" 
				      role="status" 
				      aria-label="${__('Item Quantity Total')}"></span>
				<span class="numpad-net-total" 
				      role="status" 
				      aria-label="${__('Net Total Amount')}"></span>
				<span class="numpad-grand-total" 
				      role="status" 
				      aria-label="${__('Grand Total Amount')}"></span>
			</div>`
		)

		this.$numpad_section.append(
			`<div class="numpad-btn checkout-btn" 
			      role="button" 
			      tabindex="0" 
			      aria-label="${__('Checkout Order from Numpad')}"
			      data-button-value="checkout">${__('Checkout')}</div>`
		)
	}

	bind_events() {
		const me = this;
		this.$customer_section.on('click', '.reset-customer-btn', function () {
			me.reset_customer_selector();
		});

		this.$customer_section.on('click', '.close-details-btn', function () {
			me.toggle_customer_info(false);
		});

		this.$customer_section.on('click', '.customer-display', function(e) {
			if ($(e.target).closest('.reset-customer-btn').length) return;

			const show = me.$cart_container.is(':visible');
			me.toggle_customer_info(show);
		});
        
		if(!me.custom_edit_rate){
			this.$cart_items_wrapper.on('click', '.cart-item-wrapper', function() {
                const $cart_item = $(this);

                me.toggle_item_highlight(this);

                const payment_section_hidden = !me.$totals_section.find('.edit-cart-btn').is(':visible');
                if (!payment_section_hidden) {
                    
                    me.$totals_section.find(".edit-cart-btn").click();
                }

                const item_row_name = unescape($cart_item.attr('data-row-name'));
                me.events.cart_item_clicked({ name: item_row_name });
                this.numpad_value = '';
            });
		}


		this.$component.on('click', '.checkout-btn', async function() {
    if ($(this).attr('style').indexOf('--blue-500') == -1) return;
    if ($(this).attr('class').indexOf('checkout-btn-held') !== -1) return;
    if ($(this).attr('class').indexOf('checkout-btn-order') !== -1) return;
    
    try {
        if (!cur_frm.doc.customer && me.mobile_number_based_customer) {
            const dialog = me.create_mobile_dialog(async function(values) {
                try {
                    const validated_mobile = me.validate_mobile_number(values['mobile_number']);
                    await me.create_customer_and_proceed(validated_mobile);
                    await me.events.checkout();
                    me.toggle_checkout_btn(false);
                    me.allow_discount_change && me.$add_discount_elem.removeClass("d-none");
                    dialog.hide();
                } catch (error) {
                    frappe.show_alert({
                        message: __('Error creating customer and proceeding with checkout: {0}', [error.message]),
                        indicator: 'red'
                    });
                }
            });
            dialog.show();
        } else {
            if (!cur_frm.doc.customer && !me.mobile_number_based_customer) {
                frappe.throw("Please Select a customer and add items first");
                return;
            }
            await me.events.checkout();
            me.toggle_checkout_btn(false);
            me.allow_discount_change && me.$add_discount_elem.removeClass("d-none");
        }
    } catch (error) {
        frappe.show_alert({
            message: __('Error during checkout process: {0}', [error.message]),
            indicator: 'red'
        });
    }
});

this.$component.on('click', '.checkout-btn-held', function() {
    if ($(this).attr('style').indexOf('--blue-500') == -1) return;
    if (!cur_frm.doc.items.length) {
        frappe.throw("Cannot save empty invoice");
        return;
    }

    
    if (!cur_frm.doc.customer && me.mobile_number_based_customer) {
        const mobile_dialog = me.create_mobile_dialog(function(values) {
            try {
                const validated_mobile = me.validate_mobile_number(values['mobile_number']);
                
                frappe.call({
                    method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
                    args: { customer: validated_mobile },
                    freeze: true,
                    freeze_message: "Creating Customer....",
                    callback: function() {
                        const frm = me.events.get_frm();
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, validated_mobile);
                        frm.script_manager.trigger('customer', frm.doc.doctype, frm.doc.name).then(() => {
                            frappe.run_serially([
                                () => me.fetch_customer_details(validated_mobile),
                                () => me.events.customer_details_updated(me.customer_info),
                                () => me.update_customer_section(),
                                () => me.show_secret_key_popup_for_hold() 
                            ]);
                        });
                        mobile_dialog.hide();
                    },
                    error: function(r) {
                        frappe.show_alert({
                            message: __('Failed to create customer: {0}', [r.message || 'Unknown error']),
                            indicator: 'red'
                        });
                    }
                });
            } catch (error) {
                frappe.show_alert({
                    message: error.message,
                    indicator: 'red'
                });
            }
        });
        mobile_dialog.show();
    } else {
        if (!cur_frm.doc.customer && !me.mobile_number_based_customer) {
            frappe.throw("Please select a customer before holding the invoice");
            return;
        }
        me.show_secret_key_popup_for_hold();
    }
});
		this.$component.on('click', '.checkout-btn-order', () => {
			this.events.toggle_recent_order();
		});

		// Add keyboard navigation support for accessibility
		this.$component.on('keydown', '[role="button"][tabindex="0"]', function(e) {
			// Handle Enter and Space key activation for button elements
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				$(this).click();
			}
		});

		this.$totals_section.on('click', '.edit-cart-btn', () => {
			this.events.edit_cart();

			this.toggle_checkout_btn(true);
		});

		this.$component.on('click', '.add-discount-wrapper', () => {
			const can_edit_discount = this.$add_discount_elem.find('.edit-discount-btn').length;

			if(!this.discount_field || can_edit_discount) this.show_discount_control();
		});

		
		const $wrapper = $(posnext.PointOfSale.ItemCart.CONSTANTS.SELECTORS.BRANCH_WRAPPER); 
		const posProfileName = me.settings.name;
		const branchFieldWrapper = $('<div class="branch-field"></div>');
		$wrapper.replaceWith(branchFieldWrapper); 

		frappe.call({
			method: "posnext.doc_events.pos_profile.get_pos_profile_branch",
			args: {
				pos_profile_name: posProfileName
			},
			callback: function (r) {
				try {
					const branch_name = r.message && r.message.branch;
					
					let branchField = new frappe.ui.form.ControlLink({
						df: {
							fieldtype: 'Link',
							options: 'Branch',
							fieldname: posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.BRANCH,
							label: 'Branch',
							placeholder: 'Select Branch',
							default: branch_name,
							reqd: 1,
							
						},
						parent: branchFieldWrapper
					});
					
					branchField.make();
					branchField.set_value(branch_name);
					branchField.refresh();
				} catch (error) {
					frappe.show_alert({
						message: __('Error creating branch field: {0}', [error.message]),
						indicator: 'red'
					});
				}
			},
			error: function(r) {
				frappe.show_alert({
					message: __('Failed to load branch information: {0}', [r.message || 'Unknown error']),
					indicator: 'red'
				});
			}
		});
		
		frappe.ui.form.on("Sales Invoice", "paid_amount", frm => {
			// called when discount is applied
			this.update_totals_section(frm);
		});
	}

	
create_mobile_dialog(callback) {
    const me = this;
    let dialog = new frappe.ui.Dialog({
        title: 'Enter Mobile Number',
        fields: [
            {
                label: 'Mobile Number',
                fieldname: 'mobile_number',
                fieldtype: 'Data',
                reqd: 1
            },
            {
                label: '',
                fieldname: 'mobile_number_numpad',
                fieldtype: 'HTML',
                options: `<div class="mobile_number_numpad">
                    <div class="custom-numpad">
                        <style>
                        .custom-numpad {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px;
                            max-width: 350px;
                            margin: 0 auto;
                        }
                        .numpad-button {
                            padding: 15px;
                            font-size: 18px;
                            cursor: pointer;
                            background-color: #f1f1f1;
                            border: 1px solid #ccc;
                            border-radius: 5px;
                            text-align: center;
                        }
                        .numpad-button:hover {
                            background-color: #ddd;
                        }
                        </style>
                        <button class="numpad-button one">1</button>
                        <button class="numpad-button two">2</button>
                        <button class="numpad-button three">3</button>
                        <button class="numpad-button four">4</button>
                        <button class="numpad-button five">5</button>
                        <button class="numpad-button six">6</button>
                        <button class="numpad-button seven">7</button>
                        <button class="numpad-button eight">8</button>
                        <button class="numpad-button nine">9</button>
                        <button class="numpad-button delete" style="color: red">x</button>
                        <button class="numpad-button zero">0</button>
                        <button class="numpad-button clear">C</button>
                    </div>
                </div>`
            },
        ],
        size: 'small',
        primary_action_label: 'Continue',
        primary_action: callback
    });

    // Bind numpad events efficiently
    const numpad = dialog.wrapper.find(".custom-numpad");
    const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "zero"];
    
    numbers.forEach(num => {
        numpad.on('click', '.' + num, function() {
            const current_value = dialog.get_value("mobile_number") || "";
            dialog.set_value('mobile_number', current_value + $(this).text());
        });
    });

    numpad.on('click', '.clear', () => dialog.set_value('mobile_number', ""));
    numpad.on('click', '.delete', function() {
        const current_value = dialog.get_value("mobile_number") || "";
        dialog.set_value('mobile_number', current_value.slice(0, -1));
    });

    return dialog;
}
show_secret_key_popup_for_hold() {
    const me = this;
    const secret_dialog = me.create_secret_dialog(function(values) {
        const frm = me.events.get_frm();
        const invoice_name = frm.doc.name;
        
        if (!me.events.save_draft_invoice) {
            frappe.show_alert({
                message: __('Save draft invoice function is not available. Please check POS configuration.'),
                indicator: 'red'
            });
            secret_dialog.hide();
            return;
        }

        if (invoice_name && !frm.doc.__islocal) {
            // Existing draft invoice - validate permission
            frappe.call({
                method: "posnext.posnext.page.posnext.point_of_sale.check_edit_permission",
                args: {
                    invoice_name: invoice_name,
                    secret_key: values['secret_key']
                },
                freeze: true,
                freeze_message: "Validating Secret Key...",
                callback: function(r) {
                    if (r.message.can_edit) {
                        // Store invoice info before save_draft_invoice potentially changes context
                        const invoice_info = {
                            name: frm.doc.name,
                            customer: frm.doc.customer,
                            created_by_name: r.message.created_by_name || frappe.session.user
                        };
                        
                        // Set created_by_name
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'created_by_name', invoice_info.created_by_name);
                        
                        // FIXED: Wait for save_draft_invoice to complete properly
                        Promise.resolve(me.events.save_draft_invoice()).then(() => {
                            secret_dialog.hide();
                            
                            // Show success message immediately
                            frappe.show_alert({
                                message: __('Invoice {0} held successfully by {1}', [invoice_info.name, invoice_info.created_by_name]),
                                indicator: 'green'
                            });
                            frappe.utils.play_sound("submit");
                            
                            // FIXED: Use setTimeout to ensure POS has finished internal processes
                            setTimeout(() => {
                                me.handle_successful_hold(invoice_info.name, invoice_info.created_by_name);
                            }, 500);
                            
                        }).catch(error => {
                            frappe.show_alert({
                                message: __('Failed to save draft invoice: {0}', [error.message]),
                                indicator: 'red'
                            });
                            secret_dialog.hide();
                        });
                        
                    } else {
                        frappe.show_alert({
                            message: __(`You did not create this invoice, hence you cannot edit it. Only the creator (${r.message.created_by_name}) can edit it.`),
                            indicator: 'red'
                        });
                        secret_dialog.hide();
                    }
                }
            });
        } else {
            // New invoice - validate secret key and save
            frappe.call({
                method: "posnext.posnext.page.posnext.point_of_sale.get_user_name_from_secret_key",
                args: { secret_key: values['secret_key'] },
                freeze_message: "Validating Secret Key...",
                callback: function(r) {
                    if (r.message) {
                        const created_by_name = r.message;
                        
                        // Store invoice info before save_draft_invoice potentially changes context
                        const invoice_info = {
                            name: frm.doc.name,
                            customer: frm.doc.customer,
                            created_by_name: created_by_name
                        };
                        
                        // Set created_by_name
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'created_by_name', created_by_name);
                        
                        // FIXED: Wait for save_draft_invoice to complete properly
                        Promise.resolve(me.events.save_draft_invoice()).then(() => {
                            secret_dialog.hide();
                            
                            // Show success message immediately
                            frappe.show_alert({
                                message: __('Invoice {0} held successfully by {1}', [invoice_info.name, invoice_info.created_by_name]),
                                indicator: 'green'
                            });
                            frappe.utils.play_sound("submit");
                            
                            // FIXED: Use setTimeout to ensure POS has finished internal processes
                            setTimeout(() => {
                                me.handle_successful_hold(invoice_info.name, invoice_info.created_by_name);
                            }, 500);
                            
                        }).catch(error => {
                            frappe.show_alert({
                                message: __('Failed to save draft invoice: {0}', [error.message]),
                                indicator: 'red'
                            });
                            secret_dialog.hide();
                        });
                        
                    } else {
                        frappe.show_alert({
                            message: __("Invalid secret key"),
                            indicator: 'red'
                        });
                        secret_dialog.hide();
                    }
                }
            });
        }
    });
    
    secret_dialog.show();
}

create_secret_dialog(callback) {
    let dialog = new frappe.ui.Dialog({
        title: 'Enter Secret Key',
        fields: [
            {
                label: 'Secret Key',
                fieldname: 'secret_key',
                fieldtype: 'Password',
                reqd: 1
            },
            {
                label: '',
                fieldname: 'secret_key_numpad',
                fieldtype: 'HTML',
                options: `<div class="secret_key_numpad">
                    <div class="custom-numpad">
                        <style>
                        .custom-numpad {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px;
                            max-width: 350px;
                            margin: 0 auto;
                        }
                        .numpad-button {
                            padding: 15px;
                            font-size: 18px;
                            cursor: pointer;
                            background-color: #f1f1f1;
                            border: 1px solid #ccc;
                            border-radius: 5px;
                            text-align: center;
                        }
                        .numpad-button:hover {
                            background-color: #ddd;
                        }
                        </style>
                        <button class="numpad-button one">1</button>
                        <button class="numpad-button two">2</button>
                        <button class="numpad-button three">3</button>
                        <button class="numpad-button four">4</button>
                        <button class="numpad-button five">5</button>
                        <button class="numpad-button six">6</button>
                        <button class="numpad-button seven">7</button>
                        <button class="numpad-button eight">8</button>
                        <button class="numpad-button nine">9</button>
                        <button class="numpad-button delete" style="color: red">x</button>
                        <button class="numpad-button zero">0</button>
                        <button class="numpad-button clear">C</button>
                    </div>
                </div>`
            },
        ],
        size: 'small',
        primary_action_label: 'Continue',
        primary_action: callback
    });

    // Bind numpad events efficiently
    const numpad = dialog.wrapper.find(".custom-numpad");
    const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "zero"];
    
    numbers.forEach(num => {
        numpad.on('click', '.' + num, function() {
            const current_value = dialog.get_value("secret_key") || "";
            dialog.set_value('secret_key', current_value + $(this).text());
        });
    });

    numpad.on('click', '.clear', () => dialog.set_value('secret_key', ""));
    numpad.on('click', '.delete', function() {
        const current_value = dialog.get_value("secret_key") || "";
        dialog.set_value('secret_key', current_value.slice(0, -1));
    });

    return dialog;
}


async create_customer_and_proceed(mobile_number, next_action) {
    const me = this;
    try {
        await frappe.call({
            method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
            args: { customer: mobile_number },
            freeze: true,
            freeze_message: "Processing..."
        });

        const frm = me.events.get_frm();
        frappe.model.set_value(frm.doc.doctype, frm.doc.name, posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, mobile_number);
        
        await frm.script_manager.trigger('customer', frm.doc.doctype, frm.doc.name);
        await me.fetch_customer_details(mobile_number);
        me.events.customer_details_updated(me.customer_info);
        me.update_customer_section();
        
        if (next_action) await next_action(mobile_number);
    } catch (error) {
        frappe.show_alert({ message: __("Failed to process customer"), indicator: 'red' });
        throw error;
    }
}

    async handle_successful_hold(invoice_name, creator_name) {
        try {
            // FIXED: Don't show success message here (already shown in popup)
            // Just handle the post-save actions        console.log('Opening order list to show held invoice...');
        
        // FIXED: Ensure the item cart is hidden when showing recent orders
        if (this.$component && this.$component.length) {
            this.$component.css('display', 'none');
        }
        
        // Open the recent orders list
        await this.events.toggle_recent_order();
        
        // FIXED: Show additional info about the held invoice
        setTimeout(() => {
            frappe.show_alert({
                message: __('Find your held invoice "{0}" in the order list', [invoice_name]),
                indicator: 'blue'
            });
        }, 1000);
        
    } catch (error) {
        frappe.show_alert({
            message: __('Invoice held successfully, but error opening order list: {0}', [error.message]),
            indicator: 'orange'
        });
    }
}

	attach_shortcuts() {
		for (let row of this.number_pad.keys) {
			for (let btn of row) {
				if (typeof btn !== 'string') continue; // do not make shortcuts for numbers

				let shortcut_key = `ctrl+${frappe.scrub(String(btn))[0]}`;
				if (btn === 'Delete') shortcut_key = 'ctrl+backspace';
				if (btn === 'Remove') shortcut_key = 'shift+ctrl+backspace'
				if (btn === '.') shortcut_key = 'ctrl+>';

				// to account for fieldname map
				const fieldname = this.number_pad.fieldnames[btn] ? this.number_pad.fieldnames[btn] :
					typeof btn === 'string' ? frappe.scrub(btn) : btn;

				let shortcut_label = shortcut_key.split('+').map(frappe.utils.to_title_case).join('+');
				shortcut_label = frappe.utils.is_mac() ? shortcut_label.replace('Ctrl', '⌘') : shortcut_label;
				this.$numpad_section.find(`.numpad-btn[data-button-value="${fieldname}"]`).attr("title", shortcut_label);

				frappe.ui.keys.on(`${shortcut_key}`, () => {
					const cart_is_visible = this.$component.is(":visible");
					if (cart_is_visible && this.item_is_selected && this.$numpad_section.is(":visible")) {
						this.$numpad_section.find(`.numpad-btn[data-button-value="${fieldname}"]`).click();
					}
				})
			}
		}
		const ctrl_label = frappe.utils.is_mac() ? '⌘' : 'Ctrl';
		this.$checkout_btn.attr("title", `${ctrl_label}+Enter`);
		frappe.ui.keys.add_shortcut({
			shortcut: "ctrl+enter",
			action: () => this.$checkout_btn.click(),
			condition: () => this.$component.is(":visible") && !this.$edit_cart_btn.is(':visible'),
			description: __("Checkout Order / Submit Order / New Order"),
			ignore_inputs: true,
			page: cur_page.page.page
		});
		this.$edit_cart_btn.attr("title", `${ctrl_label}+E`);
		frappe.ui.keys.on("ctrl+e", () => {
			const item_cart_visible = this.$component.is(":visible");
			const checkout_btn_invisible = !this.$checkout_btn.is('visible');
			if (item_cart_visible && checkout_btn_invisible) {
				this.$edit_cart_btn.click();
			}
		});
		this.$add_discount_wrapper.attr("title", `${ctrl_label}+D`);
		frappe.ui.keys.add_shortcut({
			shortcut: "ctrl+d",
			action: () => this.$add_discount_wrapper.click(),
			condition: () => this.$add_discount_elem.is(":visible"),
			description: __("Add Order Discount"),
			ignore_inputs: true,
			page: cur_page.page.page
		});


		frappe.ui.keys.on("escape", () => {
			const item_cart_visible = this.$component.is(":visible");
			if (item_cart_visible && this.discount_field && this.discount_field.parent.is(":visible")) {
				this.discount_field.set_value(0);
			}
		});
	}

	toggle_item_highlight(item) {
		const $cart_item = $(item);
		const item_is_highlighted = $cart_item.attr("style") == "background-color:var(--gray-50);";

		if (!item || item_is_highlighted) {
			this.item_is_selected = false;
			this.$cart_item_wrappers.css("background-color", "");
		} else {
			$cart_item.css("background-color", "var(--control-bg)");
			this.item_is_selected = true;
			this.$cart_item_wrappers.not(item).css("background-color", "");
		}
	}

	make_customer_selector() {
		this.$customer_section.html(`
			<div class="customer-field"></div>
		`);
		const me = this;
		const query = { query: 'posnext.controllers.queries.customer_query' };
		const allowed_customer_group = this.allowed_customer_groups || [];
		if (allowed_customer_group.length) {
			query.filters = {
				customer_group: ['in', allowed_customer_group]
			}
		}
		this.customer_field = frappe.ui.form.make_control({
			df: {
				label: __('Customer'),
				fieldtype: 'Link',
				options: 'Customer',
				placeholder: __('Search by customer name, phone, email.'),
				read_only: this.mobile_number_based_customer,
				get_query: () => query,
				onchange: function() {
					if (this.value) {
						const frm = me.events.get_frm();
						frappe.dom.freeze();
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, this.value);
						frm.script_manager.trigger('customer', frm.doc.doctype, frm.doc.name).then(() => {
							frappe.run_serially([
								() => me.fetch_customer_details(this.value),
								() => me.events.customer_details_updated(me.customer_info),
								() => me.update_customer_section(),
								() => me.update_totals_section(),
								() => frappe.dom.unfreeze()
							]);
						})
					}
				},
			},
			parent: this.$customer_section.find('.customer-field'),
			render_input: true,
		});
		this.customer_field.toggle_label(false);
	}

	fetch_customer_details(customer) {
		if (customer) {
			return new Promise((resolve) => {
				frappe.db.get_value('Customer', customer, ["email_id", "mobile_no", "image", "loyalty_program"]).then(({ message }) => {
					const { loyalty_program } = message;
					// if loyalty program then fetch loyalty points too
					if (loyalty_program) {
						frappe.call({
							method: "erpnext.accounts.doctype.loyalty_program.loyalty_program.get_loyalty_program_details_with_points",
							args: { customer, loyalty_program, "silent": true },
							callback: (r) => {
								const { loyalty_points, conversion_factor } = r.message;
								if (!r.exc) {
									this.customer_info = { ...message, customer, loyalty_points, conversion_factor };
									resolve();
								}
							},
							error: (r) => {
								console.error('Error fetching loyalty program details:', r);
								frappe.show_alert({
									message: __('Error loading customer loyalty details: {0}', [r.message || 'Unknown error']),
									indicator: 'red'
								});
								this.customer_info = { ...message, customer };
								resolve();
							}
						});
					} else {
						this.customer_info = { ...message, customer };
						resolve();
					}
				}).catch(error => {
					console.error('Error fetching customer details:', error);
					frappe.show_alert({
						message: __('Error loading customer information: {0}', [error.message]),
						indicator: 'red'
					});
					this.customer_info = { customer };
					resolve();
				});
			});
		} else {
			return new Promise((resolve) => {
				this.customer_info = {}
				resolve();
			});
		}
	}

	show_discount_control() {
		this.$add_discount_elem.css({ 'padding': '0px', 'border': 'none' });
		this.$add_discount_elem.html(
			`<div class="add-discount-field"></div>`
		);
		const me = this;
		const frm = me.events.get_frm();
		let discount = frm.doc.additional_discount_percentage;
		this.discount_field = null;
		if(me.custom_use_additional_discount_amount){
			this.discount_field = frappe.ui.form.make_control({
				df: {
					label: __('Discount'),
					fieldtype: 'Data',
					placeholder: ( discount ? discount :  __('Enter discount amount.') ),
					input_class: 'input-xs',
					onchange: function() {
						setTimeout(()=>{
							try {
								const validated_value = me.validate_numeric_input(this.value, 'Discount Amount', 0);
								if (validated_value != 0) {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'discount_amount', validated_value);
									me.hide_discount_control(validated_value);
								} else {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'discount_amount', 0);
									me.$add_discount_elem.css({
										'border': '1px dashed var(--gray-500)',
										'padding': 'var(--padding-sm) var(--padding-md)'
									});
									me.$add_discount_elem.html(`${me.get_discount_icon()} ${__('Add Discount')}`);
									me.discount_field = undefined;
								}
							} catch (error) {
								frappe.show_alert({
									message: error.message,
									indicator: 'red'
								});
								this.set_value(0);
							}
						}, 3000);
					},
				},
				parent: this.$add_discount_elem.find('.add-discount-field'),
				render_input: true,
			});
		}else{
			this.discount_field = frappe.ui.form.make_control({
				df: {
					label: __('Discount'),
					fieldtype: 'Data',
					placeholder: ( discount ? discount + '%' :  __('Enter discount percentage.') ),
					input_class: 'input-xs',
					onchange: function() {
						setTimeout(()=>{
							try {
								const validated_value = me.validate_numeric_input(this.value, 'Discount Percentage', 0, 100);
								if (validated_value != 0) {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'additional_discount_percentage', validated_value);
									me.hide_discount_control(validated_value);
								} else {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'additional_discount_percentage', 0);
									me.$add_discount_elem.css({
										'border': '1px dashed var(--gray-500)',
										'padding': 'var(--padding-sm) var(--padding-md)'
									});
									me.$add_discount_elem.html(`${me.get_discount_icon()} ${__('Add Discount')}`);
									me.discount_field = undefined;
								}
							} catch (error) {
								frappe.show_alert({
									message: error.message,
									indicator: 'red'
								});
								this.set_value(0);
							}
						}, 3000)
					},
				},
				parent: this.$add_discount_elem.find('.add-discount-field'),
				render_input: true,
			});
		}
		this.discount_field.toggle_label(false);
		this.discount_field.set_focus();
	}

	hide_discount_control(discount) {
		if (!discount) {
			this.$add_discount_elem.css({ 'padding': '0px', 'border': 'none' });
			this.$add_discount_elem.html(
				`<div class="add-discount-field"></div>`
			);
		} else {
			this.$add_discount_elem.css({
				'border': '1px dashed var(--dark-green-500)',
				'padding': 'var(--padding-sm) var(--padding-md)'
			});
			if(this.custom_use_additional_discount_amount){
				this.$add_discount_elem.html(
					`<div class="edit-discount-btn">
						${this.get_discount_icon()} ${__("Additional")}&nbsp;${String(discount).bold()}&nbsp;${this.events.get_frm().doc.currency} ${__("discount applied")}
					</div>`
				);
			}else{
				this.$add_discount_elem.html(
					`<div class="edit-discount-btn">
						${this.get_discount_icon()} ${__("Additional")}&nbsp;${String(discount).bold()}% ${__("discount applied")}
					</div>`
				);
			}
			
		}
	}

	update_customer_section() {
		const me = this;
		const { customer, email_id='', mobile_no='', image } = this.customer_info || {};

		if (customer) {
			this.$customer_section.html(
				`<div class="customer-details">
					<div class="customer-display">
						${this.get_customer_image()}
						<div class="customer-name-desc">
							<div class="customer-name">${customer}</div>
							${get_customer_description()}
						</div>
						<div class="reset-customer-btn" data-customer="${escape(customer)}">
							<svg width="32" height="32" viewBox="0 0 14 14" fill="none">
								<path d="M4.93764 4.93759L7.00003 6.99998M9.06243 9.06238L7.00003 6.99998M7.00003 6.99998L4.93764 9.06238L9.06243 4.93759" stroke="#8D99A6"/>
							</svg>
						</div>
					</div>
				</div>`
			);
			if(this.mobile_number_based_customer){
				this.$reset_customer_btn.css('display', 'none');
			} else {
				this.$reset_customer_btn.css('display', 'flex');
			}
		} else {
			// reset customer selector
			this.reset_customer_selector();
		}

		function get_customer_description() {
			if (!email_id && !mobile_no) {
				return `<div class="customer-desc">${__('Click to add email / phone')}</div>`;
			} else if (email_id && !mobile_no) {
				return `<div class="customer-desc">${email_id}</div>`;
			} else if (mobile_no && !email_id) {
				return `<div class="customer-desc">${mobile_no}</div>`;
			} else {
				return `<div class="customer-desc">${email_id} - ${mobile_no}</div>`;
			}
		}

	}

	get_customer_image() {
		const { customer, image } = this.customer_info || {};
		if (image) {
			return `<div class="customer-image"><img src="${image}" alt="${image}""></div>`;
		} else {
			return `<div class="customer-image customer-abbr">${frappe.get_abbr(customer)}</div>`;
		}
	}

	update_totals_section(frm) {
		if (!frm) frm = this.events.get_frm();
		frm.cscript.calculate_taxes_and_totals();
	
		this.render_net_total(frm.doc.items);
		this.render_total_item_qty(frm.doc.items);
	
		let grand_total = cint(frappe.sys_defaults.disable_rounded_total)
			? frm.doc.grand_total
			: frm.doc.rounded_total;
	
		if (!frm.doc.items || frm.doc.items.length === 0) {
			if (Math.abs(grand_total) != 0.005) {
				grand_total = 0.000;
			}
		}
	
		this.render_grand_total(grand_total);
		this.render_taxes(frm.doc.taxes);
	}

	render_net_total(items) {
		const currency = this.events.get_frm().doc.currency;
		var total_net_amount = 0;
		items.map((item) => {
			total_net_amount = total_net_amount + item.net_amount;
		});

		this.$totals_section.find('.net-total-container').html(
			`<div>${__('Net Total')}</div><div>${format_currency(total_net_amount, currency)}</div>`
		)

		this.$numpad_section.find('.numpad-net-total').html(
			`<div>${__('Net Total')}: <span>${format_currency(total_net_amount, currency)}</span></div>`
		);
	}

	render_total_item_qty(items) {
		var total_item_qty = 0;
		items.map((item) => {
			total_item_qty = total_item_qty + item.qty;
		});

		this.$totals_section.find('.item-qty-total-container').html(
			`<div>${__('Total Quantity')}</div><div>${total_item_qty}</div>`
		);

		this.$numpad_section.find('.numpad-item-qty-total').html(
			`<div>${__('Total Quantity')}: <span>${total_item_qty}</span></div>`
		);
	}

	render_grand_total(value) {
		const currency = this.events.get_frm().doc.currency;
		this.$totals_section.find('.grand-total-container').html(
			`<div>${__('Grand Total')}</div><div>${format_currency(value, currency)}</div>`
		)

		this.$numpad_section.find('.numpad-grand-total').html(
			`<div>${__('Grand Total')}: <span>${format_currency(value, currency)}</span></div>`
		);
	}

	render_taxes(taxes) {
		if (taxes && taxes.length) {
			const currency = this.events.get_frm().doc.currency;
			const taxes_html = taxes.map(t => {
				if (t.tax_amount_after_discount_amount == 0.0) return;
				// if tax rate is 0, don't print it.
				const description = /[0-9]+/.test(t.description) ? t.description : ((t.rate != 0) ? `${t.description} @ ${t.rate}%`: t.description);
				return `<div class="tax-row">
					<div class="tax-label">${description}</div>
					<div class="tax-value">${format_currency(t.tax_amount_after_discount_amount, currency)}</div>
				</div>`;
			}).join('');
			this.$totals_section.find('.taxes-container').css('display', 'flex').html(taxes_html);
		} else {
			this.$totals_section.find('.taxes-container').css('display', 'none').html('');
		}
	}

	get_cart_item({ name }) {
		const item_selector = `.cart-item-wrapper[data-row-name="${escape(name)}"]`;
		return this.$cart_items_wrapper.find(item_selector);
	}

	get_item_from_frm(item) {
		const doc = this.events.get_frm().doc;
		return doc.items.find(i => i.name == item.name);
	}

	update_item_html(item, remove_item) {
		const $item = this.get_cart_item(item);

		if (remove_item) {
			$item && $item.next().remove() && $item.remove();
		} else {
			const item_row = this.get_item_from_frm(item);
			this.render_cart_item(item_row, $item);
		}

		const no_of_cart_items = this.$cart_items_wrapper.find('.cart-item-wrapper').length;
		this.highlight_checkout_btn(true);

		this.update_empty_cart_section(no_of_cart_items);
		
		// Refresh cached elements after DOM changes
		this.refresh_cart_item_cache();
	}

	render_cart_item(item_data, $item_to_update) {
		const currency = this.events.get_frm().doc.currency;
		const me = this;

		// Ensure item container exists
		$item_to_update = this.ensure_item_container(item_data, $item_to_update);
		
		// Generate HTML structure
		const item_html = this.generate_item_html(item_data);
		$item_to_update.html(item_html);
		
		// Set up form controls if editing is enabled
		if (me.custom_edit_rate) {
			this.setup_item_form_controls(item_data, $item_to_update);
		}

		// Set up form controls if editing is enabled
		if (me.custom_edit_rate) {
			this.setup_item_form_controls(item_data, $item_to_update);
		}

		// Set dynamic header width
		this.set_dynamic_rate_header_width();

		function get_description_html(item_data) {
			const hide_description = me.custom_show_item_discription;
			if (hide_description) {
				if (item_data.description.indexOf('<div>') != -1) {
					try {
						item_data.description = $(item_data.description).text();
					} catch (error) {
						item_data.description = item_data.description
							.replace(/<div>/g, ' ')
							.replace(/<\/div>/g, ' ')
							.replace(/ +/g, ' ');
					}
				}
				item_data.description = frappe.ellipsis(item_data.description, 45);
				return `<div class="item-desc">${item_data.description}</div>`;
			}
			return ``;
		}

		// FIXED FUNCTION: Properly handle barcode display without requiring a callback
		function get_item_barcode(item_data) {
			const show_barcode = me.custom_show_item_barcode;
		
			if (!show_barcode) {
				return '';
			}
			
			// Create a unique placeholder ID for this item's barcodes
			const barcode_placeholder_id = `barcode-${item_data.item_code.replace(/[^a-zA-Z0-9]/g, '-')}`;
			
			// Fetch barcodes asynchronously and update the placeholder
			frappe.call({
				method: "posnext.posnext.page.posnext.point_of_sale.get_barcodes",
				args: {
					item_code: item_data.item_code
				},
				callback: function(response) {
					if (response.message && response.message.length > 0) {
						const html = response.message.map(b => `
							<div class="item-barcode" style="font-size: 12px; color: #888;">
								${b.barcode}
							</div>
						`).join('');
						$(`#${barcode_placeholder_id}`).html(html);
					}
				},
				error: function(r) {
					frappe.show_alert({
						message: __('Error loading barcodes: {0}', [r.message || 'Unknown error']),
						indicator: 'red'
					});
				}
			});
			
			// Return a placeholder div that will be filled when the data is available
			return `<div id="${barcode_placeholder_id}" class="item-barcodes"></div>`;
		}

		function get_item_image_html() {
			const { image, item_name } = item_data;
			if (!me.hide_images && image) {
				return `
					<div class="item-image">
						<img
							onerror="cur_pos.cart.handle_broken_image(this)"
							src="${image}" alt="${frappe.get_abbr(item_name)}"">
					</div>`;
			} else {
				return `<div class="item-image item-abbr">${frappe.get_abbr(item_name)}</div>`;
			}
		}
	}

	handle_broken_image($img) {
		const item_abbr = $($img).attr('alt');
		$($img).parent().replaceWith(`<div class="item-image item-abbr">${item_abbr}</div>`);
	}

	update_selector_value_in_cart_item(selector, value, item) {
		const $item_to_update = this.get_cart_item(item);
		$item_to_update.attr(`data-${selector}`, escape(value));
	}

	toggle_checkout_btn(show_checkout) {
		if (show_checkout) {
			if(this.show_checkout_button){
				this.$checkout_btn.css('display', 'flex');
			} else {
				this.$checkout_btn.css('display', 'none');
			}

			if(this.show_held_button){
				this.$checkout_btn_held.css('display', 'flex');
			} else {
				this.$checkout_btn_held.css('display', 'none');
			}
			if(this.show_order_list_button){
				this.$checkout_btn_order.css('display', 'flex');
			} else {
				this.$checkout_btn_order.css('display', 'none');
			}
			this.$edit_cart_btn.css('display', 'none');
		} else {
			this.$checkout_btn.css('display', 'none');
				this.$checkout_btn_held.css('display', 'none');
			this.$checkout_btn_held.css('display', 'none');
				this.$checkout_btn_order.css('display', 'none');
			this.$edit_cart_btn.css('display', 'flex');
		}
	}

	highlight_checkout_btn(toggle) {
		if (toggle) {
			this.$add_discount_elem.css('display', 'flex');
			this.$checkout_btn.css({
				'background-color': 'var(--blue-500)'
			});
			if(this.show_held_button){
				this.$checkout_btn_held.css({
					'background-color': 'var(--blue-500)'
				});
			} else {
				this.$checkout_btn_held.css({
					'background-color': 'var(--blue-200)'
				});
			}
			if(this.show_order_list_button){
				this.$checkout_btn_order.css({
					'background-color': 'var(--blue-500)'
				});
			} else {
				this.$checkout_btn_order.css({
					'background-color': 'var(--blue-500)'
				});
			}

		} else {
			this.$add_discount_elem.css('display', 'none');
			this.$checkout_btn.css({
				'background-color': 'var(--blue-200)'
			});
			this.$checkout_btn_held.css({
				'background-color': 'var(--blue-200)'
			});

			this.$checkout_btn_order.css({
				'background-color': 'var(--blue-500)'
			});
		}
	}

	update_empty_cart_section(no_of_cart_items) {
		const $no_item_element = this.$cart_items_wrapper.find('.no-item-wrapper');

		// if cart has items and no item is present
		no_of_cart_items > 0 && $no_item_element && $no_item_element.remove() && this.$cart_header.css('display', 'flex');

		no_of_cart_items === 0 && !$no_item_element.length && this.make_no_items_placeholder();
	}

	on_numpad_event($btn) {
		const current_action = $btn.attr('data-button-value');
		const action_is_field_edit = ['qty', 'discount_percentage', 'rate'].includes(current_action);
		const action_is_allowed = action_is_field_edit ? (
			(current_action == 'rate' && this.allow_rate_change) ||
			(current_action == 'discount_percentage' && this.allow_discount_change) ||
			(current_action == 'qty')) : true;

		const action_is_pressed_twice = this.prev_action === current_action;
		const first_click_event = !this.prev_action;
		const field_to_edit_changed = this.prev_action && this.prev_action != current_action;

		if (action_is_field_edit) {
			if (!action_is_allowed) {
				const label = current_action == 'rate' ? 'Rate'.bold() : 'Discount'.bold();
				const message = __('Editing {0} is not allowed as per POS Profile settings', [label]);
				frappe.show_alert({
					indicator: 'red',
					message: message
				});
				frappe.utils.play_sound("error");
				return;
			}

			if (first_click_event || field_to_edit_changed) {
				this.prev_action = current_action;
			} else if (action_is_pressed_twice) {
				this.prev_action = undefined;
			}
			this.numpad_value = '';

		} else if (current_action === 'checkout') {
			this.prev_action = undefined;
			this.toggle_item_highlight();
			this.events.numpad_event(undefined, current_action);
			return;
		} else if (current_action === 'remove') {
			this.prev_action = undefined;
			this.toggle_item_highlight();
			this.events.numpad_event(undefined, current_action);
			return;
		} else {
			this.numpad_value = current_action === 'delete' ? this.numpad_value.slice(0, -1) : this.numpad_value + current_action;
			this.numpad_value = this.numpad_value || 0;
		}

		const first_click_event_is_not_field_edit = !action_is_field_edit && first_click_event;

		if (first_click_event_is_not_field_edit) {
			frappe.show_alert({
				indicator: 'red',
				message: __('Please select a field to edit from numpad')
			});
			frappe.utils.play_sound("error");
			return;
		}

		if (flt(this.numpad_value) > 100 && this.prev_action === 'discount_percentage') {
			frappe.show_alert({
				message: __('Discount cannot be greater than 100%'),
				indicator: 'orange'
			});
			frappe.utils.play_sound("error");
			this.numpad_value = this.validate_numeric_input(this.numpad_value, 'Discount Percentage', 0, 100);
		}

		this.highlight_numpad_btn($btn, current_action);
		this.events.numpad_event(this.numpad_value, this.prev_action);
	}

	highlight_numpad_btn($btn, curr_action) {
		const curr_action_is_highlighted = $btn.hasClass('highlighted-numpad-btn');
		const curr_action_is_action = ['qty', 'discount_percentage', 'rate', 'done'].includes(curr_action);

		if (!curr_action_is_highlighted) {
			$btn.addClass('highlighted-numpad-btn');
		}
		if (this.prev_action === curr_action && curr_action_is_highlighted) {
			// if Qty is pressed twice
			$btn.removeClass('highlighted-numpad-btn');
		}
		if (this.prev_action && this.prev_action !== curr_action && curr_action_is_action) {
			// Order: Qty -> Rate then remove Qty highlight
			const prev_btn = $(`[data-button-value='${this.prev_action}']`);
			prev_btn.removeClass('highlighted-numpad-btn');
		}
		if (!curr_action_is_action || curr_action === 'done') {
			// if numbers are clicked
			setTimeout(() => {
				$btn.removeClass('highlighted-numpad-btn');
			}, 200);
		}
	}

	toggle_numpad(show) {
		if (show) {
			this.$totals_section.css('display', 'none');
			this.$numpad_section.css('display', 'flex');
		} else {
			this.$totals_section.css('display', 'flex');
			this.$numpad_section.css('display', 'none');
		}
		this.reset_numpad();
	}

	reset_numpad() {
		this.numpad_value = '';
		this.prev_action = undefined;
		this.$numpad_section.find('.highlighted-numpad-btn').removeClass('highlighted-numpad-btn');
	}

	toggle_numpad_field_edit(fieldname) {
		if (['qty', 'discount_percentage', 'rate'].includes(fieldname)) {
			this.$numpad_section.find(`[data-button-value="${fieldname}"]`).click();
		}
	}

	toggle_customer_info(show) {
		if (show) {
			const { customer } = this.customer_info || {};

			this.$cart_container.css('display', 'none');
			this.$customer_section.css({
				'height': '100%',
				'padding-top': '0px'
			});
			this.$customer_section.find('.customer-details').html(
				`<div class="header">

					<div class="label">Contact Details</div>
					<div class="close-details-btn">
						<svg width="32" height="32" viewBox="0 0 14 14" fill="none">
							<path d="M4.93764 4.93759L7.00003 6.99998M9.06243 9.06238L7.00003 6.99998M7.00003 6.99998L4.93764 9.06238L9.06243 4.93759" stroke="#8D99A6"/>
						</svg>
					</div>
				</div>
				<div class="customer-display">
					${this.get_customer_image()}
					<div class="customer-name-desc">
						<div class="customer-name">${customer}</div>
						<div class="customer-desc"></div>
					</div>
				</div>
				<div class="customer-fields-container" 
				     role="form" 
				     aria-label="${__('Customer Information Form')}">
					<div class="email_id-field" 
					     role="group" 
					     aria-label="${__('Customer Email Field')}"></div>
					<div class="mobile_no-field" 
					     role="group" 
					     aria-label="${__('Customer Mobile Number Field')}"></div>
					<div class="loyalty_program-field" 
					     role="group" 
					     aria-label="${__('Customer Loyalty Program Field')}"></div>
					<div class="loyalty_points-field" 
					     role="group" 
					     aria-label="${__('Customer Loyalty Points Field')}"></div>
				</div>
				<div class="transactions-label">Recent Transactions</div>`
			);
			// transactions need to be in diff div from sticky elem for scrolling
			this.$customer_section.append(`<div class="customer-transactions"></div>`);
			if(this.mobile_number_based_customer){
				this.$customer_section.find('.mobile_no-field').css('display', 'none');
				this.$customer_section.find('.close-details-btn').css('display', 'none');
			} else {
				this.$customer_section.find('.mobile_no-field').css('display', 'flex');
				this.$customer_section.find('.close-details-btn').css('display', 'flex');
			}
			this.render_customer_fields();
			this.fetch_customer_transactions();

		} else {
			this.$cart_container.css('display', 'flex');
			this.$customer_section.css({
				'height': '',
				'padding-top': ''
			});

			this.update_customer_section();
		}
	}

	render_customer_fields() {
		const $customer_form = this.$customer_section.find('.customer-fields-container');

		const dfs = [{
			fieldname: 'email_id',
			label: __('Email'),
			fieldtype: 'Data',
			options: 'email',
			placeholder: __("Enter customer's email")
		},{
			fieldname: 'mobile_no',
			label: __('Phone Number'),
			fieldtype: 'Data',
			placeholder: __("Enter customer's phone number")
		},{
			fieldname: 'loyalty_program',
			label: __('Loyalty Program'),
			fieldtype: 'Link',
			options: 'Loyalty Program',
			placeholder: __("Select Loyalty Program")
		},{
			fieldname: 'loyalty_points',
			label: __('Loyalty Points'),
			fieldtype: 'Data',
			read_only: 1
		}];

		const me = this;
		dfs.forEach(df => {
			this[`customer_${df.fieldname}_field`] = frappe.ui.form.make_control({
				df: { ...df,
					onchange: handle_customer_field_change,
				},
				parent: $customer_form.find(`.${df.fieldname}-field`),
				render_input: true,
			});
			this[`customer_${df.fieldname}_field`].set_value(this.customer_info[df.fieldname]);
		})

		function handle_customer_field_change() {
			const current_value = me.customer_info[this.df.fieldname];
			const current_customer = me.customer_info.customer;

			if (this.value && current_value != this.value && this.df.fieldname != 'loyalty_points') {
				frappe.call({
					method: 'posnext.posnext.page.posnext.point_of_sale.set_customer_info',
					args: {
						fieldname: this.df.fieldname,
						customer: current_customer,
						value: this.value
					},
					callback: (r) => {
						if(!r.exc) {
							me.customer_info[this.df.fieldname] = this.value;
							frappe.show_alert({
								message: __("Customer contact updated successfully."),
								indicator: 'green'
							});
							frappe.utils.play_sound("submit");
						}
					}
				});
			}
		}
	}

	fetch_customer_transactions() {
		frappe.db.get_list('Sales Invoice', {
			filters: { customer: this.customer_info.customer, docstatus: 1 },
			fields: ['name', 'grand_total', 'status', 'posting_date', 'posting_time', 'currency'],
			limit: 20
		}).then((res) => {
			const transaction_container = this.$customer_section.find('.customer-transactions');

			if (!res.length) {
				transaction_container.html(
					`<div class="no-transactions-placeholder">No recent transactions found</div>`
				)
				return;
			}

			const elapsed_time = moment(res[0].posting_date+" "+res[0].posting_time).fromNow();
			this.$customer_section.find('.customer-desc').html(`Last transacted ${elapsed_time}`);

			res.forEach(invoice => {
				const posting_datetime = moment(invoice.posting_date+" "+invoice.posting_time).format("Do MMMM, h:mma");
				let indicator_color = {
					'Paid': 'green',
					'Draft': 'red',
					'Return': 'gray',
					'Consolidated': 'blue'
				};

				transaction_container.append(
					`<div class="invoice-wrapper" data-invoice-name="${escape(invoice.name)}">
						<div class="invoice-name-date">
							<div class="invoice-name">${invoice.name}</div>
							<div class="invoice-date">${posting_datetime}</div>
						</div>
						<div class="invoice-total-status">
							<div class="invoice-total">
								${format_currency(invoice.grand_total, invoice.currency, 0) || 0}
							</div>
							<div class="invoice-status">
								<span class="indicator-pill whitespace-nowrap ${indicator_color[invoice.status]}">
									<span>${invoice.status}</span>
								</span>
							</div>
						</div>
					</div>
					<div class="seperator"></div>`
				)
			});
		});
	}

	attach_refresh_field_event(frm) {
		$(frm.wrapper).off('refresh-fields');
		$(frm.wrapper).on('refresh-fields', () => {
			if (frm.doc.items.length) {
				this.$cart_items_wrapper.html('');
				frm.doc.items.forEach(item => {
					this.update_item_html(item);
				});
			}
		});
	}

	load_invoice() {
		console.log("Load invoice")
		const frm = this.events.get_frm();

		this.attach_refresh_field_event(frm);

		this.fetch_customer_details(frm.doc.customer).then(() => {
			this.events.customer_details_updated(this.customer_info);
			this.update_customer_section();
		
			this.$cart_items_wrapper.html('');
			if (frm.doc.items.length) {
				frm.doc.items.forEach(item => {
					this.update_item_html(item);
				});
			} else {
				this.make_no_items_placeholder();
				this.highlight_checkout_btn(true);
			}

			this.update_totals_section(frm);

			if(frm.doc.docstatus === 1) {
				this.$totals_section.find('.checkout-btn').css('display', 'none');
				this.$totals_section.find('.checkout-btn-held').css('display', 'none');
				if(this.show_order_list_button){
					this.$totals_section.find('.checkout-btn-order').css('display', 'flex');
				} else {
					this.$totals_section.find('.checkout-btn-order').css('display', 'none');
				}
				this.$totals_section.find('.edit-cart-btn').css('display', 'none');
			} else {
				if(this.show_checkout_button) {
					this.$totals_section.find('.checkout-btn').css('display', 'flex');
				} else {
									this.$totals_section.find('.checkout-btn').css('display', 'none');

				}
				if(this.show_held_button){
					this.$totals_section.find('.checkout-btn-held').css('display', 'flex');
				} else {
				this.$totals_section.find('.checkout-btn-held').css('display', 'none');
				}
				if(this.show_order_list_button){
					this.$totals_section.find('.checkout-btn-order').css('display', 'flex');
				} else {
					this.$totals_section.find('.checkout-btn-order').css('display', 'none');
				}
				this.$totals_section.find('.edit-cart-btn').css('display', 'none');
			}

			this.toggle_component(true);
		});
	}

	toggle_component(show) {
		show ? this.$component.css('display', 'flex') : this.$component.css('display', 'none');
	}

	show_reference_dialog(mobile_number = null) {
		const me = this;
		const dialog = new frappe.ui.Dialog({
			title: __('Enter Reference Details'),
			fields: [
				{
					fieldtype: 'Data',
					label: __('Reference Number'),
					fieldname: 'reference_no',
					reqd: 1
				},
				{
					fieldtype: 'Data',
					label: __('Reference Name'),
					fieldname: 'reference_name',
					reqd: 1
				}
			],
			primary_action_label: __('Hold Invoice'),
			primary_action: async (values) => {
				if (mobile_number) {
					// Create customer if mobile number provided
					await frappe.call({
						method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
						args: { customer: mobile_number },
						freeze: true,
						freeze_message: "Creating Customer...."
					});
					
					const frm = me.events.get_frm();
					await frappe.model.set_value(frm.doc.doctype, frm.doc.name, posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, mobile_number);
					await frm.script_manager.trigger('customer', frm.doc.doctype, frm.doc.name);
				}

				// Update reference details
				const frm = me.events.get_frm();
				frm.doc.custom_reference_no = values.reference_no;
				frm.doc.custom_reference_name = values.reference_name;
				
				dialog.hide();
				await me.events.save_draft_invoice();
			}
		});
		dialog.show();
	}

	async hold_invoice(mobile_number = null) {
		if (mobile_number) {
			await frappe.call({
				method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
				args: { customer: mobile_number },
				freeze: true,
				freeze_message: "Creating Customer...."
			});
			
			const frm = this.events.get_frm();
			await frappe.model.set_value(frm.doc.doctype, frm.doc.name, posnext.PointOfSale.ItemCart.CONSTANTS.FIELD_NAMES.CUSTOMER, mobile_number);
			await frm.script_manager.trigger('customer', frm.doc.doctype, frm.doc.name);
		}
		
		await this.events.save_draft_invoice();
	}
}

document.addEventListener('keydown', function (event) {
    const activeElement = document.activeElement;
    const isInputActive = activeElement.tagName === 'INPUT' || 
                          activeElement.tagName === 'TEXTAREA' || 
                          activeElement.isContentEditable;

    if (event.key === 'F1' && !isInputActive) {
        event.preventDefault(); // Prevent browser help window
        const checkoutButton = document.querySelector('.checkout-btn');
        if (checkoutButton) {
            checkoutButton.click();
        } else {
            console.warn("Checkout button not found!");
        }
    }

    // New shortcut for the held checkout button
    if (event.key === 'F2' && !isInputActive) {
        event.preventDefault(); // Prevent default action
        const heldCheckoutButton = document.querySelector('.checkout-btn-held');
        if (heldCheckoutButton) {
            heldCheckoutButton.click();
        } else {
            console.warn("Held Checkout button not found!");
        }
    }

	// ... existing code ...
    // New shortcut for the checkout button order
    if (event.key === 'F3' && !isInputActive) {
        event.preventDefault(); // Prevent default action
        const orderCheckoutButton = document.querySelector('.checkout-btn-order');
        if (orderCheckoutButton) {
            orderCheckoutButton.click();
        } else {
            // Order Checkout button not found - silently ignore
        }
    }
// ... existing code ...
    // New shortcut for the search field button
    if (event.key === 'F4' && !isInputActive) {
        event.preventDefault(); // Prevent default action
        const searchFieldButton = document.querySelector('.search-field button'); // Adjust selector as needed
        if (searchFieldButton) {
            searchFieldButton.click();
        } else {
            // Search field button not found - silently ignore
        }
    }
});