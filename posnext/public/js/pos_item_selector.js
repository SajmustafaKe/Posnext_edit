frappe.provide('posnext.PointOfSale');
var view = "List"

posnext.PointOfSale.ItemSelector = class {
	// eslint-disable-next-line no-unused-vars
	constructor({ frm, wrapper, events, pos_profile, settings,currency,init_item_cart,reload_status }) {
		this.wrapper = wrapper;
		this.events = events;
		this.currency = currency;
		this.pos_profile = pos_profile;
		this.hide_images = settings.hide_images;
		this.reload_status = reload_status
		this.auto_add_item = settings.auto_add_item_to_cart;
		this.auto_search_serial = settings.custom_auto_search_serial_number;
		if(settings.custom_default_view){
			view = settings.custom_default_view
		}
		if(settings.custom_show_only_list_view){
			view = "List"
		}
		if(settings.custom_show_only_card_view){
			view = "Card"
		}
		this.custom_show_item_code = settings.custom_show_item_code
		this.custom_show_last_incoming_rate = settings.custom_show_last_incoming_rate
		this.custom_show_oem_part_number = settings.custom_show_oem_part_number
		this.custom_show_posting_date = settings.custom_show_posting_date
		this.custom_show_logical_rack = settings.custom_show_logical_rack
		this.show_only_list_view = settings.custom_show_only_list_view
		this.show_only_card_view = settings.custom_show_only_card_view
		this.custom_edit_rate = settings.custom_edit_rate_and_uom
		this.custom_show_incoming_rate = settings.custom_show_incoming_rate && settings.custom_edit_rate_and_uom;
		this.custom_show_item_discription = settings.custom_show_item_discription;
		// this.custom_edit_uom = settings.custom_edit_uom
		this.inti_component();
	}

	inti_component() {

		this.prepare_dom();
		this.make_search_bar();
		this.load_items_data();
		this.bind_events();
		this.attach_shortcuts();
	}

	prepare_dom() {
		var cardlist = ``
		if(!this.show_only_list_view && !this.show_only_card_view){
			cardlist = `
			<div class="list-view" style="grid-column: span 1 / span 2!important;"><a class="list-span">List</a></div>
			<div class="card-view" style="grid-column: span 1 / span 2!important;"><a class="card-span">Card</a></div>
			`
		}

		if(view === "Card" && !this.show_only_list_view){
			var tir = ``
			if(this.custom_show_last_incoming_rate || this.custom_show_incoming_rate){
				tir = `<div class="total-incoming-rate" style="margin-left: 10px;grid-column: span 2 / span 2"></div>`
			}
			this.wrapper.append(
				`<section class="items-selector" id="card-view-section" style="grid-column: span 5/span 5!important;">
					<div class="filter-section">` + cardlist + `<div class="pos-profile" style="grid-column: span 2 / span 2"></div>
						<div class="search-field" style="grid-column: span 4 / span 4"></div>
						<!--<div class="item-code-search-field" style="grid-column: span 2 / span 2"></div>-->
						<div class="item-group-field" style="grid-column: span 2 / span 2"></div>
						<div class="invoice-posting-date" style="margin-left: 10px;grid-column: span 2 / span 2"></div>` + tir + `
						
					</div>
					<div class="items-container"></div>
				</section>
				`
			);

			this.$component = this.wrapper.find('.items-selector');
			this.$items_container = this.$component.find('.items-container');
		} else if(view === "List" && !this.show_only_card_view) {
            var section = `<section class="customer-cart-container items-selector" id="list-view-section" style="grid-column: span 6 / span 6;overflow-y:hidden">`
			var tir = ``
			if(this.custom_edit_rate){
			    section = `<section class="customer-cart-container items-selector" id="list-view-section" style="grid-column: span 5 / span 5;overflow-y:hidden">`
			}
			if(this.custom_show_last_incoming_rate || this.custom_show_incoming_rate){
				tir = `<div class="total-incoming-rate" style="margin-left: 10px;grid-column: span 2 / span 2"></div>`
			}


			this.wrapper.append(
				section + `<div class="filter-section">` + cardlist + `<div class="pos-profile" style="grid-column: span 2 / span 2"></div>
						<div class="search-field" style="grid-column: span 4 / span 4"></div>
						<!--<div class="item-code-search-field" style="grid-column: span 2 / span 2"></div>-->
						<div class="item-group-field" style="grid-column: span 2 / span 2"></div>
						<div class="invoice-posting-date" style="margin-left: 10px;grid-column: span 2 / span 2"></div>` + tir + `
						
					</div>
					<div class="cart-container" ></div>
				</section>`
			);

			this.$component = this.wrapper.find('.customer-cart-container');
			this.$items_container = this.$component.find('.cart-container');
		}
        if(!this.show_only_list_view && !this.show_only_card_view) {
            this.$list_view = this.$component.find('.list-view');
            this.$card_view = this.$component.find('.card-view');
            if (view === "List" && !this.show_only_list_view) {
                this.$list_view.find('.list-span').css({
                    "display": "inline-block",
                    "background-color": "#3498db",
                    "color": "white",
                    "padding": "3px 3px",
                    "border-radius": "20px",
                    "font-size": "12px",
                    "font-weight": "bold",
                    "text-transform": "uppercase",
                    "letter-spacing": "1px",
                    "cursor": "pointer",
                    "transition": "background-color 0.3s ease"
                });
                this.$card_view.find('.card-span').css({
                    "display": "",
                    "background-color": "",
                    "color": "",
                    "padding": "3px 3px",
                    "border-radius": "",
                    "font-size": "",
                    "font-weight": "",
                    "text-transform": "",
                    "letter-spacing": "",
                    "cursor": "",
                    "transition": ""
                });
            } else if (view === "Card" && !this.show_only_card_view) {
                this.$card_view.find('.card-span').css({
                    "display": "inline-block",
                    "background-color": "#3498db",
                    "color": "white",
                    "padding": "3px 3px",
                    "border-radius": "20px",
                    "font-size": "12px",
                    "font-weight": "bold",
                    "text-transform": "uppercase",
                    "letter-spacing": "1px",
                    "cursor": "pointer",
                    "transition": "background-color 0.3s ease"
                });
                this.$list_view.find('.list-span').css({
                    "display": "",
                    "background-color": "",
                    "color": "",
                    "padding": "3px 3px",
                    "border-radius": "",
                    "font-size": "",
                    "font-weight": "",
                    "text-transform": "",
                    "letter-spacing": "",
                    "cursor": "",
                    "transition": ""
                });
            } else {
                this.$list_view.find('.list-span').css({"display": "none"});
                this.$card_view.find('.card-span').css({"display": "none"});

            }
            if (!this.show_only_card_view && !this.show_only_list_view) {
                this.click_functions()
            }
        }
	}
	click_functions(){
		this.$list_view.on('click', 'a', () => {

			this.$list_view.find('.list-span').css({"display": "inline-block","background-color": "#3498db","color": "white","padding": "5px 10px", "border-radius": "20px", "font-size": "14px","font-weight": "bold", "text-transform": "uppercase","letter-spacing": "1px","cursor": "pointer", "transition": "background-color 0.3s ease"});
			this.$card_view.find('.card-span').css({"display": "","background-color": "","color": "","padding": "", "border-radius": "", "font-size": "","font-weight": "", "text-transform": "","letter-spacing": "","cursor": "", "transition": ""});
			view = "List"
			if(document.getElementById("card-view-section")) document.getElementById("card-view-section").remove()
			if(document.getElementById("list-view-section")) document.getElementById("list-view-section").remove()
			if(document.getElementById("customer-cart-container2")) document.getElementById("customer-cart-container2").remove()
			if(document.getElementById("item-details-container")) document.getElementById("item-details-container").remove()

			this.inti_component()
			this.events.init_item_details()
			this.events.init_item_cart()
			this.events.change_items(this.events.get_frm())


		});
		this.$card_view.on('click', 'a', () => {
			this.$card_view.find('.card-span').css({"display": "inline-block","background-color": "#3498db","color": "white","padding": "5px 10px", "border-radius": "20px", "font-size": "14px","font-weight": "bold", "text-transform": "uppercase","letter-spacing": "1px","cursor": "pointer", "transition": "background-color 0.3s ease"});
			this.$list_view.find('.list-span').css({"display": "","background-color": "","color": "","padding": "", "border-radius": "", "font-size": "","font-weight": "", "text-transform": "","letter-spacing": "","cursor": "", "transition": ""});
			view = "Card"
			if(document.getElementById("card-view-section")) document.getElementById("card-view-section").remove()
			if(document.getElementById("list-view-section")) document.getElementById("list-view-section").remove()
			if(document.getElementById("customer-cart-container2")) document.getElementById("customer-cart-container2").remove()
			if(document.getElementById("item-details-container")) document.getElementById("item-details-container").remove()

			this.inti_component()
			this.events.init_item_details()
			this.events.init_item_cart()
			this.events.change_items(this.events.get_frm())

		});
	}
	async load_items_data() {
		if (!this.item_group) {
			const res = await frappe.db.get_value("Item Group", {lft: 1, is_group: 1}, "name");
			this.parent_item_group = res.message.name;
		}
		if (!this.price_list) {
			const res = await frappe.db.get_value("POS Profile", this.pos_profile, "selling_price_list");
			this.price_list = res.message.selling_price_list;
		}

		this.get_items({}).then(({message}) => {
			this.render_item_list(message.items);
		});
	}

	get_items({start = 0, page_length = 40, search_term=''}) {
		const doc = this.events.get_frm().doc;
		const price_list = (doc && doc.selling_price_list) || this.price_list;
		let { item_group, pos_profile } = this;

		!item_group && (item_group = this.parent_item_group);

		return frappe.call({
			method: "posnext.posnext.page.posnext.point_of_sale.get_items",
			freeze: true,
			args: { start, page_length, price_list, item_group, search_term, pos_profile },
		});
	}


	render_item_list(items) {
		this.$items_container.html('');
		var me = this
		if(view === "List"){
			this.$items_container.append(
				`<div class="abs-cart-container" style="overflow-y:hidden">
					<div class="cart-header">
					${get_item_code_header()}
						<div style="flex: 1">${__('Rate')}</div>
						<div style="flex: 1">${__('Avail. Qty')}</div>
						<!--<div class="qty-header">${__('UOM')}</div>-->
					</div>
					<div class="cart-items-section" style="overflow-y:scroll;font-size: 12px"></div>
				</div>`)

			function get_item_code_header() {
				var flex_value = 3
				 if(!me.custom_show_item_code && !me.custom_show_last_incoming_rate && !me.custom_show_oem_part_number && !me.custom_show_logical_rack){
					flex_value = 2
				}
				var html_header = ``
				if(me.custom_show_item_code){
					// flex_value -= 1
					html_header += `<div style="flex: 1">${__('Item Code')}</div>`
				}
				if(me.custom_show_last_incoming_rate){
					// flex_value -= 1
					html_header += `<div style="flex: 1">${__('Inc.Rate')}</div>`
				}
				if(me.custom_show_oem_part_number){
					// flex_value -= 1
					html_header += `<div style="flex: 1">${__('OEM')} <br> ${__('Part No.')}</div>`
				}
				if(me.custom_show_logical_rack){
					// flex_value -= 1
					html_header += `<div style="flex: 1">${__('Rack')}</div>`
				}
				if(flex_value > 0){
					return `<div style="flex: ` + flex_value + `">${__('Item')}</div>` + html_header
				} else {
					return `<div>${__('Item')}</div>` + html_header
				}


            }
			this.make_cart_items_section();

			items.forEach(item => {
				this.render_cart_item(item);
			});
		} else {
			items.forEach(item => {
                var item_html = this.get_item_html(item);
                this.$items_container.append(item_html);
        	})
		}

		// this.$cart_container = this.$component.find('.cart-container');


	}
	make_cart_items_section() {
		this.$cart_header = this.$component.find('.cart-header');
		this.$cart_items_wrapper = this.$component.find('.cart-items-section');

	}
	get_cart_item({ name }) {
		const item_selector = `.cart-item-wrapper[data-row-name="${escape(name)}"]`;
		return this.$cart_items_wrapper.find(item_selector);
	}
	get_cart_item1({ item_code }) {
		const item_selector = `.cart-item-wrapper[data-row-name="${escape(item_code)}"]`;
		return this.$cart_items_wrapper.find(item_selector);
	}
	render_cart_item(item_data) {
		const me = this;
		const currency = me.events.get_frm().currency || me.currency;
		this.$cart_items_wrapper.append(
			`<div class="cart-item-wrapper item-wrapper" 
			data-item-code="${escape(item_data.item_code)}" 
			data-serial-no="${escape(item_data.serial_no)}"
			data-batch-no="${escape(item_data.batch_no)}" 
			data-uom="${escape(item_data.uom)}"
			data-rate="${escape(item_data.price_list_rate || 0)}"
			data-valuation-rate="${escape(item_data.valuation_rate || item_data.custom_valuation_rate)}"
			data-item-uoms="${item_data.custom_item_uoms}"
			data-item-logical-rack="${item_data.custom_logical_rack}"
			title="${item_data.item_name}"
			data-row-name="${escape(item_data.item_code)}"></div>
			<div class="seperator"></div>`
		)
		var $item_to_update = this.get_cart_item1(item_data);
		$item_to_update.html(
			`${get_item_image_html()}
			${get_item_name()}
			
				<div style="overflow-wrap: break-word;overflow:hidden;white-space: normal;font-weight: 700;margin-right: 10px">
					${item_data.item_name}
				</div>
				${get_description_html(item_data)}
			</div>
			${get_item_code()}
			${get_rate_discount_html()}`
		)

		function get_item_name() {
			var flex_value = 4
            if(me.custom_show_item_code && me.custom_show_last_incoming_rate && me.custom_show_oem_part_number){
				flex_value = 3
            }
            // if(me.custom_show_item_code && me.custom_show_last_incoming_rate && !me.custom_show_oem_part_number){
				// flex_value = 3
            // }
            if(!me.custom_show_item_code && !me.custom_show_last_incoming_rate && !me.custom_show_oem_part_number && !me.custom_show_logical_rack){
				flex_value = 2
            }
            // if(me.custom_show_last_incoming_rate && me.custom_show_item_code){
				// flex_value -= 1
            // }
            // if(me.custom_show_oem_part_number){
				// flex_value -= 1
            // }
			return `<div class="" style="flex: ` + flex_value +`;overflow-wrap: break-word;overflow:hidden;white-space: normal">`
        }
		set_dynamic_rate_header_width();

		function set_dynamic_rate_header_width() {
			const rate_cols = Array.from(me.$cart_items_wrapper.find(".item-rate-amount"));
			me.$cart_header.find(".rate-amount-header").css("width", "");
			me.$cart_items_wrapper.find(".item-rate-amount").css("width", "");
			var max_width = rate_cols.reduce((max_width, elm) => {
				if ($(elm).width() > max_width)
					max_width = $(elm).width();
				return max_width;
			}, 0);

			max_width += 1;
			if (max_width == 1) max_width = "";

			me.$cart_header.find(".rate-amount-header").css("width", max_width);
			me.$cart_items_wrapper.find(".item-rate-amount").css("width", max_width);
		}
		function get_item_code() {
			var html_code = ``
			if(me.custom_show_item_code){
				var item_code_flex_value =  1
				html_code += `<div class="item-code-desc" style="flex: ` + item_code_flex_value + `;text-align: left">
					<div class="item-code" >
						<b>${item_data.item_code}</b> <br>
						${item_data.uom}
					</div>
				</div>`
			}
			if(me.custom_show_last_incoming_rate){
				html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${parseFloat(item_data.valuation_rate).toFixed(2)}
					</div>
				</div>`
            }
            if(me.custom_show_oem_part_number){
				html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${item_data.custom_oem_part_number || ""}
					</div>
				</div>`
            }
            if(me.custom_show_logical_rack){
				html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${item_data.rack || ""}
					</div>
				</div>`
            }
            return html_code
        }
		function get_rate_discount_html() {
			if (item_data.rate && item_data.amount && item_data.rate !== item_data.amount) {
				return `
					<div class="item-qty-rate" style="flex: 3">
						<div class="item-rate-amount" style="flex: 1">
							<div class="item-rate" style="text-align: left">${format_currency(item_data.price_list_rate, currency)}</div>
						</div>
						<div class="item-qty" style="flex: 1;display:block;text-align: center"><span> ${item_data.actual_qty || 0}</span></div>
					
						
					</div>`
			} else {
				return `
					<div class="item-qty-rate" style="flex: 3">
						<div class="item-rate-amount" style="flex: 1">
							<div class="item-rate" style="text-align: left">${format_currency(item_data.price_list_rate, currency)}</div>
						</div>
						<div class="item-qty" style="flex: 1;display:block;text-align: center"><span> ${item_data.actual_qty || 0}</span></div>
						
						
					</div>`
			}
		}

		function get_description_html(item_data) {
			
			if (me.custom_show_item_discription) {
				if (item_data.description.indexOf('<div>') != -1) {
					try {
						item_data.description = $(item_data.description).text();
					} catch (error) {
						item_data.description = item_data.description.replace(/<div>/g, ' ').replace(/<\/div>/g, ' ').replace(/ +/g, ' ');
					}
				}
				item_data.description = frappe.ellipsis(item_data.description, 45);
				return `<div class="item-desc">${item_data.description}</div>`;
			}
			return ``;
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
	get_item_html(item) {
		const me = this;
		item.currency = item.currency  || me.currency
		// eslint-disable-next-line no-unused-vars
		const { item_image, serial_no, batch_no, barcode, actual_qty, uom, price_list_rate } = item;
		const precision = flt(price_list_rate, 2) % 1 != 0 ? 2 : 0;
		let indicator_color;
		let qty_to_display = actual_qty;

		if (item.is_stock_item) {
			indicator_color = (actual_qty > 10 ? "green" : actual_qty <= 0 ? "red" : "orange");

			if (Math.round(qty_to_display) > 999) {
				qty_to_display = Math.round(qty_to_display)/1000;
				qty_to_display = qty_to_display.toFixed(1) + 'K';
			}
		} else {
			indicator_color = '';
			qty_to_display = '';
		}

		function get_item_image_html() {
			if (!me.hide_images && item_image) {
				return `<div class="item-qty-pill">
							<span class="indicator-pill whitespace-nowrap ${indicator_color}">${qty_to_display}</span>
						</div>
						<div class="flex items-center justify-center h-32 border-b-grey text-6xl text-grey-100">
							<img
								onerror="cur_pos.item_selector.handle_broken_image(this)"
								class="h-full item-img" src="${item_image}"
								alt="${frappe.get_abbr(item.item_name)}"
							>
						</div>`;
			} else {
				return `<div class="item-qty-pill">
							<span class="indicator-pill whitespace-nowrap ${indicator_color}">${qty_to_display}</span>
						</div>
						<div class="item-display abbr">${frappe.get_abbr(item.item_name)}</div>`;
			}
		}

		return (
			`<div class="item-wrapper"
				data-item-code="${escape(item.item_code)}" data-serial-no="${escape(serial_no)}"
				data-batch-no="${escape(batch_no)}" data-uom="${escape(uom)}"
				data-rate="${escape(price_list_rate || 0)}"
				title="${item.item_name}">

				${get_item_image_html()}

				<div class="item-detail">
					<div class="item-name">
						${frappe.ellipsis(item.item_name, 18)}
					</div>
					<div class="item-rate">${format_currency(price_list_rate, item.currency, precision) || 0} / ${uom}</div>
				</div>
			</div>`
		);
	}

	handle_broken_image($img) {
		const item_abbr = $($img).attr('alt');
		$($img).parent().replaceWith(`<div class="item-display abbr">${item_abbr}</div>`);
	}
	update_total_incoming_rate(total_rate){
		if(this.total_incoming_rate){
			this.total_incoming_rate.set_value(total_rate)
		}
	}
	make_search_bar() {
		const me = this;
		const doc = me.events.get_frm().doc;
		this.$component.find('.search-field').html('');
		// this.$component.find('.item-code-search-field').html('');
		this.$component.find('.pos-profile').html('');
		this.$component.find('.total-incoming-rate').html('');
		this.$component.find('.item-group-field').html('');
		this.$component.find('.invoice-posting-date').html('');
		frappe.db.get_single_value("POS Settings","custom_profile_lock").then(doc => {
			this.pos_profile_field = frappe.ui.form.make_control({
				df: {
					label: __('POS Profile'),
					fieldtype: 'Link',
					options: 'POS Profile',
					placeholder: __('POS Profile'),
					read_only: doc,
					onchange: function () {

						if(me.reload_status && me.pos_profile !== this.value){
							frappe.pages['posnext'].refresh(window.wrapper,window.onScan,this.value)
						}

					}
				},
				parent: this.$component.find('.pos-profile'),
				render_input: false,
			});
		this.pos_profile_field.set_value(me.pos_profile)
		this.pos_profile_field.refresh()
		this.pos_profile_field.toggle_label(false);

		})

		this.search_field = frappe.ui.form.make_control({
			df: {
				label: __('Search'),
				fieldtype: 'Data',
				placeholder: __('Search by serial number or barcode')
			},
			parent: this.$component.find('.search-field'),
			render_input: true,
		});

		this.item_group_field = frappe.ui.form.make_control({
			df: {
				label: __('Item Group'),
				fieldtype: 'Link',
				options: 'Item Group',
				placeholder: __('Select item group'),
				onchange: function() {
					me.item_group = this.value;
					!me.item_group && (me.item_group = me.parent_item_group);
					me.filter_items();
				},
				get_query: function () {
					return {
						query: 'posnext.posnext.page.posnext.point_of_sale.item_group_query',
						filters: {
							pos_profile: doc ? doc.pos_profile : ''
						}
					};
				},
			},
			parent: this.$component.find('.item-group-field'),
			render_input: true,
		});
		if(this.custom_show_last_incoming_rate || this.custom_show_incoming_rate) {
            this.total_incoming_rate = frappe.ui.form.make_control({
                df: {
                    label: __(''),
                    fieldtype: 'Currency',
                    read_only: 1,
                    placeholder: __('Total Incoming Rate'),
                    default: 0
                },
                parent: this.$component.find('.total-incoming-rate'),
                render_input: true,
            });
        }
		if(me.custom_show_posting_date){
			this.invoice_posting_date = frappe.ui.form.make_control({
				df: {
					label: __('Posting Date'),
					fieldtype: 'Date',
					onchange: function() {
						me.events.get_frm().doc.posting_date= this.value;
						me.events.get_frm().doc.set_posting_time= 1;
					},

				},
				parent: this.$component.find('.invoice-posting-date'),
				render_input: true,
			});
		}


		this.search_field.toggle_label(false);
		this.item_group_field.toggle_label(false);
		if(this.custom_show_last_incoming_rate) {
            this.total_incoming_rate.toggle_label(false);
        }
		if(me.custom_show_posting_date) {
            this.invoice_posting_date.toggle_label(false);
            this.invoice_posting_date.set_value(frappe.datetime.get_today())

        }

		this.attach_clear_btn();
	}

	attach_clear_btn() {
		this.search_field.$wrapper.find('.control-input').append(
			`<span class="link-btn" style="top: 2px;">
				<a class="btn-open no-decoration" title="${__("Clear")}">
					${frappe.utils.icon('close', 'sm')}
				</a>
			</span>`
		);

		this.$clear_search_btn = this.search_field.$wrapper.find('.link-btn');

		this.$clear_search_btn.on('click', 'a', () => {
			this.set_search_value('');
			this.search_field.set_focus();
		});
	}

	set_search_value(value) {
		$(this.search_field.$input[0]).val(value).trigger("input");
	}

	bind_events() {
		const me = this;
		if(!window.onScan){
			frappe.require("https://cdn.jsdelivr.net/npm/onscan.js/onscan.min.js", function() {
			window.onScan = onScan;

			onScan.decodeKeyEvent = function (oEvent) {
				var iCode = this._getNormalizedKeyNum(oEvent);
				switch (true) {
					case iCode >= 48 && iCode <= 90: // numbers and letters
					case iCode >= 106 && iCode <= 111: // operations on numeric keypad (+, -, etc.)
					case (iCode >= 160 && iCode <= 164) || iCode == 170: // ^ ! # $ *
					case iCode >= 186 && iCode <= 194: // (; = , - . / `)
					case iCode >= 219 && iCode <= 222: // ([ \ ] ')
					case iCode == 32: // spacebar
						if (oEvent.key !== undefined && oEvent.key !== '') {
							return oEvent.key;
						}

						var sDecoded = String.fromCharCode(iCode);
						switch (oEvent.shiftKey) {
							case false: sDecoded = sDecoded.toLowerCase(); break;
							case true: sDecoded = sDecoded.toUpperCase(); break;
						}
						return sDecoded;
					case iCode >= 96 && iCode <= 105: // numbers on numeric keypad
						return 0 + (iCode - 96);
				}
				return '';
			};

			onScan.attachTo(document, {
				onScan: (sScancode) => {
					if (this.search_field && this.$component.is(':visible')) {
						this.search_field.set_focus();
						this.set_search_value(sScancode);
						this.barcode_scanned = true;
					}
				}
			});
		})
		}



		this.$component.on('click', '.item-wrapper', function() {
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			let batch_no = unescape($item.attr('data-batch-no'));
			let serial_no = unescape($item.attr('data-serial-no'));
			let uom = unescape($item.attr('data-uom'));
			let rate = unescape($item.attr('data-rate'));
			let valuation_rate = unescape($item.attr('data-valuation-rate'));
			let custom_item_uoms = $item.attr('data-item-uoms');
			let custom_logical_rack = $item.attr('data-item-logical-rack')
			// escape(undefined) returns "un	defined" then unescape returns "undefined"
			batch_no = batch_no === "undefined" ? undefined : batch_no;
			serial_no = serial_no === "undefined" ? undefined : serial_no;
			uom = uom === "undefined" ? undefined : uom;
			rate = rate === "undefined" ? undefined : rate;
			me.events.item_selected({
				field: 'qty',
				value: "+1",
				item: { item_code, batch_no, serial_no, uom, rate ,valuation_rate, custom_item_uoms, custom_logical_rack}
			});
			// me.search_field.set_focus();
		});

		this.search_field.$input.on('input', (e) => {
			clearTimeout(this.last_search);
			this.last_search = setTimeout(() => {
				const search_term = e.target.value;
				this.filter_items({ search_term });
			}, 300);

			// this.$clear_search_btn.toggle(
			// 	Boolean(this.search_field.$input.val())
			// );
		});

		// this.search_field.$input.on('focus', () => {
		// 	this.$clear_search_btn.toggle(
		// 		Boolean(this.search_field.$input.val())
		// 	);
		// });
	}

	attach_shortcuts() {
		const ctrl_label = frappe.utils.is_mac() ? '⌘' : 'Ctrl';
		this.search_field.parent.attr("title", `${ctrl_label}+I`);
		frappe.ui.keys.add_shortcut({
			shortcut: "ctrl+i",
			action: () => this.search_field.set_focus(),
			condition: () => this.$component.is(':visible'),
			description: __("Focus on search input"),
			ignore_inputs: true,
			page: cur_page.page.page
		});
		this.item_group_field.parent.attr("title", `${ctrl_label}+G`);
		frappe.ui.keys.add_shortcut({
			shortcut: "ctrl+g",
			action: () => this.item_group_field.set_focus(),
			condition: () => this.$component.is(':visible'),
			description: __("Focus on Item Group filter"),
			ignore_inputs: true,
			page: cur_page.page.page
		});

		// for selecting the last filtered item on search
		frappe.ui.keys.on("enter", () => {
			const selector_is_visible = this.$component.is(':visible');
			if (!selector_is_visible || this.search_field.get_value() === "") return;

			if (this.items.length == 1) {
				this.$items_container.find(".item-wrapper").click();
				frappe.utils.play_sound("submit");
				this.set_search_value('');
			} else if (this.items.length == 0 && this.barcode_scanned) {
				// only show alert of barcode is scanned and enter is pressed
				frappe.show_alert({
					message: __("No items found. Scan barcode again."),
					indicator: 'orange'
				});
				frappe.utils.play_sound("error");
				this.barcode_scanned = false;
				this.set_search_value('');
			}
		});
	}

	filter_items({ search_term='' }={}) {
		if (search_term) {
			search_term = search_term.toLowerCase();

			// memoize
			this.search_index = this.search_index || {};
			if (this.search_index[search_term]) {
				const items = this.search_index[search_term];
				this.items = items;
				this.render_item_list(items);
				if (this.auto_search_serial && this.items.length === 1) {
					this.add_filtered_item_to_cart();
				}
				return;
			}
		}

		this.get_items({ search_term })
			.then(({ message }) => {
				const { items, serial_no, batch_no, barcode } = message;
				if (search_term && !barcode) {
					this.search_index[search_term] = items;
				}
				this.items = items;
				this.render_item_list(items);
				if (this.auto_search_serial && this.items.length === 1) {
					this.add_filtered_item_to_cart();
				}
			});
	}

	add_filtered_item_to_cart() {
		this.$items_container.find(".item-wrapper").click();
		this.set_search_value('');
	}

	resize_selector(minimize) {
		minimize ?
			this.$component.find('.filter-section').css('grid-template-columns', 'repeat(1, minmax(0, 1fr))') :
			this.$component.find('.filter-section').css('grid-template-columns', 'repeat(12, minmax(0, 1fr))');

		minimize ?
			this.$component.find('.search-field').css('margin', 'var(--margin-sm) 0px') :
			this.$component.find('.search-field').css('margin', '0px var(--margin-sm)');

		minimize ?
			this.$component.css('grid-column', 'span 2 / span 2') :
			this.$component.css('grid-column', 'span 6 / span 6');

		minimize ?
			this.$items_container.css('grid-template-columns', 'repeat(1, minmax(0, 1fr))') :
			this.$items_container.css('grid-template-columns', 'repeat(4, minmax(0, 1fr))');
	}

	toggle_component(show) {
		this.set_search_value('');
		this.$component.css('display', show ? 'flex': 'none');
	}
};
