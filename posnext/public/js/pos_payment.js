
/* eslint-disable no-unused-vars */
frappe.provide('posnext.PointOfSale');
posnext.PointOfSale.Payment = class {
	constructor({ events, wrapper, settings }) {
		this.wrapper = wrapper;
		this.events = events;
		this.custom_show_sales_man = settings.custom_show_sales_man
		this.custom_show_additional_note = settings.custom_show_additional_note
		this.custom_edit_rate = settings.custom_edit_rate_and_uom
		this.custom_show_credit_sales = settings.custom_show_credit_sales
		this.default_payment = settings.default_payment
		this.current_payments = []
		this.enable_coupon_code = settings.enable_coupon_code

		this.init_component();
		// this.init_component();
		if (this.enable_coupon_code){
			this.render_coupon_code_field();
		}
	}

	init_component() {
		this.prepare_dom();
		this.initialize_numpad();
		this._inject_payment_styles();
		this._setup_performance_optimizations();
		this.bind_events();
		this.attach_shortcuts();

	}

	_inject_payment_styles() {
		if (document.getElementById('posnext-payment-styles')) return;
		
		const style = document.createElement('style');
		style.id = 'posnext-payment-styles';
		style.textContent = `
			/* Enhanced POS Payment Styles */
			
			/* Shortcut button click feedback */
			.shortcut-btn.shortcut-clicked {
				transform: scale(0.95) !important;
				transition: transform 0.1s ease !important;
			}
			
			/* Success flash animation */
			@keyframes success-flash {
				0% { background-color: #28a745; color: white; }
				50% { background-color: #20c997; color: white; }
				100% { background-color: #28a745; color: white; }
			}
			
			.success-flash {
				animation: success-flash 0.6s ease-in-out !important;
			}
			
			/* Shortcut flash animation */
			@keyframes shortcut-flash {
				0% { background-color: #007bff; color: white; }
				50% { background-color: #0056b3; color: white; }
				100% { background-color: #007bff; color: white; }
			}
			
			.shortcut-flash {
				animation: shortcut-flash 0.4s ease-in-out !important;
			}
			
			/* Enhanced payment mode styling */
			.mode-of-payment-control {
				transition: all 0.2s ease !important;
			}
			
			.mode-of-payment-control:focus {
				box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) !important;
				border-color: #007bff !important;
			}
			
			/* Cash shortcuts container */
			.cash-shortcuts-container {
				margin: 8px 0;
				padding: 12px;
				background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
				border: 1px solid #e9ecef;
				border-radius: 8px;
				box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
			}
			
			.cash-shortcuts-header {
				display: flex;
				align-items: center;
				justify-content: center;
				margin-bottom: 8px;
				font-size: 14px;
				font-weight: 600;
				color: #495057;
			}
			
			.cash-shortcuts-header i {
				margin-right: 6px;
				color: #28a745;
			}
			
			.cash-shortcuts-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
				gap: 6px;
			}
			
			/* Enhanced shortcut button styling */
			.shortcut-btn {
				display: flex !important;
				flex-direction: column !important;
				align-items: center !important;
				justify-content: center !important;
				padding: 10px 8px !important;
				background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
				border: 1px solid #dee2e6 !important;
				border-radius: 8px !important;
				cursor: pointer !important;
				font-size: 13px !important;
				font-weight: 600 !important;
				text-align: center !important;
				min-height: 50px !important;
				transition: all 0.2s ease !important;
				box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
				user-select: none !important;
				position: relative !important;
				overflow: hidden !important;
			}
			
			.shortcut-btn:hover {
				background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%) !important;
				transform: translateY(-2px) !important;
				box-shadow: 0 3px 12px rgba(0,0,0,0.15) !important;
				border-color: #adb5bd !important;
			}
			
			.shortcut-btn:active {
				transform: translateY(0) !important;
				box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
			}
			
			.shortcut-btn:focus {
				outline: 2px solid #007bff !important;
				outline-offset: 2px !important;
				background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
			}
			
			.shortcut-amount {
				font-size: 14px !important;
				font-weight: 700 !important;
				color: #212529 !important;
				line-height: 1.2 !important;
			}
			
			.shortcut-currency {
				font-size: 10px !important;
				font-weight: 500 !important;
				color: #6c757d !important;
				margin-top: 2px !important;
				text-transform: uppercase !important;
			}
			
			/* Payment mode icons */
			.payment-mode-icon {
				margin-right: 8px;
				font-size: 16px;
				width: 20px;
				text-align: center;
				color: #495057;
			}
			
			.payment-mode-header {
				display: flex;
				align-items: center;
				justify-content: flex-start;
				margin-bottom: 4px;
			}
			
			.payment-mode-name {
				font-size: 14px;
				font-weight: 600;
				color: #212529;
				flex: 1;
			}
			
			/* Enhanced payment mode styling */
			.mode-of-payment {
				padding: 12px !important;
				border: 2px solid #e9ecef !important;
				border-radius: 8px !important;
				background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
				transition: all 0.2s ease !important;
				cursor: pointer !important;
				position: relative !important;
			}
			
			.mode-of-payment:hover {
				border-color: #007bff !important;
				box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1) !important;
				transform: translateY(-1px) !important;
			}
			
			.mode-of-payment.border-primary {
				border-color: #007bff !important;
				box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
				background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%) !important;
			}
			
			/* Enhanced form controls */
			.payment-input-enhanced {
				border-radius: 6px !important;
				border: 2px solid #e9ecef !important;
				padding: 8px 12px !important;
				font-size: 14px !important;
				transition: all 0.2s ease !important;
			}
			
			.payment-input-enhanced:focus {
				border-color: #007bff !important;
				box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
				outline: none !important;
			}
			
			.payment-input-enhanced.error {
				border-color: #dc3545 !important;
				box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
			}
			
			/* Loading states */
			.payment-loading {
				position: relative !important;
				pointer-events: none !important;
				opacity: 0.6 !important;
			}
			
			.payment-loading::after {
				content: '';
				position: absolute;
				top: 50%;
				left: 50%;
				width: 20px;
				height: 20px;
				margin: -10px 0 0 -10px;
				border: 2px solid #007bff;
				border-top: 2px solid transparent;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
			
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			
			/* Responsive design */
			@media (max-width: 768px) {
				.cash-shortcuts-grid {
					grid-template-columns: repeat(3, 1fr) !important;
				}
				
				.shortcut-btn {
					min-height: 45px !important;
					padding: 8px 6px !important;
				}
				
				.shortcut-amount {
					font-size: 13px !important;
				}
			}
		`;
		document.head.appendChild(style);
	}

	prepare_dom() {
		this.wrapper.append(
			`<section class="payment-container" style="grid-column: span 5 / span 5;">
				<div class="section-label payment-section">${__('Payment Method')}</div>
				<div class="payment-modes"></div>
				<div class="fields-numpad-container">
					<div class="fields-section">
						<div class="section-label">${__('Additional Information')}</div>
						<div class="coupon-code"></div> <!-- ✅ Correct class here -->
						<div class="invoice-fields"></div>
					</div>
					<div class="number-pad"></div>
				</div>
				<div class="totals-section">
					<div class="totals"></div>
				</div>
				<div class="submit-order-btn">${__("Complete Order")}</div>
			</section>`
		);
	
		// ✅ Assign to the right class
		this.$component = this.wrapper.find('.payment-container');
		this.$payment_modes = this.$component.find('.payment-modes');
		this.$totals_section = this.$component.find('.totals-section');
		this.$totals = this.$component.find('.totals');
		this.$numpad = this.$component.find('.number-pad');
		this.$coupon_code = this.$component.find('.coupon-code');
		this.$invoice_fields_section = this.$component.find('.fields-section');
	}
	
	render_coupon_code_field() {
		frappe.ui.form.make_control({
			df: {
				label: __('Coupon Code'),
				fieldtype: 'Link',
				options: 'Coupon Code',
				fieldname: 'coupon_code',
				placeholder: __('Select a coupon'),
			},
			parent: this.$component.find('.coupon-code'),
			render_input: true
		});
	}
	

	make_invoice_fields_control() {
		// frappe.db.get_doc("POS Settings", undefined).then((doc) => {
			var me = this
			const fields = [];
			if(this.custom_show_credit_sales){
				fields.push({
					fieldname: "custom_credit_sales",
					label: "Credit Sales",
					fieldtype: "Check",
				})
				// fields.push({
				// 	fieldname: "custom_credit_sales_date",
				// 	label: "Credit Sales Date",
				// 	fieldtype: "Date"
				// })
			}
			if(this.custom_show_sales_man){
				fields.push({
					fieldname: "sales_person",
					label: "Sales Man",
					fieldtype: "Link",
					options: "Sales Person",
				})
			}
			if(this.custom_show_additional_note){
				fields.push({
					fieldname: "remarks",
					label: "Additional Note",
					fieldtype: "Small Text",
				})
			}

			if (!fields.length) return;
			this.$invoice_fields = this.$invoice_fields_section.find('.invoice-fields');
			this.$invoice_fields.html('');
			const frm = this.events.get_frm();
			me.current_payments = frm.doc.payments
			fields.forEach(df => {
				this.$invoice_fields.append(
					`<div class="invoice_detail_field ${df.fieldname}-field" data-fieldname="${df.fieldname}"></div>`
				);
				let df_events = {
					onchange: function() {
						if(this.df.fieldname === 'sales_person'){
							frm.clear_table("sales_team")
							cur_frm.add_child("sales_team", {
								sales_person: this.get_value(),
								allocated_percentage: 100,
							})
						} else {
							if(this.df.fieldname === 'custom_credit_sales'){
								// $('input[data-fieldname="custom_credit_sales_date"]').css("pointer-events",this.get_value() ? "" : "none")
								if(this.get_value()){
									// $('input[data-fieldname="custom_credit_sales_date"]').removeAttr('readonly')

									frm.doc.payments.forEach(p => {
										const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
										me[`${mode}_control`].set_value(0);
									})
								} else {
									console.log(me.current_payments)
									// $('input[data-fieldname="custom_credit_sales_date"]').attr('readonly', true);
									me.current_payments.forEach(p => {
										if(p.mode_of_payment === me.default_payment){
											const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
											me[`${mode}_control`].set_value(frm.doc.grand_total);
										}

									})
								}
							}
							frm.set_value(this.df.fieldname, this.get_value());
						}
		// 				if(this.df.fieldname === 'custom_credit_sales' && this.get_value()){
		// 					console.log("SELECTEEED MODE")
		// console.log(me.$payment_modes)
		// 					this.selected_mode.set_value(0);
		// 				}

					}
				};
				if (df.fieldtype == "Button") {
					df_events = {
						click: function() {
							if (frm.script_manager.has_handlers(df.fieldname, frm.doc.doctype)) {
								frm.script_manager.trigger(df.fieldname, frm.doc.doctype, frm.doc.docname);
							}
						}
					};
				}

				this[`${df.fieldname}_field`] = frappe.ui.form.make_control({
					df: {
						...df,
						...df_events
					},
					parent: this.$invoice_fields.find(`.${df.fieldname}-field`),
					render_input: true,
				});
				if(df.fieldname !== 'remarks'){
					this[`${df.fieldname}_field`].set_value(frm.doc[df.fieldname]);
				}
				// if(df.fieldname === 'custom_credit_sales_date'){
				// 	this[`${df.fieldname}_field`].set_value(frappe.datetime.get_today());
				// }
			});
		// });
	}

	initialize_numpad() {
		const me = this;
		this.number_pad = new posnext.PointOfSale.NumberPad({
			wrapper: this.$numpad,
			events: {
				numpad_event: function($btn) {
					me.on_numpad_clicked($btn);
				}
			},
			cols: 3,
			keys: [
				[ 1, 2, 3 ],
				[ 4, 5, 6 ],
				[ 7, 8, 9 ],
				[ '.', 0, 'Delete' ]
			],
		});

		this.numpad_value = '';
	}

	on_numpad_clicked($btn) {
		const button_value = $btn.attr('data-button-value');

		highlight_numpad_btn($btn);
		this.numpad_value = button_value === 'delete' ? this.numpad_value.slice(0, -1) : this.numpad_value + button_value;
		this.selected_mode.$input.get(0).focus();
		this.selected_mode.set_value(this.numpad_value);

		function highlight_numpad_btn($btn) {
			$btn.addClass('shadow-base-inner bg-selected');
			setTimeout(() => {
				$btn.removeClass('shadow-base-inner bg-selected');
			}, 100);
		}
	}

	bind_events() {
		const me = this;

		this.$payment_modes.on('click', '.mode-of-payment', function(e) {
			const mode_clicked = $(this);
			// if clicked element doesn't have .mode-of-payment class then return
			if (!$(e.target).is(mode_clicked)) return;

			const scrollLeft = mode_clicked.offset().left - me.$payment_modes.offset().left + me.$payment_modes.scrollLeft();
			me.$payment_modes.animate({ scrollLeft });

			const mode = mode_clicked.attr('data-mode');

			// hide all control fields and shortcuts
			$(`.mode-of-payment-control`).css('display', 'none');
			$(`.cash-shortcuts`).css('display', 'none');
			me.$payment_modes.find(`.pay-amount`).css('display', 'inline');
			me.$payment_modes.find(`.loyalty-amount-name`).css('display', 'none');

			// remove highlight from all mode-of-payments
			$('.mode-of-payment').removeClass('border-primary');

			if (mode_clicked.hasClass('border-primary')) {
				// clicked one is selected then unselect it
				mode_clicked.removeClass('border-primary');
				me.selected_mode = '';
			} else {
				// clicked one is not selected then select it
				mode_clicked.addClass('border-primary');
				mode_clicked.find('.mode-of-payment-control').css('display', 'flex');
				mode_clicked.find('.cash-shortcuts').css('display', 'grid');
				me.$payment_modes.find(`.${mode}-amount`).css('display', 'none');
				me.$payment_modes.find(`.${mode}-name`).css('display', 'inline');

				me.selected_mode = me[`${mode}_control`];
				me.selected_mode && me.selected_mode.$input.get(0).focus();
				me.auto_set_remaining_amount();
			}
		});

		frappe.ui.form.on('POS Invoice', 'contact_mobile', (frm) => {
			const contact = frm.doc.contact_mobile;
			const request_button = $(this.request_for_payment_field?.$input[0]);
			if (contact) {
				request_button.removeClass('btn-default').addClass('btn-primary');
			} else {
				request_button.removeClass('btn-primary').addClass('btn-default');
			}
		});

		frappe.ui.form.on('POS Invoice', 'coupon_code', (frm) => {
			if (frm.doc.coupon_code && !frm.applying_pos_coupon_code) {
				if (!frm.doc.ignore_pricing_rule) {
					frm.applying_pos_coupon_code = true;
					frappe.run_serially([
						() => frm.doc.ignore_pricing_rule=1,
						() => frm.trigger('ignore_pricing_rule'),
						() => frm.doc.ignore_pricing_rule=0,
						() => frm.trigger('apply_pricing_rule'),
						() => frm.save(),
						() => this.update_totals_section(frm.doc),
						() => (frm.applying_pos_coupon_code = false)
					]);
				} else if (frm.doc.ignore_pricing_rule) {
					frappe.show_alert({
						message: __("Ignore Pricing Rule is enabled. Cannot apply coupon code."),
						indicator: "orange"
					});
				}
			}
		});

		this.setup_listener_for_payments();

		this.$payment_modes.on('click', '.shortcut-btn', function() {
			try {
				const value = $(this).attr('data-value');
				if (!value || isNaN(value)) {
					frappe.show_alert({
						message: __('Invalid shortcut value'),
						indicator: 'red'
					});
					return;
				}
				
				// Add click feedback
				$(this).addClass('shortcut-clicked');
				setTimeout(() => {
					$(this).removeClass('shortcut-clicked');
				}, 150);
				
				me._handleShortcutSelection(value);
			} catch (error) {
				console.error('Error applying cash shortcut:', error);
				frappe.show_alert({
					message: __('Error applying cash shortcut'),
					indicator: 'red'
				});
			}
		});

		// Add keyboard support for shortcuts
		this.$payment_modes.on('keydown', '.shortcut-btn', function(e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				$(this).click();
			}
		});

		this.$component.on('click', '.submit-order-btn', () => {
			const doc = this.events.get_frm().doc;
			let paid_amount = doc.paid_amount
			if(cur_frm.doc.custom_credit_sales && this.custom_show_credit_sales){
				cur_frm.clear_table("payments")
				paid_amount = 0;
			}

			const items = doc.items;

			if ((paid_amount == 0 || !items.length) && !this.custom_show_credit_sales) {
				const message = items.length ? __("You cannot submit the order without payment.") : __("You cannot submit empty order.");
				frappe.show_alert({ message, indicator: "orange" });
				frappe.utils.play_sound("error");
				return;
			}

			this.events.submit_invoice();
		});

		frappe.ui.form.on('POS Invoice', 'paid_amount', (frm) => {
			this.update_totals_section(frm.doc);

			// need to re calculate cash shortcuts after discount is applied
			const is_cash_shortcuts_invisible = !this.$payment_modes.find('.cash-shortcuts').is(':visible');
			this.attach_cash_shortcuts(frm.doc);
			!is_cash_shortcuts_invisible && this.$payment_modes.find('.cash-shortcuts').css('display', 'grid');
			this.render_payment_mode_dom();
		});

		frappe.ui.form.on('POS Invoice', 'loyalty_amount', (frm) => {
			const formatted_currency = format_currency(frm.doc.loyalty_amount, frm.doc.currency);
			this.$payment_modes.find(`.loyalty-amount-amount`).html(formatted_currency);
		});

		frappe.ui.form.on("Sales Invoice Payment", "amount", (frm, cdt, cdn) => {
			// for setting correct amount after loyalty points are redeemed
			const default_mop = locals[cdt][cdn];
			const mode = default_mop.mode_of_payment.replace(/ +/g, "_").toLowerCase();
			if (this[`${mode}_control`] && this[`${mode}_control`].get_value() != default_mop.amount) {
				this[`${mode}_control`].set_value(default_mop.amount);
			}
		});
	}

	_handleShortcutSelection(value) {
		try {
			// Strategy 1: Use currently selected mode
			if (this.selected_mode && typeof this.selected_mode.set_value === 'function') {
				this.selected_mode.set_value(value);
				this._addShortcutFeedback(this.selected_mode.$input);
				return;
			}

			// Strategy 2: Find currently active payment mode
			const activePaymentMode = this.$payment_modes.find('.mode-of-payment.border-primary');
			if (activePaymentMode.length) {
				const mode = activePaymentMode.attr('data-mode');
				const control = this[`${mode}_control`];
				if (control && typeof control.set_value === 'function') {
					control.set_value(value);
					this._addShortcutFeedback(control.$input);
					return;
				}
			}

			// Strategy 3: Auto-select cash mode and set value
			const cashMode = this.$payment_modes.find('[data-payment-type="Cash"], [data-mode*="cash"]').first();
			if (cashMode.length) {
				cashMode.click();
				setTimeout(() => {
					if (this.selected_mode && typeof this.selected_mode.set_value === 'function') {
						this.selected_mode.set_value(value);
						this._addShortcutFeedback(this.selected_mode.$input);
					}
				}, 100);
				return;
			}

			// Strategy 4: Try first available payment mode
			const firstMode = this.$payment_modes.find('.mode-of-payment').first();
			if (firstMode.length) {
				firstMode.click();
				setTimeout(() => {
					if (this.selected_mode && typeof this.selected_mode.set_value === 'function') {
						this.selected_mode.set_value(value);
						this._addShortcutFeedback(this.selected_mode.$input);
					}
				}, 100);
				return;
			}

			// Strategy 5: Show error if nothing worked
			frappe.show_alert({
				message: __('No payment mode available for cash shortcut'),
				indicator: 'orange'
			});
		} catch (error) {
			console.error('Error in shortcut selection:', error);
			frappe.show_alert({
				message: __('Error applying shortcut value'),
				indicator: 'red'
			});
		}
	}

	_addShortcutFeedback($input) {
		if ($input && $input.length) {
			$input.addClass('shortcut-flash');
			setTimeout(() => {
				$input.removeClass('shortcut-flash');
			}, 500);
		}
	}

	setup_listener_for_payments() {
		frappe.realtime.on("process_phone_payment", (data) => {
			const doc = this.events.get_frm().doc;
			const { response, amount, success, failure_message } = data;
			let message, title;

			if (success) {
				title = __("Payment Received");
				const grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? doc.grand_total : doc.rounded_total;
				if (amount >= grand_total) {
					frappe.dom.unfreeze();
					message = __("Payment of {0} received successfully.", [format_currency(amount, doc.currency, 0)]);
					this.events.submit_invoice();
					cur_frm.reload_doc();

				} else {
					message = __("Payment of {0} received successfully. Waiting for other requests to complete...", [format_currency(amount, doc.currency, 0)]);
				}
			} else if (failure_message) {
				message = failure_message;
				title = __("Payment Failed");
			}

			frappe.msgprint({ "message": message, "title": title });
		});
	}

	auto_set_remaining_amount() {
		const doc = this.events.get_frm().doc;
		const grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? doc.grand_total : doc.rounded_total;
		const remaining_amount = grand_total - doc.paid_amount;
		const current_value = this.selected_mode ? this.selected_mode.get_value() : undefined;
		if (!current_value && remaining_amount > 0 && this.selected_mode) {
			this.selected_mode.set_value(remaining_amount);
		}
	}

	attach_shortcuts() {
		const ctrl_label = frappe.utils.is_mac() ? '⌘' : 'Ctrl';
		this.$component.find('.submit-order-btn').attr("title", `${ctrl_label}+Enter`);
		frappe.ui.keys.on("ctrl+enter", () => {
			const payment_is_visible = this.$component.is(":visible");
			const active_mode = this.$payment_modes.find(".border-primary");
			if (payment_is_visible && active_mode.length) {
				this.$component.find('.submit-order-btn').click();
			}
		});

		frappe.ui.keys.add_shortcut({
			shortcut: "tab",
			action: () => {
				const payment_is_visible = this.$component.is(":visible");
				let active_mode = this.$payment_modes.find(".border-primary");
				active_mode = active_mode.length ? active_mode.attr("data-mode") : undefined;

				if (!active_mode) return;

				const mode_of_payments = Array.from(this.$payment_modes.find(".mode-of-payment")).map(m => $(m).attr("data-mode"));
				const mode_index = mode_of_payments.indexOf(active_mode);
				const next_mode_index = (mode_index + 1) % mode_of_payments.length;
				const next_mode_to_be_clicked = this.$payment_modes.find(`.mode-of-payment[data-mode="${mode_of_payments[next_mode_index]}"]`);

				if (payment_is_visible && mode_index != next_mode_index) {
					next_mode_to_be_clicked.click();
				}
			},
			condition: () => this.$component.is(':visible') && this.$payment_modes.find(".border-primary").length,
			description: __("Switch Between Payment Modes"),
			ignore_inputs: true,
			page: cur_page.page.page
		});
	}

	toggle_numpad() {
		// pass
	}

	render_payment_section() {
		this.render_payment_mode_dom();
		this.make_invoice_fields_control();
		this.update_totals_section();
		this.focus_on_default_mop();
	}

	after_render() {
		const frm = this.events.get_frm();
		frm.script_manager.trigger("after_payment_render", frm.doc.doctype, frm.doc.docname);
	}

	edit_cart() {
		if(this.custom_edit_rate){
			const div = document.getElementById("customer-cart-container2");
			div.style.gridColumn = "span 5 / span 5";
		}

		this.events.toggle_other_sections(false);
		this.toggle_component(false);
	}

	checkout() {
		this.events.toggle_other_sections(true);
		this.toggle_component(true);

		this.render_payment_section();
		this.after_render();
	}

	toggle_remarks_control() {
		if (this.$remarks.find('.frappe-control').length) {
			this.$remarks.html('+ Add Remark');
		} else {
			this.$remarks.html('');
			this[`remark_control`] = frappe.ui.form.make_control({
				df: {
					label: __('Remark'),
					fieldtype: 'Data',
					onchange: function() {}
				},
				parent: this.$totals_section.find(`.remarks`),
				render_input: true,
			});
			this[`remark_control`].set_value('');
		}
	}

	render_payment_mode_dom() {
		const doc = this.events.get_frm().doc;
		const payments = doc.payments;
		const currency = doc.currency;

		this.$payment_modes.html(`${
			payments.map((p, i) => {
				const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
				const payment_type = p.type;
				const margin = i % 2 === 0 ? 'pr-2' : 'pl-2';
				const amount = p.amount > 0 ? format_currency(p.amount, currency) : '';

				return (`
					<div class="payment-mode-wrapper">
						<div class="mode-of-payment" data-mode="${mode}" data-payment-type="${payment_type}">
							<div class="payment-mode-header">
								<i class="${this._get_payment_icon(payment_type)} payment-mode-icon"></i>
								<span class="payment-mode-name">${p.mode_of_payment}</span>
							</div>
							<div class="${mode}-amount pay-amount">${amount}</div>
							<div class="${mode} mode-of-payment-control"></div>
						</div>
					</div>
				`);
			}).join('')
		}`);
		this.current_payments = payments
		payments.forEach(p => {
			const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
			const me = this;
			this[`${mode}_control`] = frappe.ui.form.make_control({
				df: {
					label: p.mode_of_payment,
					fieldtype: 'Currency',
					placeholder: __('Enter {0} amount.', [p.mode_of_payment]),
					onchange: function() {
						try {
							console.log(p.doctype)
							console.log(p.name)
							const current_value = frappe.model.get_value(p.doctype, p.name, 'amount');
							
							// Validate input value
							if (isNaN(this.value) || this.value < 0) {
								frappe.show_alert({
									message: __('Please enter a valid positive amount'),
									indicator: 'red'
								});
								this.set_value(current_value || 0);
								return;
							}
							
							// Check if value has actually changed
							if (current_value != this.value) {
								frappe.model
									.set_value(p.doctype, p.name, 'amount', flt(this.value))
									.then(() => {
										me.update_totals_section();
										// Add visual feedback for successful update
										this.$input.addClass('success-flash');
										setTimeout(() => {
											this.$input.removeClass('success-flash');
										}, 300);
									})
									.catch((error) => {
										console.error('Error updating payment amount:', error);
										frappe.show_alert({
											message: __('Error updating payment amount: {0}', [error.message]),
											indicator: 'red'
										});
										this.set_value(current_value || 0);
									});

								const formatted_currency = format_currency(this.value, currency);
								me.$payment_modes.find(`.${mode}-amount`).html(formatted_currency);
							}
						} catch (error) {
							console.error('Error in payment control onchange:', error);
							frappe.show_alert({
								message: __('An error occurred while processing payment'),
								indicator: 'red'
							});
						}
					}
				},
				parent: this.$payment_modes.find(`.${mode}.mode-of-payment-control`),
				render_input: true,
			});
			this[`${mode}_control`].toggle_label(false);
			this[`${mode}_control`].set_value(p.amount);
		});

		this.render_loyalty_points_payment_mode();

		this.attach_cash_shortcuts(doc);
	}

	focus_on_default_mop() {
		const doc = this.events.get_frm().doc;
		const payments = doc.payments;
		payments.forEach(p => {
			const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
			if (p.default) {
				setTimeout(() => {
					this.$payment_modes.find(`.${mode}.mode-of-payment-control`).parent().click();
				}, 500);
			}
		});
	}

	attach_cash_shortcuts(doc) {
		const grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? doc.grand_total : doc.rounded_total;
		const currency = doc.currency;

		const shortcuts = this.get_cash_shortcuts(flt(grand_total));

		this.$payment_modes.find('.cash-shortcuts').remove();
		
		if (shortcuts.length === 0) return;

		let shortcuts_html = shortcuts.map(s => {
			const formattedAmount = format_currency(s, currency, 0);
			return `<button class="shortcut-btn" 
				data-value="${s}" 
				role="button" 
				aria-label="Quick cash amount selection ${formattedAmount}"
				tabindex="0"
				style="
					display: inline-block; 
					margin: 2px; 
					padding: 8px 12px; 
					background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
					border: 1px solid #dee2e6; 
					border-radius: 6px; 
					cursor: pointer; 
					font-size: 12px; 
					font-weight: 600; 
					text-align: center; 
					min-width: 60px; 
					transition: all 0.2s ease;
					box-shadow: 0 1px 3px rgba(0,0,0,0.1);
					user-select: none;
				"
				onmouseover="this.style.background='linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';"
				onmouseout="this.style.background='linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';"
				onmousedown="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.1)';"
				onmouseup="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';"
				onfocus="this.style.outline='2px solid #007bff'; this.style.outlineOffset='2px';"
				onblur="this.style.outline='none';">${formattedAmount}</button>`;
		}).join('');

		const shortcutsContainer = `<div class="cash-shortcuts" style="
			display: grid; 
			grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
			gap: 4px; 
			margin-top: 8px; 
			padding: 8px; 
			background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); 
			border: 1px solid #e9ecef; 
			border-radius: 8px;
			box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">${shortcuts_html}</div>`;

		// Enhanced cash payment mode detection
		let cashPaymentMode = this.$payment_modes.find('[data-payment-type="Cash"]');
		
		if (!cashPaymentMode.length) {
			cashPaymentMode = this.$payment_modes.find('[data-mode*="cash"]');
		}
		
		if (!cashPaymentMode.length) {
			cashPaymentMode = this.$payment_modes.find('.mode-of-payment').filter(function() {
				return $(this).text().toLowerCase().includes('cash');
			});
		}
		
		if (!cashPaymentMode.length) {
			cashPaymentMode = this.$payment_modes.find('.mode-of-payment').first();
		}

		if (cashPaymentMode.length) {
			cashPaymentMode.find('.mode-of-payment-control')
				.after(shortcutsContainer);
		}
	}

	get_cash_shortcuts(grand_total) {
		let steps = [1, 5, 10];
		const digits = String(Math.round(grand_total)).length;

		steps = steps.map(x => x * (10 ** (digits - 2)));

		const get_nearest = (amount, x) => {
			let nearest_x = Math.ceil((amount / x)) * x;
			return nearest_x === amount ? nearest_x + x : nearest_x;
		};

		return steps.reduce((finalArr, x) => {
			let nearest_x = get_nearest(grand_total, x);
			nearest_x = finalArr.indexOf(nearest_x) != -1 ? nearest_x + x : nearest_x;
			return [...finalArr, nearest_x];
		}, []);
	}

	render_loyalty_points_payment_mode() {
		const me = this;
		const doc = this.events.get_frm().doc;
		const { loyalty_program, loyalty_points, conversion_factor } = this.events.get_customer_details();

		this.$payment_modes.find(`.mode-of-payment[data-mode="loyalty-amount"]`).parent().remove();

		if (!loyalty_program) return;

		let description, read_only, max_redeemable_amount;
		if (!loyalty_points) {
			description = __("You don't have enough points to redeem.");
			read_only = true;
		} else {
			max_redeemable_amount = flt(flt(loyalty_points) * flt(conversion_factor), precision("loyalty_amount", doc));
			description = __("You can redeem upto {0}.", [format_currency(max_redeemable_amount)]);
			read_only = false;
		}

		const margin = this.$payment_modes.children().length % 2 === 0 ? 'pr-2' : 'pl-2';
		const amount = doc.loyalty_amount > 0 ? format_currency(doc.loyalty_amount, doc.currency) : '';
		this.$payment_modes.append(
			`<div class="payment-mode-wrapper">
				<div class="mode-of-payment loyalty-card" data-mode="loyalty-amount" data-payment-type="loyalty-amount">
					<div class="payment-mode-header">
						<i class="${this._get_payment_icon('loyalty-amount')} payment-mode-icon"></i>
						<span class="payment-mode-name">Redeem Loyalty Points</span>
					</div>
					<div class="loyalty-amount-amount pay-amount">${amount}</div>
					<div class="loyalty-amount-name">${loyalty_program}</div>
					<div class="loyalty-amount mode-of-payment-control"></div>
				</div>
			</div>`
		);

		this['loyalty-amount_control'] = frappe.ui.form.make_control({
			df: {
				label: __("Redeem Loyalty Points"),
				fieldtype: 'Currency',
				placeholder: __("Enter amount to be redeemed."),
				options: 'company:currency',
				read_only,
				onchange: async function() {
					if (!loyalty_points) return;

					if (this.value > max_redeemable_amount) {
						frappe.show_alert({
							message: __("You cannot redeem more than {0}.", [format_currency(max_redeemable_amount)]),
							indicator: "red"
						});
						frappe.utils.play_sound("submit");
						me['loyalty-amount_control'].set_value(0);
						return;
					}
					const redeem_loyalty_points = this.value > 0 ? 1 : 0;
					await frappe.model.set_value(doc.doctype, doc.name, 'redeem_loyalty_points', redeem_loyalty_points);
					frappe.model.set_value(doc.doctype, doc.name, 'loyalty_points', parseInt(this.value / conversion_factor));
				},
				description
			},
			parent: this.$payment_modes.find(`.loyalty-amount.mode-of-payment-control`),
			render_input: true,
		});
		this['loyalty-amount_control'].toggle_label(false);

		// this.render_add_payment_method_dom();
	}

	render_add_payment_method_dom() {
		const docstatus = this.events.get_frm().doc.docstatus;
		if (docstatus === 0)
			this.$payment_modes.append(
				`<div class="w-full pr-2">
					<div class="add-mode-of-payment w-half text-grey mb-4 no-select pointer">+ Add Payment Method</div>
				</div>`
			);
	}

	update_totals_section(doc) {
		if (!doc) doc = this.events.get_frm().doc;
		let branch_value = $('.input-with-feedback[data-fieldname="branch"]').val();
		frappe.model.set_value(cur_frm.doctype, cur_frm.docname, 'branch', branch_value);
		// cur_frm.save()
		// doc.paid_amount = doc.grand_total
			const paid_amount = doc.paid_amount;

		if(cur_frm.doc.custom_credit_sales){
			const paid_amount = 0
		}
		const grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? doc.grand_total : doc.rounded_total;
		const remaining = grand_total - doc.paid_amount;
		const change = doc.change_amount || remaining <= 0 ? -1 * remaining : undefined;
		const currency = doc.currency;
		const label = change ? __('Change') : __('To Be Paid');

		this.$totals.html(
			`<div class="col">
				<div class="total-label">${__('Grand Total')}</div>
				<div class="value">${format_currency(grand_total, currency)}</div>
			</div>
			<div class="seperator-y"></div>
			<div class="col">
				<div class="total-label">${__('Paid Amount')}</div>
				<div class="value">${format_currency(paid_amount, currency)}</div>
			</div>
			<div class="seperator-y"></div>
			<div class="col">
				<div class="total-label">${label}</div>
				<div class="value">${format_currency(change || remaining, currency)}</div>
			</div>`
		);
	}

	_setup_performance_optimizations() {
		// Debounce function for input events
		this._debounce = (func, wait) => {
			let timeout;
			return function executedFunction(...args) {
				const later = () => {
					clearTimeout(timeout);
					func(...args);
				};
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		};

		// Cache DOM elements for better performance
		this._cache_dom_elements();
		
		// Optimize event delegation
		this._optimize_event_delegation();
		
		// Setup loading states
		this._setup_loading_states();
	}

	_cache_dom_elements() {
		// Cache frequently accessed DOM elements
		this._cached_elements = {
			payment_modes: this.$payment_modes,
			payment_container: this.$payment_modes.closest('.payment-container'),
			cash_shortcuts: null,
			mode_controls: null
		};
		
		// Update cache when DOM changes
		this._update_dom_cache = () => {
			this._cached_elements.cash_shortcuts = this.$payment_modes.find('.cash-shortcuts');
			this._cached_elements.mode_controls = this.$payment_modes.find('.mode-of-payment-control');
		};
	}

	_optimize_event_delegation() {
		// Use event delegation for better performance
		this.$payment_modes.off('input.payment_optimized');
		this.$payment_modes.on('input.payment_optimized', '.mode-of-payment-control input', 
			this._debounce((e) => {
				const $input = $(e.target);
				const fieldname = $input.attr('data-fieldname');
				if (fieldname) {
					this._handle_payment_input_optimized(fieldname, $input.val());
				}
			}, 300)
		);
	}

	_handle_payment_input_optimized(fieldname, value) {
		try {
			// Optimized payment input handling
			const numValue = flt(value);
			if (isNaN(numValue)) {
				frappe.show_alert({
					message: __('Invalid amount entered'),
					indicator: 'red'
				});
				return;
			}
			
			// Batch DOM updates
			this._batch_dom_updates(() => {
				this.update_totals_section(this.events.get_frm().doc);
			});
			
		} catch (error) {
			console.error('Error in optimized payment input handling:', error);
		}
	}

	_batch_dom_updates(callback) {
		// Use requestAnimationFrame for smoother DOM updates
		if (window.requestAnimationFrame) {
			requestAnimationFrame(() => {
				callback();
			});
		} else {
			callback();
		}
	}

	_setup_loading_states() {
		// Add loading state management
		this._loading_states = new Map();
		
		this._set_loading_state = (element, loading) => {
			const $element = $(element);
			if (loading) {
				$element.addClass('payment-loading');
				this._loading_states.set(element, true);
			} else {
				$element.removeClass('payment-loading');
				this._loading_states.delete(element);
			}
		};
		
		this._is_loading = (element) => {
			return this._loading_states.has(element);
		};
	}

	_get_payment_icon(payment_type) {
		const iconMap = {
			'Cash': 'fa fa-money-bill-wave',
			'Card': 'fa fa-credit-card',
			'Credit Card': 'fa fa-credit-card',
			'Debit Card': 'fa fa-credit-card',
			'Bank Transfer': 'fa fa-university',
			'Cheque': 'fa fa-money-check',
			'Digital Wallet': 'fa fa-mobile-alt',
			'Mobile Money': 'fa fa-mobile-alt',
			'loyalty-amount': 'fa fa-gift',
			'UPI': 'fa fa-qrcode',
			'PayPal': 'fa fa-paypal',
			'Apple Pay': 'fa fa-apple-pay',
			'Google Pay': 'fa fa-google-pay',
			'Samsung Pay': 'fa fa-samsung-pay'
		};
		
		// Default icon for unknown payment types
		return iconMap[payment_type] || 'fa fa-money-bill';
	}

	toggle_component(show) {
		show ? this.$component.css('display', 'flex') : this.$component.css('display', 'none');
	}
};
