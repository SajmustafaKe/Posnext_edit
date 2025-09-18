(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // ../posnext/posnext/public/js/pos_controller.js
  frappe.provide("posnext.PointOfSale");
  var selected_item = null;
  posnext.PointOfSale.Controller = class {
    constructor(wrapper) {
      try {
        console.log("Initializing POS Controller with enhanced error handling");
        if (!wrapper) {
          console.error("Wrapper parameter is required for POS Controller");
          frappe.msgprint(__("Failed to initialize POS: Invalid wrapper"));
          return;
        }
        this.wrapper = $(wrapper).find(".layout-main-section");
        if (!this.wrapper.length) {
          console.error("Layout main section not found in wrapper");
          frappe.msgprint(__("Failed to initialize POS: Layout section not found"));
          return;
        }
        this.page = wrapper.page;
        frappe.run_serially([
          () => {
            try {
              this.reload_status = false;
              return Promise.resolve();
            } catch (error) {
              console.error("Error setting reload status:", error);
              return Promise.reject(error);
            }
          },
          () => {
            try {
              return this.check_opening_entry("");
            } catch (error) {
              console.error("Error checking opening entry:", error);
              frappe.show_alert({
                message: __("Error checking opening entry"),
                indicator: "red"
              });
              return Promise.resolve();
            }
          },
          () => {
            try {
              this.reload_status = true;
              return Promise.resolve();
            } catch (error) {
              console.error("Error finalizing initialization:", error);
              return Promise.resolve();
            }
          }
        ]).catch((error) => {
          console.error("Critical error during POS initialization:", error);
          frappe.msgprint({
            title: __("POS Initialization Error"),
            message: __("Failed to initialize POS system. Please refresh the page."),
            indicator: "red"
          });
        });
        this.setup_form_events();
        console.log("POS Controller initialized successfully");
      } catch (error) {
        console.error("Critical error in POS Controller constructor:", error);
        frappe.msgprint({
          title: __("POS System Error"),
          message: __("Failed to start POS system. Please contact system administrator."),
          indicator: "red"
        });
      }
    }
    setup_form_events() {
      try {
        console.log("Setting up form events with error handling");
        frappe.ui.form.on("Sales Invoice", {
          after_save: function(frm) {
            try {
              if (!frm.doc.pos_profile)
                return;
              frappe.db.get_doc("POS Profile", frm.doc.pos_profile).then((pos_profile) => {
                try {
                  if (pos_profile.custom_stock_update) {
                    frm.set_value("update_stock", 0);
                  }
                } catch (error) {
                  console.error("Error processing POS profile settings:", error);
                }
              }).catch((error) => {
                console.error("Error fetching POS profile:", error);
              });
            } catch (error) {
              console.error("Error in Sales Invoice after_save event:", error);
            }
          }
        });
        console.log("Form events setup completed");
      } catch (error) {
        console.error("Error setting up form events:", error);
        frappe.show_alert({
          message: __("Error setting up form events"),
          indicator: "orange"
        });
      }
    }
    fetch_opening_entry(value) {
      return frappe.call("posnext.posnext.page.posnext.point_of_sale.check_opening_entry", { "user": frappe.session.user, "value": value });
    }
    check_opening_entry(value = "") {
      if (frappe.user_roles.includes("Sales Person")) {
        this.find_available_opening_entry();
      } else {
        this.fetch_opening_entry(value).then((r) => {
          if (r.message.length) {
            this.prepare_app_defaults(r.message[0]);
          } else {
            this.create_opening_voucher();
          }
        });
      }
    }
    find_available_opening_entry() {
      const me = this;
      frappe.call({
        method: "posnext.posnext.page.posnext.point_of_sale.get_available_opening_entry",
        callback: (r) => {
          if (r.message && r.message.length > 0) {
            me.prepare_app_defaults(r.message[0]);
            frappe.show_alert({
              message: __("Using existing POS Opening Entry: {0}", [r.message[0].name]),
              indicator: "blue"
            });
          } else {
            frappe.msgprint({
              title: __("No POS Opening Entry Available"),
              message: __("No POS Opening Entry is currently available. Please contact your manager to create one."),
              indicator: "red"
            });
          }
        }
      });
    }
    create_opening_voucher() {
      const me = this;
      const table_fields = [
        {
          fieldname: "mode_of_payment",
          fieldtype: "Link",
          in_list_view: 1,
          label: "Mode of Payment",
          options: "Mode of Payment",
          reqd: 1
        },
        {
          fieldname: "opening_amount",
          fieldtype: "Currency",
          in_list_view: 1,
          label: "Opening Amount",
          options: "company:company_currency",
          change: function() {
            dialog.fields_dict.balance_details.df.data.some((d) => {
              if (d.idx == this.doc.idx) {
                d.opening_amount = this.value;
                dialog.fields_dict.balance_details.grid.refresh();
                return true;
              }
            });
          }
        }
      ];
      const fetch_pos_payment_methods = () => {
        const pos_profile = dialog.fields_dict.pos_profile.get_value();
        if (!pos_profile)
          return;
        frappe.db.get_doc("POS Profile", pos_profile).then(({ payments }) => {
          dialog.fields_dict.balance_details.df.data = [];
          payments.forEach((pay) => {
            const { mode_of_payment } = pay;
            dialog.fields_dict.balance_details.df.data.push({ mode_of_payment, opening_amount: "0" });
          });
          dialog.fields_dict.balance_details.grid.refresh();
        });
      };
      const dialog = new frappe.ui.Dialog({
        title: __("Create POS Opening Entry"),
        static: true,
        fields: [
          {
            fieldtype: "Link",
            label: __("Company"),
            default: frappe.defaults.get_default("company"),
            options: "Company",
            fieldname: "company",
            reqd: 1
          },
          {
            fieldtype: "Link",
            label: __("POS Profile"),
            options: "POS Profile",
            fieldname: "pos_profile",
            reqd: 1,
            get_query: () => pos_profile_query(),
            onchange: () => fetch_pos_payment_methods()
          },
          {
            fieldname: "balance_details",
            fieldtype: "Table",
            label: "Opening Balance Details",
            cannot_add_rows: false,
            in_place_edit: true,
            reqd: 1,
            data: [],
            fields: table_fields
          }
        ],
        primary_action: async function({ company, pos_profile, balance_details }) {
          if (!balance_details.length) {
            frappe.show_alert({
              message: __("Please add Mode of payments and opening balance details."),
              indicator: "red"
            });
            return frappe.utils.play_sound("error");
          }
          balance_details = balance_details.filter((d) => d.mode_of_payment);
          const method = "posnext.posnext.page.posnext.point_of_sale.create_opening_voucher";
          const res = await frappe.call({ method, args: { pos_profile, company, balance_details }, freeze: true });
          !res.exc && me.prepare_app_defaults(res.message);
          dialog.hide();
        },
        primary_action_label: __("Submit")
      });
      dialog.show();
      const pos_profile_query = () => {
        return {
          query: "erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query",
          filters: { company: dialog.fields_dict.company.get_value() }
        };
      };
    }
    async prepare_app_defaults(data) {
      try {
        console.log("Preparing app defaults with enhanced error handling");
        if (!data || !data.name) {
          console.error("Invalid data provided to prepare_app_defaults");
          frappe.msgprint(__("Invalid initialization data. Please refresh the page."));
          return;
        }
        this.pos_opening = data.name;
        this.company = data.company;
        this.pos_profile = data.pos_profile;
        this.pos_opening_time = data.period_start_date;
        this.item_stock_map = {};
        this.settings = {};
        window.current_pos_profile = this.pos_profile;
        try {
          const stockSettings = await frappe.db.get_value("Stock Settings", void 0, "allow_negative_stock");
          this.allow_negative_stock = flt(stockSettings.message.allow_negative_stock) || false;
        } catch (error) {
          console.error("Error fetching stock settings:", error);
          this.allow_negative_stock = false;
        }
        frappe.call({
          method: "posnext.posnext.page.posnext.point_of_sale.get_pos_profile_data",
          args: { "pos_profile": this.pos_profile },
          callback: (res) => {
            try {
              if (!res.message) {
                console.error("No POS profile data received");
                frappe.msgprint(__("Failed to load POS profile data. Please refresh the page."));
                return;
              }
              const profile = res.message;
              Object.assign(this.settings, profile);
              if (profile.customer_groups && Array.isArray(profile.customer_groups)) {
                this.settings.customer_groups = profile.customer_groups.map((group) => group.name);
              } else {
                this.settings.customer_groups = [];
                console.warn("No customer groups found in POS profile");
              }
              this.make_app();
            } catch (error) {
              console.error("Error processing POS profile data:", error);
              frappe.msgprint({
                title: __("POS Profile Error"),
                message: __("Error processing POS profile. Please refresh the page."),
                indicator: "red"
              });
            }
          },
          error: (error) => {
            console.error("Error fetching POS profile data:", error);
            frappe.msgprint({
              title: __("Network Error"),
              message: __("Failed to fetch POS profile data. Please check your connection and refresh."),
              indicator: "red"
            });
          }
        });
      } catch (error) {
        console.error("Critical error in prepare_app_defaults:", error);
        frappe.msgprint({
          title: __("Initialization Error"),
          message: __("Failed to prepare POS defaults. Please refresh the page."),
          indicator: "red"
        });
      }
    }
    set_opening_entry_status() {
      this.page.set_title_sub(
        `<span class="indicator orange">
				<a class="text-muted" href="#Form/POS%20Opening%20Entry/${this.pos_opening}">
					Opened at ${moment(this.pos_opening_time).format("Do MMMM, h:mma")}
				</a>
			</span>`
      );
    }
    make_app() {
      try {
        console.log("Making POS app with enhanced error handling");
        if (!this.settings) {
          console.error("Settings not available for app creation");
          frappe.msgprint(__("POS settings not loaded. Please refresh the page."));
          return;
        }
        try {
          this.prepare_dom();
          console.log("DOM preparation completed");
        } catch (error) {
          console.error("Error preparing DOM:", error);
          frappe.show_alert({
            message: __("Error preparing interface"),
            indicator: "red"
          });
          return;
        }
        try {
          this.prepare_components();
          console.log("Components preparation completed");
        } catch (error) {
          console.error("Error preparing components:", error);
          frappe.show_alert({
            message: __("Error initializing POS components"),
            indicator: "red"
          });
        }
        try {
          this.prepare_menu();
          console.log("Menu preparation completed");
        } catch (error) {
          console.error("Error preparing menu:", error);
          frappe.show_alert({
            message: __("Error setting up menu"),
            indicator: "orange"
          });
        }
        try {
          this.make_new_invoice();
          console.log("New invoice creation completed");
        } catch (error) {
          console.error("Error making new invoice:", error);
          frappe.show_alert({
            message: __("Error creating initial invoice"),
            indicator: "red"
          });
        }
        console.log("POS app creation completed successfully");
      } catch (error) {
        console.error("Critical error during app creation:", error);
        frappe.msgprint({
          title: __("App Creation Error"),
          message: __("Failed to create POS application. Please refresh the page."),
          indicator: "red"
        });
      }
    }
    prepare_dom() {
      this.wrapper.append(
        `<div class="point-of-sale-app"></div>`
      );
      this.$components_wrapper = this.wrapper.find(".point-of-sale-app");
    }
    prepare_components() {
      try {
        console.log("Preparing POS components with error handling");
        try {
          this.init_item_selector();
          console.log("Item selector initialized successfully");
        } catch (error) {
          console.error("Error initializing item selector:", error);
          frappe.show_alert({
            message: __("Error initializing item selector"),
            indicator: "orange"
          });
        }
        try {
          this.init_item_details();
          console.log("Item details initialized successfully");
        } catch (error) {
          console.error("Error initializing item details:", error);
          frappe.show_alert({
            message: __("Error initializing item details"),
            indicator: "orange"
          });
        }
        try {
          this.init_item_cart();
          console.log("Item cart initialized successfully");
        } catch (error) {
          console.error("Error initializing item cart:", error);
          frappe.show_alert({
            message: __("Error initializing shopping cart. Some features may not work properly."),
            indicator: "red"
          });
        }
        try {
          this.init_payments();
          console.log("Payments initialized successfully");
        } catch (error) {
          console.error("Error initializing payments:", error);
          frappe.show_alert({
            message: __("Error initializing payment system"),
            indicator: "orange"
          });
        }
        try {
          this.init_recent_order_list();
          console.log("Recent order list initialized successfully");
        } catch (error) {
          console.error("Error initializing recent order list:", error);
          frappe.show_alert({
            message: __("Error initializing recent orders"),
            indicator: "orange"
          });
        }
        try {
          this.init_order_summary();
          console.log("Order summary initialized successfully");
        } catch (error) {
          console.error("Error initializing order summary:", error);
          frappe.show_alert({
            message: __("Error initializing order summary"),
            indicator: "orange"
          });
        }
        console.log("POS components preparation completed");
      } catch (error) {
        console.error("Critical error during component preparation:", error);
        frappe.msgprint({
          title: __("Component Initialization Error"),
          message: __("Some POS components failed to initialize. Please refresh the page."),
          indicator: "red"
        });
      }
    }
    prepare_menu() {
      this.page.clear_menu();
      if (this.settings.custom_show_open_form_view) {
        this.page.add_menu_item(__("Open Form View"), this.open_form_view.bind(this), false, "Ctrl+F");
      }
      if (this.settings.custom_show_toggle_recent_orders) {
        this.page.add_menu_item(__("Toggle Recent Orders"), this.toggle_recent_order.bind(this), false, "Ctrl+O");
      }
      if (this.settings.custom_show_save_as_draft) {
        this.page.add_menu_item(__("Save as Draft"), this.save_draft_invoice.bind(this), false, "Ctrl+S");
      }
      if (this.settings.custom_show_close_the_pos) {
        this.page.add_menu_item(__("Close the POS"), this.close_pos.bind(this), false, "Shift+Ctrl+C");
      }
    }
    open_form_view() {
      frappe.model.sync(this.frm.doc);
      frappe.set_route("Form", this.frm.doc.doctype, this.frm.doc.name);
    }
    toggle_recent_order() {
      const show = this.recent_order_list.$component.is(":hidden");
      this.toggle_recent_order_list(show);
    }
    save_draft_invoice() {
      if (!this.$components_wrapper.is(":visible"))
        return;
      console.log(this.frm.doc.items);
      if (this.frm.doc.items.length == 0) {
        frappe.show_alert({
          message: __("You must add atleast one item to save it as draft."),
          indicator: "red"
        });
        frappe.utils.play_sound("error");
        return;
      }
      this.frm.save(void 0, void 0, void 0, () => {
        frappe.show_alert({
          message: __("There was an error saving the document."),
          indicator: "red"
        });
        frappe.utils.play_sound("error");
      }).then(() => {
        frappe.run_serially([
          () => frappe.dom.freeze(),
          () => this.make_new_invoice(false),
          () => frappe.dom.unfreeze()
        ]);
      });
    }
    close_pos() {
      if (!this.$components_wrapper.is(":visible"))
        return;
      let voucher = frappe.model.get_new_doc("POS Closing Entry");
      voucher.pos_profile = this.frm.doc.pos_profile;
      voucher.user = frappe.session.user;
      voucher.company = this.frm.doc.company;
      voucher.pos_opening_entry = this.pos_opening;
      voucher.period_end_date = frappe.datetime.now_datetime();
      voucher.posting_date = frappe.datetime.now_date();
      voucher.posting_time = frappe.datetime.now_time();
      frappe.set_route("Form", "POS Closing Entry", voucher.name);
    }
    init_item_selector() {
      if (this.frm) {
        this.frm.doc.set_warehouse = this.settings.warehouse;
      }
      this.item_selector = new posnext.PointOfSale.ItemSelector({
        wrapper: this.$components_wrapper,
        pos_profile: this.pos_profile,
        settings: this.settings,
        reload_status: this.reload_status,
        currency: this.settings.currency,
        events: {
          check_opening_entry: () => this.check_opening_entry(),
          item_selected: (args) => this.on_cart_update(args),
          init_item_cart: () => this.init_item_cart(),
          init_item_details: () => this.init_item_details(),
          change_items: (args) => this.change_items(args),
          get_frm: () => this.frm || {}
        }
      });
    }
    change_items(items) {
      var me = this;
      this.frm = items;
      this.cart.load_invoice();
    }
    init_item_cart() {
      try {
        console.log("Initializing item cart with enhanced error handling");
        if (!this.$components_wrapper || !this.$components_wrapper.length) {
          console.error("Components wrapper not found for cart initialization");
          frappe.msgprint(__("Failed to initialize cart: Components wrapper not available"));
          return;
        }
        if (!this.settings) {
          console.error("Settings not available for cart initialization");
          frappe.msgprint(__("Failed to initialize cart: Settings not loaded"));
          return;
        }
        this.cart = new posnext.PointOfSale.ItemCart({
          wrapper: this.$components_wrapper,
          settings: this.settings,
          events: {
            get_frm: () => {
              try {
                return this.frm;
              } catch (error) {
                console.error("Error getting form reference:", error);
                return null;
              }
            },
            remove_item_from_cart: (item) => {
              try {
                this.item_details.current_item = item;
                this.item_details.name = item.name;
                this.item_details.doctype = item.doctype;
              } catch (error) {
                console.error("Error removing item from cart:", error);
                frappe.show_alert({
                  message: __("Error removing item from cart"),
                  indicator: "red"
                });
              }
            },
            form_updated: (item, field, value) => {
              try {
                this.item_details.current_item = item;
                const item_row = frappe.model.get_doc(item.doctype, item.name);
                if (field === "qty" && this.frm.doc.is_return && value >= 0) {
                  frappe.throw("Qty must be negative for return document");
                }
                if (item_row && item_row[field] != value) {
                  const args = {
                    field,
                    value,
                    item: this.item_details.current_item
                  };
                  return this.on_cart_update(args);
                }
                return Promise.resolve();
              } catch (error) {
                console.error("Error updating form:", error);
                frappe.show_alert({
                  message: __("Error updating item: {0}", [error.message]),
                  indicator: "red"
                });
                return Promise.reject(error);
              }
            },
            cart_item_clicked: (item) => {
              try {
                const item_row = this.get_item_from_frm(item);
                if (selected_item && selected_item["name"] == item["name"]) {
                  selected_item = null;
                } else {
                  selected_item = item_row;
                }
                if (this.item_details && this.item_details.toggle_item_details_section) {
                  this.item_details.toggle_item_details_section(item_row);
                }
              } catch (error) {
                console.error("Error handling cart item click:", error);
                frappe.show_alert({
                  message: __("Error selecting item"),
                  indicator: "red"
                });
              }
            },
            numpad_event: (value, action) => {
              try {
                return this.update_item_field(value, action);
              } catch (error) {
                console.error("Error handling numpad event:", error);
                frappe.show_alert({
                  message: __("Error processing numpad input"),
                  indicator: "red"
                });
              }
            },
            checkout: () => {
              try {
                return this.save_and_checkout();
              } catch (error) {
                console.error("Error during checkout:", error);
                frappe.show_alert({
                  message: __("Error during checkout: {0}", [error.message]),
                  indicator: "red"
                });
              }
            },
            edit_cart: () => {
              try {
                if (this.payment && this.payment.edit_cart) {
                  return this.payment.edit_cart();
                }
              } catch (error) {
                console.error("Error editing cart:", error);
                frappe.show_alert({
                  message: __("Error editing cart"),
                  indicator: "red"
                });
              }
            },
            save_draft_invoice: () => {
              try {
                return this.save_draft_invoice();
              } catch (error) {
                console.error("Error saving draft invoice:", error);
                frappe.show_alert({
                  message: __("Error saving draft invoice"),
                  indicator: "red"
                });
              }
            },
            toggle_recent_order: () => {
              try {
                return this.toggle_recent_order();
              } catch (error) {
                console.error("Error toggling recent order:", error);
                frappe.show_alert({
                  message: __("Error accessing recent orders"),
                  indicator: "red"
                });
              }
            },
            customer_details_updated: (details) => {
              try {
                this.customer_details = details;
                if (this.payment && this.payment.render_loyalty_points_payment_mode) {
                  this.payment.render_loyalty_points_payment_mode();
                }
              } catch (error) {
                console.error("Error updating customer details:", error);
                frappe.show_alert({
                  message: __("Error updating customer details"),
                  indicator: "red"
                });
              }
            }
          }
        });
        if (!this.cart) {
          console.error("Failed to create cart instance");
          frappe.msgprint(__("Failed to initialize cart. Please refresh the page."));
          return;
        }
        console.log("Item cart initialized successfully");
      } catch (error) {
        console.error("Critical error initializing item cart:", error);
        frappe.msgprint({
          title: __("Cart Initialization Error"),
          message: __("Failed to initialize the shopping cart. Please refresh the page and try again."),
          indicator: "red"
        });
      }
    }
    init_item_details() {
      this.item_details = new posnext.PointOfSale.ItemDetails({
        wrapper: this.$components_wrapper,
        settings: this.settings,
        events: {
          get_frm: () => this.frm,
          toggle_item_selector: (minimize) => {
            this.item_selector.resize_selector(minimize);
            this.cart.toggle_numpad(minimize);
          },
          form_updated: (item, field, value) => {
            const item_row = frappe.model.get_doc(item.doctype, item.name);
            if (field === "qty" && this.frm.doc.is_return && value >= 0) {
              frappe.throw("Qty must be negative for return document");
            }
            if (item_row && item_row[field] != value) {
              const args = {
                field,
                value,
                item: this.item_details.current_item
              };
              return this.on_cart_update(args);
            }
            return Promise.resolve();
          },
          highlight_cart_item: (item) => {
            const cart_item = this.cart.get_cart_item(item);
            this.cart.toggle_item_highlight(cart_item);
          },
          item_field_focused: (fieldname) => {
            this.cart.toggle_numpad_field_edit(fieldname);
          },
          set_value_in_current_cart_item: (selector, value) => {
            this.cart.update_selector_value_in_cart_item(selector, value, this.item_details.current_item);
          },
          clone_new_batch_item_in_frm: (batch_serial_map, item) => {
            Object.keys(batch_serial_map).forEach((batch) => {
              const item_to_clone = this.frm.doc.items.find((i) => i.name == item.name);
              const new_row = this.frm.add_child("items", __spreadValues({}, item_to_clone));
              new_row.batch_no = batch;
              new_row.serial_no = batch_serial_map[batch].join(`
`);
              new_row.qty = batch_serial_map[batch].length;
              this.frm.doc.items.forEach((row) => {
                if (item.item_code === row.item_code) {
                  this.update_cart_html(row);
                }
              });
            });
          },
          remove_item_from_cart: () => this.remove_item_from_cart(),
          get_item_stock_map: () => this.item_stock_map,
          close_item_details: () => {
            selected_item = null;
            this.item_details.toggle_item_details_section(null);
            this.cart.prev_action = null;
            this.cart.toggle_item_highlight();
          },
          get_available_stock: (item_code, warehouse) => this.get_available_stock(item_code, warehouse)
        }
      });
      if (selected_item) {
        this.item_details.toggle_item_details_section(selected_item);
      }
    }
    init_payments() {
      this.payment = new posnext.PointOfSale.Payment({
        wrapper: this.$components_wrapper,
        settings: this.settings,
        events: {
          get_frm: () => this.frm || {},
          get_customer_details: () => this.customer_details || {},
          toggle_other_sections: (show) => {
            if (show) {
              this.item_details.$component.is(":visible") ? this.item_details.$component.css("display", "none") : "";
              this.item_selector.toggle_component(false);
            } else {
              this.item_selector.toggle_component(true);
            }
          },
          submit_invoice: () => this.submit_invoice()
        }
      });
    }
    init_recent_order_list() {
      this.recent_order_list = new posnext.PointOfSale.PastOrderList({
        wrapper: this.$components_wrapper,
        events: {
          open_invoice_data: (name) => {
            frappe.db.get_doc("Sales Invoice", name).then((doc) => {
              this.order_summary.load_summary_of(doc);
            });
          },
          reset_summary: () => this.order_summary.toggle_summary_placeholder(true),
          previous_screen: () => {
            this.recent_order_list.toggle_component(false);
            this.cart.load_invoice();
            this.item_selector.toggle_component(true);
            this.wrapper.find(".past-order-summary").css("display", "none");
          }
        },
        settings: this.settings
      });
    }
    init_order_summary() {
      this.order_summary = new posnext.PointOfSale.PastOrderSummary({
        wrapper: this.$components_wrapper,
        pos_profile: this.settings,
        events: {
          get_frm: () => this.frm,
          process_return: (name) => {
            this.recent_order_list.toggle_component(false);
            frappe.db.get_doc("Sales Invoice", name).then((doc) => {
              frappe.run_serially([
                () => this.make_return_invoice(doc),
                () => this.cart.load_invoice(),
                () => this.item_selector.toggle_component(true)
              ]);
            });
          },
          edit_order: (name) => {
            console.log("Edit Order...");
            this.recent_order_list.toggle_component(false);
            frappe.run_serially([
              () => this.frm.refresh(name),
              () => this.frm.call("reset_mode_of_payments"),
              () => this.cart.load_invoice(),
              () => this.item_selector.toggle_component(true)
            ]);
          },
          delete_order: (name) => {
            frappe.model.delete_doc(this.frm.doc.doctype, name, () => {
              this.recent_order_list.refresh_list();
            });
          },
          new_order: () => {
            frappe.run_serially([
              () => frappe.dom.freeze(),
              () => this.make_new_invoice(),
              () => this.item_selector.toggle_component(true),
              () => frappe.dom.unfreeze()
            ]);
          }
        }
      });
    }
    toggle_recent_order_list(show) {
      this.toggle_components(!show);
      this.recent_order_list.toggle_component(show);
      this.order_summary.toggle_component(show);
    }
    toggle_components(show) {
      this.cart.toggle_component(show);
      this.item_selector.toggle_component(show);
      !show ? this.item_details.toggle_component(false) || this.payment.toggle_component(false) : "";
    }
    make_new_invoice(from_held = false) {
      if (from_held) {
        return frappe.run_serially([
          () => frappe.dom.freeze(),
          () => this.make_sales_invoice_frm(),
          () => this.set_pos_profile_data(),
          () => this.set_pos_profile_status(),
          () => this.cart.load_invoice(),
          () => frappe.dom.unfreeze(),
          () => this.toggle_recent_order()
        ]);
      } else {
        return frappe.run_serially([
          () => frappe.dom.freeze(),
          () => this.make_sales_invoice_frm(),
          () => this.set_pos_profile_data(),
          () => this.set_pos_profile_status(),
          () => this.cart.load_invoice(),
          () => frappe.dom.unfreeze()
        ]);
      }
    }
    make_sales_invoice_frm() {
      const doctype = "Sales Invoice";
      return new Promise((resolve) => {
        if (this.frm) {
          this.frm = this.get_new_frm(this.frm);
          this.frm.doc.items = [];
          this.frm.doc.is_pos = 1;
          this.frm.doc.set_warehouse = this.settings.warehouse;
          resolve();
        } else {
          frappe.model.with_doctype(doctype, () => {
            this.frm = this.get_new_frm();
            this.frm.doc.items = [];
            this.frm.doc.is_pos = 1;
            this.frm.doc.set_warehouse = this.settings.warehouse;
            resolve();
          });
        }
      });
    }
    get_new_frm(_frm) {
      const doctype = "Sales Invoice";
      const page = $("<div>");
      const frm = _frm || new frappe.ui.form.Form(doctype, page, false);
      const name = frappe.model.make_new_doc_and_get_name(doctype, true);
      frm.refresh(name);
      return frm;
    }
    async make_return_invoice(doc) {
      frappe.dom.freeze();
      this.frm = this.get_new_frm(this.frm);
      this.frm.doc.items = [];
      return frappe.call({
        method: "posnext.posnext.page.posnext.point_of_sale.make_sales_return",
        args: {
          "source_name": doc.name,
          "target_doc": this.frm.doc
        },
        callback: (r) => {
          frappe.model.sync(r.message);
          frappe.get_doc(r.message.doctype, r.message.name).__run_link_triggers = false;
          this.set_pos_profile_data().then(() => {
            frappe.dom.unfreeze();
          });
        }
      });
    }
    set_pos_profile_data() {
      if (this.company && !this.frm.doc.company)
        this.frm.doc.company = this.company;
      if ((this.pos_profile && !this.frm.doc.pos_profile) | (this.frm.doc.is_return && this.pos_profile != this.frm.doc.pos_profile)) {
        this.frm.doc.pos_profile = this.pos_profile;
      }
      if (!this.frm.doc.company)
        return;
      return this.frm.trigger("set_pos_data");
    }
    set_pos_profile_status() {
      this.page.set_indicator(this.pos_profile, "blue");
    }
    async on_cart_update(args) {
      console.log("Updating Cart with args:", args);
      let item_row = void 0;
      try {
        let { field, value, item } = args;
        console.log("Cart update - Field:", field, "Value:", value, "Item:", item);
        item_row = this.get_item_from_frm(item);
        console.log("Item row from form:", item_row);
        const item_row_exists = !$.isEmptyObject(item_row);
        console.log("Item row exists:", item_row_exists);
        const from_selector = field === "qty" && value === "+1";
        if (from_selector)
          value = flt(item_row.stock_qty) + 1;
        if (item_row_exists) {
          console.log("Updating existing item in cart");
          if (field === "qty")
            value = flt(value);
          if (["qty", "conversion_factor"].includes(field) && value > 0 && !this.allow_negative_stock) {
            const qty_needed = field === "qty" ? value * item_row.conversion_factor : item_row.qty * value;
          }
          if (this.is_current_item_being_edited(item_row) || from_selector) {
            await frappe.model.set_value(item_row.doctype, item_row.name, field, value);
            this.update_cart_html(item_row);
          }
        } else {
          console.log("Adding new item to cart");
          if (!this.frm.doc.customer && !this.settings.custom_mobile_number_based_customer) {
            console.log("No customer selected - showing alert");
            return this.raise_customer_selection_alert();
          }
          frappe.flags.ignore_company_party_validation = true;
          let { item_code, batch_no, serial_no, rate, uom, valuation_rate, custom_item_uoms, custom_logical_rack } = item;
          if (!rate || flt(rate) === 0) {
            const res = await frappe.call({
              method: "erpnext.stock.get_item_details.get_item_price",
              args: { item_code, price_list: this.settings.selling_price_list }
            });
            rate = flt(res.message.price_list_rate) || 0;
          }
          uom = uom || item.stock_uom || "Nos";
          let qty = field === "qty" && value ? flt(value) : 1;
          if (field === "serial_no")
            qty = value.split(`
`).length || 0;
          if (serial_no) {
            await this.check_serial_no_availablilty(item_code, this.frm.doc.set_warehouse, serial_no);
          }
          const new_item = {
            item_code,
            batch_no,
            serial_no,
            rate,
            uom,
            qty,
            amount: flt(rate) * flt(qty),
            custom_item_uoms,
            custom_logical_rack
          };
          item_row = this.frm.add_child("items", new_item);
          await this.trigger_new_item_events(item_row);
          this.frm.refresh_field("items");
          this.update_cart_html(item_row);
          if (this.item_details.$component.is(":visible"))
            this.edit_item_details_of(item_row);
          if (this.check_serial_batch_selection_needed(item_row) && !this.item_details.$component.is(":visible"))
            this.edit_item_details_of(item_row);
        }
      } catch (error) {
        console.log(error);
      } finally {
        let total_incoming_rate = 0;
        this.frm.doc.items.forEach((item) => {
          total_incoming_rate += flt(item.valuation_rate) * flt(item.qty);
        });
        this.item_selector.update_total_incoming_rate(total_incoming_rate);
        return item_row;
      }
    }
    raise_customer_selection_alert() {
      frappe.dom.unfreeze();
      frappe.show_alert({
        message: __("You must select a customer before adding an item."),
        indicator: "orange"
      });
      frappe.utils.play_sound("error");
    }
    async get_product_bundle(item_code) {
      const response = await frappe.call({
        method: "posnext.doc_events.item.get_product_bundle_with_items",
        args: {
          item_code
        }
      });
      return response.message;
    }
    get_item_from_frm({ name, item_code, batch_no, uom, rate }) {
      let item_row = null;
      if (name) {
        item_row = this.frm.doc.items.find((i2) => i2.name == name);
      } else {
        for (var i = 0; i < cur_frm.doc.items.length; i += 1) {
          const has_batch_no = batch_no !== "null" && batch_no !== null;
          const batch_no_check = this.settings.custom_allow_add_new_items_on_new_line ? has_batch_no && cur_frm.doc.items[i].batch_no === batch_no : true;
          if (cur_frm.doc.items[i].item_code === item_code && cur_frm.doc.items[i].uom === uom && parseFloat(cur_frm.doc.items[i].rate) === parseFloat(rate) && batch_no_check) {
            item_row = cur_frm.doc.items[i];
            break;
          }
        }
        console.log(item_row);
      }
      return item_row || {};
    }
    edit_item_details_of(item_row) {
      this.item_details.toggle_item_details_section(item_row);
    }
    is_current_item_being_edited(item_row) {
      return item_row.name == this.item_details.current_item.name;
    }
    update_cart_html(item_row, remove_item) {
      this.cart.update_item_html(item_row, remove_item);
      this.cart.update_totals_section(this.frm);
    }
    check_serial_batch_selection_needed(item_row) {
      const serialized = item_row.has_serial_no;
      const batched = item_row.has_batch_no;
      const no_serial_selected = !item_row.serial_no;
      const no_batch_selected = !item_row.batch_no;
      if (serialized && no_serial_selected || batched && no_batch_selected || serialized && batched && (no_batch_selected || no_serial_selected)) {
        return true;
      }
      return false;
    }
    async trigger_new_item_events(item_row) {
      await this.frm.script_manager.trigger("item_code", item_row.doctype, item_row.name);
      await this.frm.script_manager.trigger("qty", item_row.doctype, item_row.name);
      await this.frm.script_manager.trigger("discount_percentage", item_row.doctype, item_row.name);
    }
    async check_stock_availability(item_row, qty_needed, warehouse) {
      const resp = (await this.get_available_stock(item_row.item_code, warehouse)).message;
      const available_qty = resp[0];
      const is_stock_item = resp[1];
      frappe.dom.unfreeze();
      const bold_uom = item_row.uom.bold();
      const bold_item_code = item_row.item_code.bold();
      const bold_warehouse = warehouse.bold();
      const bold_available_qty = available_qty.toString().bold();
      if (!(available_qty > 0)) {
        if (is_stock_item) {
          frappe.model.clear_doc(item_row.doctype, item_row.name);
          frappe.throw({
            title: __("Not Available"),
            message: __("Item Code: {0} is not available under warehouse {1}.", [bold_item_code, bold_warehouse])
          });
        } else {
          return;
        }
      } else if (is_stock_item && available_qty < qty_needed) {
        frappe.throw({
          message: __("Stock quantity not enough for Item Code: {0} under warehouse {1}. Available quantity {2} {3}.", [bold_item_code, bold_warehouse, bold_available_qty, bold_uom]),
          indicator: "orange"
        });
        frappe.utils.play_sound("error");
      }
      frappe.dom.freeze();
    }
    async check_serial_no_availablilty(item_code, warehouse, serial_no) {
      const method = "erpnext.stock.doctype.serial_no.serial_no.get_pos_reserved_serial_nos";
      const args = { filters: { item_code, warehouse } };
      const res = await frappe.call({ method, args });
      if (res.message.includes(serial_no)) {
        frappe.throw({
          title: __("Not Available"),
          message: __("Serial No: {0} has already been transacted into another Sales Invoice.", [serial_no.bold()])
        });
      }
    }
    get_available_stock(item_code, warehouse) {
      const me = this;
      return frappe.call({
        method: "erpnext.accounts.doctype.pos_invoice.pos_invoice.get_stock_availability",
        args: {
          "item_code": item_code,
          "warehouse": warehouse
        },
        callback(res) {
          if (!me.item_stock_map[item_code])
            me.item_stock_map[item_code] = {};
          me.item_stock_map[item_code][warehouse] = res.message;
        }
      });
    }
    update_item_field(value, field_or_action) {
      if (field_or_action === "checkout") {
        this.item_details.toggle_item_details_section(null);
      } else if (field_or_action === "remove") {
        this.remove_item_from_cart();
      } else {
        const field_control = this.item_details[`${field_or_action}_control`];
        if (!field_control)
          return;
        field_control.set_focus();
        value != "" && field_control.set_value(value);
      }
    }
    remove_item_from_cart() {
      frappe.dom.freeze();
      const { doctype, name, current_item } = this.item_details;
      return frappe.model.set_value(doctype, name, "qty", 0).then(() => {
        frappe.model.clear_doc(doctype, name);
        this.update_cart_html(current_item, true);
        this.item_details.toggle_item_details_section(null);
        frappe.dom.unfreeze();
        var total_incoming_rate = 0;
        this.frm.doc.items.forEach((item) => {
          total_incoming_rate += parseFloat(item.valuation_rate) * item.qty;
        });
        this.item_selector.update_total_incoming_rate(total_incoming_rate);
      }).catch((e) => console.log(e));
    }
    async save_and_checkout() {
      if (this.frm.is_dirty()) {
        const div = document.getElementById("customer-cart-container2");
        div.style.gridColumn = "";
        let save_error = false;
        await this.frm.save(null, null, null, () => save_error = true);
        !save_error && this.payment.checkout();
        save_error && setTimeout(() => {
          this.cart.toggle_checkout_btn(true);
        }, 300);
      } else {
        this.payment.checkout();
      }
    }
    async save_and_checkout() {
      if (!this.frm.doc.items || this.frm.doc.items.length === 0) {
        frappe.show_alert({
          message: __("Please add items to cart before checkout."),
          indicator: "red"
        });
        frappe.utils.play_sound("error");
        return;
      }
      if (this.frm.is_dirty()) {
        if (this.settings.custom_add_reference_details) {
          const dialog = new frappe.ui.Dialog({
            title: __("Enter Reference Details"),
            fields: [
              {
                fieldtype: "Data",
                label: __("Reference Number"),
                fieldname: "reference_no"
              },
              {
                fieldtype: "Data",
                label: __("Reference Name"),
                fieldname: "reference_name"
              }
            ],
            primary_action_label: __("Proceed to Payment"),
            primary_action: async (values) => {
              this.frm.doc.custom_reference_no = values.reference_no;
              this.frm.doc.custom_reference_name = values.reference_name;
              const div = document.getElementById("customer-cart-container2");
              div.style.gridColumn = "";
              let save_error = false;
              await this.frm.save(null, null, null, () => save_error = true);
              dialog.hide();
              if (!save_error) {
                this.payment.checkout();
              } else {
                setTimeout(() => {
                  this.cart.toggle_checkout_btn(true);
                }, 300);
              }
            }
          });
          dialog.show();
        } else {
          const div = document.getElementById("customer-cart-container2");
          div.style.gridColumn = "";
          let save_error = false;
          await this.frm.save(null, null, null, () => save_error = true);
          !save_error && this.payment.checkout();
          save_error && setTimeout(() => {
            this.cart.toggle_checkout_btn(true);
          }, 300);
        }
      } else {
        this.payment.checkout();
      }
    }
    async submit_invoice() {
      try {
        console.log("POS submit_invoice method called", this.frm);
        if (!this.frm || !this.frm.doc) {
          throw new Error("Form not properly initialized");
        }
        const doc = this.frm.doc;
        if (doc.docstatus === 1) {
          frappe.show_alert({
            indicator: "orange",
            message: __("Invoice is already submitted")
          });
          return;
        }
        const original_in_words = doc.in_words;
        const original_base_in_words = doc.base_in_words;
        doc._pos_submitting = true;
        let saved_doc;
        try {
          if (this.frm.save && typeof this.frm.save === "function") {
            saved_doc = await this.frm.save();
          } else {
            saved_doc = await frappe.call({
              method: "frappe.desk.form.save.savedocs",
              args: {
                doc,
                action: "Save"
              }
            });
          }
        } catch (save_error) {
          console.error("Error saving document:", save_error);
          throw new Error(`Failed to save document: ${save_error.message}`);
        }
        doc.__islocal = false;
        doc.__unsaved = false;
        if (original_in_words) {
          doc.in_words = original_in_words;
        }
        if (original_base_in_words) {
          doc.base_in_words = original_base_in_words;
        }
        let submitted_doc;
        try {
          if (this.frm.submit && typeof this.frm.submit === "function") {
            submitted_doc = await this.frm.submit();
          } else {
            submitted_doc = await frappe.call({
              method: "frappe.desk.form.save.savedocs",
              args: {
                doc,
                action: "Submit"
              }
            });
          }
        } catch (submit_error) {
          console.error("Error submitting document:", submit_error);
          try {
            submitted_doc = await frappe.call({
              method: "frappe.client.submit",
              args: {
                doc
              }
            });
          } catch (alt_submit_error) {
            console.error("Alternative submission also failed:", alt_submit_error);
            throw new Error(`Failed to submit document: ${submit_error.message}`);
          }
        }
        delete doc._pos_submitting;
        this.toggle_components(false);
        this.order_summary.toggle_component(true);
        this.order_summary.load_summary_of(this.frm.doc, true);
        frappe.show_alert({
          indicator: "green",
          message: __("POS invoice {0} created successfully", [doc.name])
        });
        setTimeout(() => {
          this.order_summary.print_receipt();
        }, 500);
        return submitted_doc;
      } catch (error) {
        if (this.frm && this.frm.doc) {
          delete this.frm.doc._pos_submitting;
        }
        console.error("Critical error in submit_invoice:", error);
        if (error.message && error.message.includes("In Words")) {
          frappe.show_alert({
            indicator: "orange",
            message: __("Invoice saved but submission failed. Please try submitting again from the invoice list.")
          });
        } else {
          frappe.show_alert({
            indicator: "red",
            message: __("Critical error submitting invoice: {0}", [error.message || "Unknown error"])
          });
        }
        throw error;
      }
    }
  };

  // ../posnext/posnext/public/js/pos_item_selector.js
  frappe.provide("posnext.PointOfSale");
  var view = "List";
  posnext.PointOfSale.ItemSelector = class {
    constructor({ frm, wrapper, events, pos_profile, settings, currency, init_item_cart, reload_status }) {
      this.wrapper = wrapper;
      this.events = events;
      this.currency = currency;
      this.pos_profile = pos_profile;
      this.hide_images = settings.hide_images;
      this.reload_status = reload_status;
      this.auto_add_item = settings.auto_add_item_to_cart;
      this.auto_search_serial = settings.custom_auto_search_serial_number;
      if (settings.custom_default_view) {
        view = settings.custom_default_view;
      }
      if (settings.custom_show_only_list_view) {
        view = "List";
      }
      if (settings.custom_show_only_card_view) {
        view = "Card";
      }
      this.custom_show_item_code = settings.custom_show_item_code;
      this.custom_show_last_incoming_rate = settings.custom_show_last_incoming_rate;
      this.custom_show_oem_part_number = settings.custom_show_oem_part_number;
      this.custom_show_posting_date = settings.custom_show_posting_date;
      this.custom_show_logical_rack = settings.custom_show_logical_rack;
      this.show_only_list_view = settings.custom_show_only_list_view;
      this.show_only_card_view = settings.custom_show_only_card_view;
      this.custom_edit_rate = settings.custom_edit_rate_and_uom;
      this.custom_show_incoming_rate = settings.custom_show_incoming_rate && settings.custom_edit_rate_and_uom;
      this.custom_show_item_discription = settings.custom_show_item_discription;
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
      var cardlist = ``;
      if (!this.show_only_list_view && !this.show_only_card_view) {
        cardlist = `
			<div class="list-view" style="grid-column: span 1 / span 2!important;"><a class="list-span">List</a></div>
			<div class="card-view" style="grid-column: span 1 / span 2!important;"><a class="card-span">Card</a></div>
			`;
      }
      if (view === "Card" && !this.show_only_list_view) {
        var tir = ``;
        if (this.custom_show_last_incoming_rate || this.custom_show_incoming_rate) {
          tir = `<div class="total-incoming-rate" style="margin-left: 10px;grid-column: span 2 / span 2"></div>`;
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
        this.$component = this.wrapper.find(".items-selector");
        this.$items_container = this.$component.find(".items-container");
      } else if (view === "List" && !this.show_only_card_view) {
        var section = `<section class="customer-cart-container items-selector" id="list-view-section" style="grid-column: span 6 / span 6;overflow-y:hidden">`;
        var tir = ``;
        if (this.custom_edit_rate) {
          section = `<section class="customer-cart-container items-selector" id="list-view-section" style="grid-column: span 5 / span 5;overflow-y:hidden">`;
        }
        if (this.custom_show_last_incoming_rate || this.custom_show_incoming_rate) {
          tir = `<div class="total-incoming-rate" style="margin-left: 10px;grid-column: span 2 / span 2"></div>`;
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
        this.$component = this.wrapper.find(".customer-cart-container");
        this.$items_container = this.$component.find(".cart-container");
      }
      if (!this.show_only_list_view && !this.show_only_card_view) {
        this.$list_view = this.$component.find(".list-view");
        this.$card_view = this.$component.find(".card-view");
        if (view === "List" && !this.show_only_list_view) {
          this.$list_view.find(".list-span").css({
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
          this.$card_view.find(".card-span").css({
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
          this.$card_view.find(".card-span").css({
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
          this.$list_view.find(".list-span").css({
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
          this.$list_view.find(".list-span").css({ "display": "none" });
          this.$card_view.find(".card-span").css({ "display": "none" });
        }
        if (!this.show_only_card_view && !this.show_only_list_view) {
          this.click_functions();
        }
      }
    }
    click_functions() {
      this.$list_view.on("click", "a", () => {
        this.$list_view.find(".list-span").css({ "display": "inline-block", "background-color": "#3498db", "color": "white", "padding": "5px 10px", "border-radius": "20px", "font-size": "14px", "font-weight": "bold", "text-transform": "uppercase", "letter-spacing": "1px", "cursor": "pointer", "transition": "background-color 0.3s ease" });
        this.$card_view.find(".card-span").css({ "display": "", "background-color": "", "color": "", "padding": "", "border-radius": "", "font-size": "", "font-weight": "", "text-transform": "", "letter-spacing": "", "cursor": "", "transition": "" });
        view = "List";
        if (document.getElementById("card-view-section"))
          document.getElementById("card-view-section").remove();
        if (document.getElementById("list-view-section"))
          document.getElementById("list-view-section").remove();
        if (document.getElementById("customer-cart-container2"))
          document.getElementById("customer-cart-container2").remove();
        if (document.getElementById("item-details-container"))
          document.getElementById("item-details-container").remove();
        this.inti_component();
        this.events.init_item_details();
        this.events.init_item_cart();
        this.events.change_items(this.events.get_frm());
      });
      this.$card_view.on("click", "a", () => {
        this.$card_view.find(".card-span").css({ "display": "inline-block", "background-color": "#3498db", "color": "white", "padding": "5px 10px", "border-radius": "20px", "font-size": "14px", "font-weight": "bold", "text-transform": "uppercase", "letter-spacing": "1px", "cursor": "pointer", "transition": "background-color 0.3s ease" });
        this.$list_view.find(".list-span").css({ "display": "", "background-color": "", "color": "", "padding": "", "border-radius": "", "font-size": "", "font-weight": "", "text-transform": "", "letter-spacing": "", "cursor": "", "transition": "" });
        view = "Card";
        if (document.getElementById("card-view-section"))
          document.getElementById("card-view-section").remove();
        if (document.getElementById("list-view-section"))
          document.getElementById("list-view-section").remove();
        if (document.getElementById("customer-cart-container2"))
          document.getElementById("customer-cart-container2").remove();
        if (document.getElementById("item-details-container"))
          document.getElementById("item-details-container").remove();
        this.inti_component();
        this.events.init_item_details();
        this.events.init_item_cart();
        this.events.change_items(this.events.get_frm());
      });
    }
    async load_items_data() {
      if (!this.item_group) {
        const res = await frappe.db.get_value("Item Group", { lft: 1, is_group: 1 }, "name");
        this.parent_item_group = res.message.name;
      }
      if (!this.price_list) {
        const res = await frappe.db.get_value("POS Profile", this.pos_profile, "selling_price_list");
        this.price_list = res.message.selling_price_list;
      }
      this.get_items({}).then(({ message }) => {
        this.render_item_list(message.items);
      });
    }
    get_items({ start = 0, page_length = 40, search_term = "" }) {
      const doc = this.events.get_frm().doc;
      const price_list = doc && doc.selling_price_list || this.price_list;
      let { item_group, pos_profile } = this;
      !item_group && (item_group = this.parent_item_group);
      return frappe.call({
        method: "posnext.posnext.page.posnext.point_of_sale.get_items",
        freeze: true,
        args: { start, page_length, price_list, item_group, search_term, pos_profile }
      });
    }
    render_item_list(items) {
      this.$items_container.html("");
      var me = this;
      if (view === "List") {
        let get_item_code_header2 = function() {
          var flex_value = 3;
          if (!me.custom_show_item_code && !me.custom_show_last_incoming_rate && !me.custom_show_oem_part_number && !me.custom_show_logical_rack) {
            flex_value = 2;
          }
          var html_header = ``;
          if (me.custom_show_item_code) {
            html_header += `<div style="flex: 1">${__("Item Code")}</div>`;
          }
          if (me.custom_show_last_incoming_rate) {
            html_header += `<div style="flex: 1">${__("Inc.Rate")}</div>`;
          }
          if (me.custom_show_oem_part_number) {
            html_header += `<div style="flex: 1">${__("OEM")} <br> ${__("Part No.")}</div>`;
          }
          if (me.custom_show_logical_rack) {
            html_header += `<div style="flex: 1">${__("Rack")}</div>`;
          }
          if (flex_value > 0) {
            return `<div style="flex: ` + flex_value + `">${__("Item")}</div>` + html_header;
          } else {
            return `<div>${__("Item")}</div>` + html_header;
          }
        };
        var get_item_code_header = get_item_code_header2;
        this.$items_container.append(
          `<div class="abs-cart-container" style="overflow-y:hidden">
					<div class="cart-header">
					${get_item_code_header2()}
						<div style="flex: 1">${__("Rate")}</div>
						<div style="flex: 1">${__("Avail. Qty")}</div>
						<!--<div class="qty-header">${__("UOM")}</div>-->
					</div>
					<div class="cart-items-section" style="overflow-y:scroll;font-size: 12px"></div>
				</div>`
        );
        this.make_cart_items_section();
        items.forEach((item) => {
          this.render_cart_item(item);
        });
      } else {
        items.forEach((item) => {
          var item_html = this.get_item_html(item);
          this.$items_container.append(item_html);
        });
      }
    }
    make_cart_items_section() {
      this.$cart_header = this.$component.find(".cart-header");
      this.$cart_items_wrapper = this.$component.find(".cart-items-section");
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
      );
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
      );
      function get_item_name() {
        var flex_value = 4;
        if (me.custom_show_item_code && me.custom_show_last_incoming_rate && me.custom_show_oem_part_number) {
          flex_value = 3;
        }
        if (!me.custom_show_item_code && !me.custom_show_last_incoming_rate && !me.custom_show_oem_part_number && !me.custom_show_logical_rack) {
          flex_value = 2;
        }
        return `<div class="" style="flex: ` + flex_value + `;overflow-wrap: break-word;overflow:hidden;white-space: normal">`;
      }
      set_dynamic_rate_header_width();
      function set_dynamic_rate_header_width() {
        const rate_cols = Array.from(me.$cart_items_wrapper.find(".item-rate-amount"));
        me.$cart_header.find(".rate-amount-header").css("width", "");
        me.$cart_items_wrapper.find(".item-rate-amount").css("width", "");
        var max_width = rate_cols.reduce((max_width2, elm) => {
          if ($(elm).width() > max_width2)
            max_width2 = $(elm).width();
          return max_width2;
        }, 0);
        max_width += 1;
        if (max_width == 1)
          max_width = "";
        me.$cart_header.find(".rate-amount-header").css("width", max_width);
        me.$cart_items_wrapper.find(".item-rate-amount").css("width", max_width);
      }
      function get_item_code() {
        var html_code = ``;
        if (me.custom_show_item_code) {
          var item_code_flex_value = 1;
          html_code += `<div class="item-code-desc" style="flex: ` + item_code_flex_value + `;text-align: left">
					<div class="item-code" >
						<b>${item_data.item_code}</b> <br>
						${item_data.uom}
					</div>
				</div>`;
        }
        if (me.custom_show_last_incoming_rate) {
          html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${parseFloat(item_data.valuation_rate).toFixed(2)}
					</div>
				</div>`;
        }
        if (me.custom_show_oem_part_number) {
          html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${item_data.custom_oem_part_number || ""}
					</div>
				</div>`;
        }
        if (me.custom_show_logical_rack) {
          html_code += `<div class="incoming-rate-desc" style="flex: 1;text-align: left">
					<div class="incoming-rate" >
						${item_data.rack || ""}
					</div>
				</div>`;
        }
        return html_code;
      }
      function get_rate_discount_html() {
        if (item_data.rate && item_data.amount && item_data.rate !== item_data.amount) {
          return `
					<div class="item-qty-rate" style="flex: 3">
						<div class="item-rate-amount" style="flex: 1">
							<div class="item-rate" style="text-align: left">${format_currency(item_data.price_list_rate, currency)}</div>
						</div>
						<div class="item-qty" style="flex: 1;display:block;text-align: center"><span> ${item_data.actual_qty || 0}</span></div>
					
						
					</div>`;
        } else {
          return `
					<div class="item-qty-rate" style="flex: 3">
						<div class="item-rate-amount" style="flex: 1">
							<div class="item-rate" style="text-align: left">${format_currency(item_data.price_list_rate, currency)}</div>
						</div>
						<div class="item-qty" style="flex: 1;display:block;text-align: center"><span> ${item_data.actual_qty || 0}</span></div>
						
						
					</div>`;
        }
      }
      function get_description_html(item_data2) {
        if (me.custom_show_item_discription) {
          if (item_data2.description.indexOf("<div>") != -1) {
            try {
              item_data2.description = $(item_data2.description).text();
            } catch (error) {
              item_data2.description = item_data2.description.replace(/<div>/g, " ").replace(/<\/div>/g, " ").replace(/ +/g, " ");
            }
          }
          item_data2.description = frappe.ellipsis(item_data2.description, 45);
          return `<div class="item-desc">${item_data2.description}</div>`;
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
      item.currency = item.currency || me.currency;
      const { item_image, serial_no, batch_no, barcode, actual_qty, uom, price_list_rate } = item;
      const precision2 = flt(price_list_rate, 2) % 1 != 0 ? 2 : 0;
      let indicator_color;
      let qty_to_display = actual_qty;
      if (item.is_stock_item) {
        indicator_color = actual_qty > 10 ? "green" : actual_qty <= 0 ? "red" : "orange";
        if (Math.round(qty_to_display) > 999) {
          qty_to_display = Math.round(qty_to_display) / 1e3;
          qty_to_display = qty_to_display.toFixed(1) + "K";
        }
      } else {
        indicator_color = "";
        qty_to_display = "";
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
      return `<div class="item-wrapper"
				data-item-code="${escape(item.item_code)}" data-serial-no="${escape(serial_no)}"
				data-batch-no="${escape(batch_no)}" data-uom="${escape(uom)}"
				data-rate="${escape(price_list_rate || 0)}"
				title="${item.item_name}">

				${get_item_image_html()}

				<div class="item-detail">
					<div class="item-name">
						${frappe.ellipsis(item.item_name, 18)}
					</div>
					<div class="item-rate">${format_currency(price_list_rate, item.currency, precision2) || 0} / ${uom}</div>
				</div>
			</div>`;
    }
    handle_broken_image($img) {
      const item_abbr = $($img).attr("alt");
      $($img).parent().replaceWith(`<div class="item-display abbr">${item_abbr}</div>`);
    }
    update_total_incoming_rate(total_rate) {
      if (this.total_incoming_rate) {
        this.total_incoming_rate.set_value(total_rate);
      }
    }
    make_search_bar() {
      const me = this;
      const doc = me.events.get_frm().doc;
      this.$component.find(".search-field").html("");
      this.$component.find(".pos-profile").html("");
      this.$component.find(".total-incoming-rate").html("");
      this.$component.find(".item-group-field").html("");
      this.$component.find(".invoice-posting-date").html("");
      frappe.db.get_single_value("POS Settings", "custom_profile_lock").then((doc2) => {
        this.pos_profile_field = frappe.ui.form.make_control({
          df: {
            label: __("POS Profile"),
            fieldtype: "Link",
            options: "POS Profile",
            placeholder: __("POS Profile"),
            read_only: doc2,
            onchange: function() {
              if (me.reload_status && me.pos_profile !== this.value) {
                frappe.pages["posnext"].refresh(window.wrapper, window.onScan, this.value);
              }
            }
          },
          parent: this.$component.find(".pos-profile"),
          render_input: false
        });
        this.pos_profile_field.set_value(me.pos_profile);
        this.pos_profile_field.refresh();
        this.pos_profile_field.toggle_label(false);
      });
      this.search_field = frappe.ui.form.make_control({
        df: {
          label: __("Search"),
          fieldtype: "Data",
          placeholder: __("Search by serial number or barcode")
        },
        parent: this.$component.find(".search-field"),
        render_input: true
      });
      this.item_group_field = frappe.ui.form.make_control({
        df: {
          label: __("Item Group"),
          fieldtype: "Link",
          options: "Item Group",
          placeholder: __("Select item group"),
          onchange: function() {
            me.item_group = this.value;
            !me.item_group && (me.item_group = me.parent_item_group);
            me.filter_items();
          },
          get_query: function() {
            return {
              query: "posnext.posnext.page.posnext.point_of_sale.item_group_query",
              filters: {
                pos_profile: doc ? doc.pos_profile : ""
              }
            };
          }
        },
        parent: this.$component.find(".item-group-field"),
        render_input: true
      });
      if (this.custom_show_last_incoming_rate || this.custom_show_incoming_rate) {
        this.total_incoming_rate = frappe.ui.form.make_control({
          df: {
            label: __(""),
            fieldtype: "Currency",
            read_only: 1,
            placeholder: __("Total Incoming Rate"),
            default: 0
          },
          parent: this.$component.find(".total-incoming-rate"),
          render_input: true
        });
      }
      if (me.custom_show_posting_date) {
        this.invoice_posting_date = frappe.ui.form.make_control({
          df: {
            label: __("Posting Date"),
            fieldtype: "Date",
            onchange: function() {
              me.events.get_frm().doc.posting_date = this.value;
              me.events.get_frm().doc.set_posting_time = 1;
            }
          },
          parent: this.$component.find(".invoice-posting-date"),
          render_input: true
        });
      }
      this.search_field.toggle_label(false);
      this.item_group_field.toggle_label(false);
      if (this.custom_show_last_incoming_rate) {
        this.total_incoming_rate.toggle_label(false);
      }
      if (me.custom_show_posting_date) {
        this.invoice_posting_date.toggle_label(false);
        this.invoice_posting_date.set_value(frappe.datetime.get_today());
      }
      this.attach_clear_btn();
    }
    attach_clear_btn() {
      this.search_field.$wrapper.find(".control-input").append(
        `<span class="link-btn" style="top: 2px;">
				<a class="btn-open no-decoration" title="${__("Clear")}">
					${frappe.utils.icon("close", "sm")}
				</a>
			</span>`
      );
      this.$clear_search_btn = this.search_field.$wrapper.find(".link-btn");
      this.$clear_search_btn.on("click", "a", () => {
        this.set_search_value("");
        this.search_field.set_focus();
      });
    }
    set_search_value(value) {
      $(this.search_field.$input[0]).val(value).trigger("input");
    }
    bind_events() {
      const me = this;
      if (!window.onScan) {
        frappe.require("https://cdn.jsdelivr.net/npm/onscan.js/onscan.min.js", function() {
          window.onScan = onScan;
          onScan.decodeKeyEvent = function(oEvent) {
            var iCode = this._getNormalizedKeyNum(oEvent);
            switch (true) {
              case (iCode >= 48 && iCode <= 90):
              case (iCode >= 106 && iCode <= 111):
              case (iCode >= 160 && iCode <= 164 || iCode == 170):
              case (iCode >= 186 && iCode <= 194):
              case (iCode >= 219 && iCode <= 222):
              case iCode == 32:
                if (oEvent.key !== void 0 && oEvent.key !== "") {
                  return oEvent.key;
                }
                var sDecoded = String.fromCharCode(iCode);
                switch (oEvent.shiftKey) {
                  case false:
                    sDecoded = sDecoded.toLowerCase();
                    break;
                  case true:
                    sDecoded = sDecoded.toUpperCase();
                    break;
                }
                return sDecoded;
              case (iCode >= 96 && iCode <= 105):
                return 0 + (iCode - 96);
            }
            return "";
          };
          onScan.attachTo(document, {
            onScan: (sScancode) => {
              if (this.search_field && this.$component.is(":visible")) {
                this.search_field.set_focus();
                this.set_search_value(sScancode);
                this.barcode_scanned = true;
              }
            }
          });
        });
      }
      this.$component.on("click", ".item-wrapper", function() {
        try {
          console.log("Item clicked - starting add to cart process");
          const $item = $(this);
          const item_code = unescape($item.attr("data-item-code"));
          let batch_no = unescape($item.attr("data-batch-no"));
          let serial_no = unescape($item.attr("data-serial-no"));
          let uom = unescape($item.attr("data-uom"));
          let rate = unescape($item.attr("data-rate"));
          let valuation_rate = unescape($item.attr("data-valuation-rate"));
          let custom_item_uoms = $item.attr("data-item-uoms");
          let custom_logical_rack = $item.attr("data-item-logical-rack");
          console.log("Item data extracted:", {
            item_code,
            batch_no,
            serial_no,
            uom,
            rate,
            valuation_rate
          });
          batch_no = batch_no === "undefined" ? void 0 : batch_no;
          serial_no = serial_no === "undefined" ? void 0 : serial_no;
          uom = uom === "undefined" ? void 0 : uom;
          rate = rate === "undefined" ? void 0 : rate;
          console.log("Calling me.events.item_selected with:", {
            field: "qty",
            value: "+1",
            item: { item_code, batch_no, serial_no, uom, rate, valuation_rate, custom_item_uoms, custom_logical_rack }
          });
          if (!me.events || !me.events.item_selected) {
            console.error("Error: me.events.item_selected is not defined!", me.events);
            frappe.show_alert({
              message: __("Error: Cart functionality not initialized"),
              indicator: "red"
            });
            return;
          }
          me.events.item_selected({
            field: "qty",
            value: "+1",
            item: { item_code, batch_no, serial_no, uom, rate, valuation_rate, custom_item_uoms, custom_logical_rack }
          });
          console.log("Item successfully added to cart");
        } catch (error) {
          console.error("Error adding item to cart:", error);
          frappe.show_alert({
            message: __("Error adding item to cart: ") + error.message,
            indicator: "red"
          });
        }
      });
      this.search_field.$input.on("input", (e) => {
        clearTimeout(this.last_search);
        this.last_search = setTimeout(() => {
          const search_term = e.target.value;
          this.filter_items({ search_term });
        }, 300);
      });
    }
    attach_shortcuts() {
      const ctrl_label = frappe.utils.is_mac() ? "\u2318" : "Ctrl";
      this.search_field.parent.attr("title", `${ctrl_label}+I`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+i",
        action: () => this.search_field.set_focus(),
        condition: () => this.$component.is(":visible"),
        description: __("Focus on search input"),
        ignore_inputs: true,
        page: cur_page.page.page
      });
      this.item_group_field.parent.attr("title", `${ctrl_label}+G`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+g",
        action: () => this.item_group_field.set_focus(),
        condition: () => this.$component.is(":visible"),
        description: __("Focus on Item Group filter"),
        ignore_inputs: true,
        page: cur_page.page.page
      });
      frappe.ui.keys.on("enter", () => {
        const selector_is_visible = this.$component.is(":visible");
        if (!selector_is_visible || this.search_field.get_value() === "")
          return;
        if (this.items.length == 1) {
          this.$items_container.find(".item-wrapper").click();
          frappe.utils.play_sound("submit");
          this.set_search_value("");
        } else if (this.items.length == 0 && this.barcode_scanned) {
          frappe.show_alert({
            message: __("No items found. Scan barcode again."),
            indicator: "orange"
          });
          frappe.utils.play_sound("error");
          this.barcode_scanned = false;
          this.set_search_value("");
        }
      });
    }
    filter_items({ search_term = "" } = {}) {
      if (search_term) {
        search_term = search_term.toLowerCase();
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
      this.get_items({ search_term }).then(({ message }) => {
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
      this.set_search_value("");
    }
    resize_selector(minimize) {
      minimize ? this.$component.find(".filter-section").css("grid-template-columns", "repeat(1, minmax(0, 1fr))") : this.$component.find(".filter-section").css("grid-template-columns", "repeat(12, minmax(0, 1fr))");
      minimize ? this.$component.find(".search-field").css("margin", "var(--margin-sm) 0px") : this.$component.find(".search-field").css("margin", "0px var(--margin-sm)");
      minimize ? this.$component.css("grid-column", "span 2 / span 2") : this.$component.css("grid-column", "span 6 / span 6");
      minimize ? this.$items_container.css("grid-template-columns", "repeat(1, minmax(0, 1fr))") : this.$items_container.css("grid-template-columns", "repeat(4, minmax(0, 1fr))");
    }
    toggle_component(show) {
      this.set_search_value("");
      this.$component.css("display", show ? "flex" : "none");
    }
  };

  // ../posnext/posnext/public/js/pos_item_cart.js
  frappe.provide("posnext.PointOfSale");
  if (!posnext.PointOfSale.Logger) {
    posnext.PointOfSale.Logger = {
      error: function(context, error, show_alert = true) {
        if (frappe.boot && frappe.boot.developer_mode) {
          console.error(`[POS ItemCart][${context}]:`, error);
        }
        if (show_alert && error.message) {
          frappe.show_alert({
            message: __("Error in {0}: {1}", [context, error.message]),
            indicator: "red"
          });
        }
        if (error.critical) {
          frappe.call({
            method: "frappe.core.doctype.error_log.error_log.log_error",
            args: {
              title: `POS ItemCart ${context} Error`,
              error: error.stack || error.message || String(error)
            },
            freeze: false
          });
        }
      },
      warning: function(context, message, show_alert = false) {
        if (frappe.boot && frappe.boot.developer_mode) {
          console.warn(`[POS ItemCart][${context}]:`, message);
        }
        if (show_alert) {
          frappe.show_alert({
            message: __("Warning: {0}", [message]),
            indicator: "orange"
          });
        }
      },
      info: function(context, message, show_alert = false) {
        if (frappe.boot && frappe.boot.developer_mode) {
          console.info(`[POS ItemCart][${context}]:`, message);
        }
        if (show_alert) {
          frappe.show_alert({
            message: __("Info: {0}", [message]),
            indicator: "blue"
          });
        }
      }
    };
  }
  var _a;
  posnext.PointOfSale.ItemCart = (_a = class {
    constructor({ wrapper, events, settings }) {
      var _a5;
      try {
        if (!wrapper) {
          throw new Error("Wrapper element is required for ItemCart initialization");
        }
        if (!events) {
          throw new Error("Events object is required for ItemCart initialization");
        }
        if (!settings) {
          throw new Error("Settings object is required for ItemCart initialization");
        }
        this.logger = posnext.PointOfSale.Logger;
        this.wrapper = wrapper.jquery ? wrapper : $(wrapper);
        if (!this.wrapper.length) {
          throw new Error("Invalid wrapper element provided");
        }
        this.events = events;
        this.customer_info = void 0;
        this.settings = settings || {};
        this.hide_images = this.settings.hide_images || false;
        this.allowed_customer_groups = this.settings.customer_groups || [];
        this.allow_rate_change = this.settings.allow_rate_change || false;
        this.allow_discount_change = this.settings.allow_discount_change || false;
        this.show_held_button = this.settings.custom_show_held_button || false;
        this.show_order_list_button = this.settings.custom_show_order_list_button || false;
        this.mobile_number_based_customer = this.settings.custom_mobile_number_based_customer || false;
        this.show_checkout_button = this.settings.custom_show_checkout_button !== false;
        this.custom_edit_rate = this.settings.custom_edit_rate_and_uom || false;
        this.custom_use_discount_percentage = this.settings.custom_use_discount_percentage || false;
        this.custom_use_discount_amount = this.settings.custom_use_discount_amount || false;
        this.custom_use_additional_discount_amount = this.settings.custom_use_additional_discount_amount || false;
        this.custom_show_incoming_rate = this.settings.custom_show_incoming_rate && this.settings.custom_edit_rate_and_uom || false;
        this.custom_show_last_customer_rate = this.settings.custom_show_last_customer_rate || false;
        this.custom_show_logical_rack_in_cart = this.settings.custom_show_logical_rack_in_cart && this.settings.custom_edit_rate_and_uom || false;
        this.custom_show_uom_in_cart = this.settings.custom_show_uom_in_cart && this.settings.custom_edit_rate_and_uom || false;
        this.show_branch = this.settings.show_branch || false;
        this.show_batch_in_cart = this.settings.show_batch_in_cart || false;
        this.custom_show_item_discription = this.settings.custom_show_item_discription || false;
        this.custom_show_item_barcode = this.settings.custom_show_item_barcode || false;
        this.warehouse = this.settings.warehouse || "";
        this.init_component();
      } catch (error) {
        (_a5 = this.logger) == null ? void 0 : _a5.error("Constructor", error, true);
        throw error;
      }
    }
    safe_css_operation(element, property, value) {
      var _a5, _b;
      if (!element || !element.length) {
        (_a5 = this.logger) == null ? void 0 : _a5.warning("CSS Operation", "Element not found for CSS operation", false);
        return false;
      }
      try {
        if (typeof property === "object") {
          element.css(property);
        } else {
          element.css(property, value);
        }
        return true;
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("CSS Operation", error, false);
        return false;
      }
    }
    validate_element(element, elementName) {
      var _a5;
      if (!element || !element.length) {
        (_a5 = this.logger) == null ? void 0 : _a5.warning("Element Validation", `${elementName} element not found or empty`, false);
        return false;
      }
      return true;
    }
    init_component() {
      var _a5, _b, _c;
      try {
        (_a5 = this.logger) == null ? void 0 : _a5.info("Component Initialization", "Starting ItemCart component initialization");
        this.prepare_dom();
        this.init_child_components();
        this.bind_events();
        this.attach_shortcuts();
        (_b = this.logger) == null ? void 0 : _b.info("Component Initialization", "ItemCart component initialized successfully");
      } catch (error) {
        (_c = this.logger) == null ? void 0 : _c.error("Component Initialization", {
          message: "Failed to initialize ItemCart component",
          originalError: error,
          critical: true
        }, true);
        throw error;
      }
    }
    prepare_dom() {
      var _a5, _b;
      try {
        if (!this.validate_element(this.wrapper, "wrapper")) {
          throw new Error("Wrapper element validation failed");
        }
        const gridStyle = this.custom_edit_rate ? 'style="grid-column: span 5 / span 5;"' : "";
        const containerHtml = `<section class="customer-cart-container customer-cart-container1" ${gridStyle} id="customer-cart-container2"></section>`;
        this.wrapper.append(containerHtml);
        this.$component = this.wrapper.find(".customer-cart-container1");
        if (!this.validate_element(this.$component, "component container")) {
          throw new Error("Failed to create or find component container");
        }
        (_a5 = this.logger) == null ? void 0 : _a5.info("DOM Preparation", "DOM structure prepared successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("DOM Preparation", {
          message: "Failed to prepare DOM structure",
          originalError: error,
          critical: true
        }, true);
        throw error;
      }
    }
    init_child_components() {
      var _a5, _b;
      try {
        this.init_customer_selector();
        this.init_cart_components();
        (_a5 = this.logger) == null ? void 0 : _a5.info("Child Components", "All child components initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Child Components", {
          message: "Failed to initialize child components",
          originalError: error,
          critical: true
        }, true);
        throw error;
      }
    }
    init_customer_selector() {
      var _a5, _b;
      try {
        if (!this.validate_element(this.$component, "component container")) {
          throw new Error("Component container not available for customer selector");
        }
        this.$component.append(`<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CUSTOMER_SECTION}"></div>`);
        this.$customer_section = this.$component.find("." + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CUSTOMER_SECTION);
        if (!this.validate_element(this.$customer_section, "customer section")) {
          throw new Error("Failed to create or find customer section");
        }
        this.make_customer_selector();
        (_a5 = this.logger) == null ? void 0 : _a5.info("Customer Selector", "Customer selector initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Customer Selector", {
          message: "Failed to initialize customer selector",
          originalError: error
        }, true);
        throw error;
      }
    }
    reset_customer_selector() {
      const frm = this.events.get_frm();
      frm.set_value("customer", "");
      this.make_customer_selector();
      this.customer_field.set_focus();
    }
    init_cart_components() {
      var _a5, _b;
      try {
        if (!this.validate_element(this.$component, "component container")) {
          throw new Error("Component container not available for cart components");
        }
        let html = `<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_CONTAINER}">
					<div class="abs-cart-container">
						<div class="cart-label">${__("Item Cart")}</div>
						<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_HEADER}">
							<div class="name-header" style="flex:3">${__("Item")}</div>
							<div class="qty-header" style="flex: 1">${__("Qty")}</div>`;
        if (this.custom_show_uom_in_cart) {
          html += `<div class="uom-header" style="flex: 1">${__("UOM")}</div>`;
        }
        if (this.show_batch_in_cart) {
          html += `<div class="batch-header" style="flex: 1">${__("Batch")}</div>`;
        }
        if (this.custom_edit_rate) {
          html += `<div class="rate-header" style="flex: 1">${__("Rate")}</div>`;
        }
        if (this.custom_use_discount_percentage) {
          html += `<div class="discount-perc-header" style="flex: 1">${__("Disc%")}</div>`;
        }
        if (this.custom_use_discount_amount) {
          html += `<div class="discount-amount-header" style="flex: 1">${__("Disc")}</div>`;
        }
        if (this.custom_show_incoming_rate) {
          html += `<div class="incoming-rate-header" style="flex: 1">${__("Inc.Rate")}</div>`;
        }
        if (this.custom_show_logical_rack_in_cart) {
          html += `<div class="logical-rack-header" style="flex: 1">${__("Rack")}</div>`;
        }
        if (this.custom_show_last_customer_rate) {
          html += `<div class="last-customer-rate-header" style="flex: 1">${__("LC Rate")}</div>`;
        }
        html += `<div class="rate-amount-header" style="flex: 1;text-align: left">${__("Amount")}</div>
						</div>
						<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_ITEMS_WRAPPER}"></div>
						<div class="cart-branch-section"></div>
						<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.TOTALS_SECTION}"></div>
						<div class="${posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.NUMPAD_SECTION}"></div>
					</div>
				</div>`;
        this.$component.append(html);
        this.$cart_container = this.$component.find("." + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_CONTAINER);
        if (!this.validate_element(this.$cart_container, "cart container")) {
          throw new Error("Failed to create or find cart container");
        }
        this.make_branch_section();
        this.make_cart_totals_section();
        this.make_cart_items_section();
        this.make_cart_numpad();
        (_a5 = this.logger) == null ? void 0 : _a5.info("Cart Components", "Cart components initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Cart Components", {
          message: "Failed to initialize cart components",
          originalError: error
        }, true);
        throw error;
      }
    }
    make_cart_items_section() {
      var _a5, _b;
      try {
        this.$cart_header = this.$component.find("." + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_HEADER);
        this.$cart_items_wrapper = this.$component.find("." + posnext.PointOfSale.ItemCart.CONSTANTS.CSS_CLASSES.CART_ITEMS_WRAPPER);
        if (!this.validate_element(this.$cart_header, "cart header")) {
          throw new Error("Cart header element not found");
        }
        if (!this.validate_element(this.$cart_items_wrapper, "cart items wrapper")) {
          throw new Error("Cart items wrapper element not found");
        }
        this.make_no_items_placeholder();
        (_a5 = this.logger) == null ? void 0 : _a5.info("Cart Items Section", "Cart items section initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Cart Items Section", {
          message: "Failed to initialize cart items section",
          originalError: error
        }, true);
        throw error;
      }
    }
    make_no_items_placeholder() {
      var _a5, _b;
      try {
        this.safe_css_operation(this.$cart_header, "display", "none");
        if (this.validate_element(this.$cart_items_wrapper, "cart items wrapper")) {
          this.$cart_items_wrapper.html(
            `<div class="no-item-wrapper">${__(posnext.PointOfSale.ItemCart.CONSTANTS.MESSAGES.NO_ITEMS)}</div>`
          );
        }
        (_a5 = this.logger) == null ? void 0 : _a5.info("No Items Placeholder", "No items placeholder created successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("No Items Placeholder", {
          message: "Failed to create no items placeholder",
          originalError: error
        }, false);
      }
    }
    get_discount_icon() {
      return `<svg class="discount-icon" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M19 15.6213C19 15.2235 19.158 14.842 19.4393 14.5607L20.9393 13.0607C21.5251 12.4749 21.5251 11.5251 20.9393 10.9393L19.4393 9.43934C19.158 9.15804 19 8.7765 19 8.37868V6.5C19 5.67157 18.3284 5 17.5 5H15.6213C15.2235 5 14.842 4.84196 14.5607 4.56066L13.0607 3.06066C12.4749 2.47487 11.5251 2.47487 10.9393 3.06066L9.43934 4.56066C9.15804 4.84196 8.7765 5 8.37868 5H6.5C5.67157 5 5 5.67157 5 6.5V8.37868C5 8.7765 4.84196 9.15804 4.56066 9.43934L3.06066 10.9393C2.47487 11.5251 2.47487 12.4749 3.06066 13.0607L4.56066 14.5607C4.84196 14.842 5 15.2235 5 15.6213V17.5C5 18.3284 5.67157 19 6.5 19H8.37868C8.7765 19 9.15804 19.158 9.43934 19.4393L10.9393 20.9393C11.5251 21.5251 12.4749 21.5251 13.0607 20.9393L14.5607 19.4393C14.842 19.158 15.2235 19 15.6213 19H17.5C18.3284 19 19 18.3284 19 17.5V15.6213Z" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M15 9L9 15" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M10.5 9.5C10.5 10.0523 10.0523 10.5 9.5 10.5C8.94772 10.5 8.5 10.0523 8.5 9.5C8.5 8.94772 8.94772 8.5 9.5 8.5C10.0523 8.5 10.5 8.94772 10.5 9.5Z" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M15.5 14.5C15.5 15.0523 15.0523 15.5 14.5 15.5C13.9477 15.5 13.5 15.0523 13.5 14.5C13.5 13.9477 13.9477 13.5 14.5 13.5C15.0523 13.5 15.5 13.9477 15.5 14.5Z" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>`;
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
        this.$branch_section = this.$component.find(".cart-branch-section");
        if (this.$branch_section.length) {
          this.$branch_section.append(`
					<br>
					<div class="add-branch-wrapper">
						${this.get_branch_icon()} <span class="add-branch-text">${__("Add Branch")}</span>
					</div>
				`);
          this.$branch_section.find(".add-branch-wrapper").hover(
            function() {
              $(this).css("background-color", "#f9f9f9");
            },
            function() {
              $(this).css("background-color", "transparent");
            }
          );
        }
      }
    }
    make_cart_totals_section() {
      this.$totals_section = this.$component.find(".cart-totals-section");
      this.$totals_section.append(
        `<div class="add-discount-wrapper">
				${this.get_discount_icon()} ${__("Add Discount")}
			</div>
			<div class="item-qty-total-container">
				<div class="item-qty-total-label">${__("Total Items")}</div>
				<div class="item-qty-total-value">0.00</div>
			</div>
			<div class="net-total-container">
				<div class="net-total-label">${__("Net Total")}</div>
				<div class="net-total-value">0.00</div>
			</div>
			<div class="taxes-container"></div>
			<div class="grand-total-container">
				<div>${__("Grand Total")}</div>
				<div>0.00</div>
			</div>
			<div style=" display: flex;justify-content: space-between;gap: 10px;">
				<div class="checkout-btn" style="
							padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1; ">${__("Checkout (F1)")}</div>
				<div class="checkout-btn-held checkout-btn" style="
							padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1;">${__("Held (F2)")}</div>
				<div class="checkout-btn-order checkout-btn" style="
				padding: 10px;
							align-items: center;
							justify-content: center;
							color: white;
							border: none;
							border-radius: 5px;
							cursor: pointer;
							flex: 1;">${__("Order List (F3)")}</div>
			</div>	
			<div class="edit-cart-btn">${__("Edit Cart")}</div>`
      );
      this.$add_discount_elem = this.$component.find(".add-discount-wrapper");
      this.highlight_checkout_btn(true);
    }
    make_cart_numpad() {
      this.$numpad_section = this.$component.find(".numpad-section");
      this.number_pad = new posnext.PointOfSale.NumberPad({
        wrapper: this.$numpad_section,
        events: {
          numpad_event: this.on_numpad_event.bind(this)
        },
        cols: 5,
        keys: [
          [1, 2, 3, "Quantity"],
          [4, 5, 6, "Discount"],
          [7, 8, 9, "Rate"],
          [".", 0, "Delete", "Remove"]
        ],
        css_classes: [
          ["", "", "", "col-span-2"],
          ["", "", "", "col-span-2"],
          ["", "", "", "col-span-2"],
          ["", "", "", "col-span-2 remove-btn"]
        ],
        fieldnames_map: { "Quantity": "qty", "Discount": "discount_percentage" }
      });
      this.$numpad_section.prepend(
        `<div class="numpad-totals">
			<span class="numpad-item-qty-total"></span>
				<span class="numpad-net-total"></span>
				<span class="numpad-grand-total"></span>
			</div>`
      );
      this.$numpad_section.append(
        `<div class="numpad-btn checkout-btn" data-button-value="checkout">${__("Checkout")}</div>`
      );
    }
    bind_events() {
      var _a5, _b, _c, _d;
      try {
        (_a5 = this.logger) == null ? void 0 : _a5.info("Event Binding", "Starting event binding for cart components");
        const me = this;
        if (!this.validate_element(this.$customer_section, "Customer section"))
          return;
        this.$customer_section.on("click", ".reset-customer-btn", function() {
          var _a6;
          try {
            me.reset_customer_selector();
          } catch (error) {
            (_a6 = me.logger) == null ? void 0 : _a6.error("Customer Reset", {
              message: "Failed to reset customer selector",
              originalError: error
            }, false);
          }
        });
        this.$customer_section.on("click", ".close-details-btn", function() {
          var _a6;
          try {
            me.toggle_customer_info(false);
          } catch (error) {
            (_a6 = me.logger) == null ? void 0 : _a6.error("Customer Details", {
              message: "Failed to close customer details",
              originalError: error
            }, false);
          }
        });
        this.$customer_section.on("click", ".customer-display", function(e) {
          var _a6;
          try {
            if ($(e.target).closest(".reset-customer-btn").length)
              return;
            const show = me.$cart_container.is(":visible");
            me.toggle_customer_info(show);
          } catch (error) {
            (_a6 = me.logger) == null ? void 0 : _a6.error("Customer Display", {
              message: "Failed to toggle customer display",
              originalError: error
            }, false);
          }
        });
        if (!this.validate_element(this.$cart_items_wrapper, "Cart items wrapper"))
          return;
        if (!me.custom_edit_rate) {
          this.$cart_items_wrapper.on("click", ".cart-item-wrapper", function() {
            var _a6, _b2, _c2;
            try {
              const $cart_item = $(this);
              if (!$cart_item.length) {
                (_a6 = me.logger) == null ? void 0 : _a6.warn("Cart Item Click", "Cart item element not found");
                return;
              }
              me.toggle_item_highlight(this);
              const payment_section_hidden = !me.$totals_section.find(".edit-cart-btn").is(":visible");
              if (!payment_section_hidden) {
                me.$totals_section.find(".edit-cart-btn").click();
              }
              const item_row_name = unescape($cart_item.attr("data-row-name"));
              if (!item_row_name) {
                (_b2 = me.logger) == null ? void 0 : _b2.warn("Cart Item Click", "Item row name not found");
                return;
              }
              me.events.cart_item_clicked({ name: item_row_name });
              this.numpad_value = "";
            } catch (error) {
              (_c2 = me.logger) == null ? void 0 : _c2.error("Cart Item Click", {
                message: "Failed to handle cart item click",
                originalError: error
              }, false);
            }
          });
        }
        if (!this.validate_element(this.$component, "Component wrapper"))
          return;
        this.$component.on("click", ".checkout-btn", async function() {
          var _a6, _b2, _c2;
          try {
            if ($(this).attr("style").indexOf("--blue-500") == -1)
              return;
            if ($(this).attr("class").indexOf("checkout-btn-held") !== -1)
              return;
            if ($(this).attr("class").indexOf("checkout-btn-order") !== -1)
              return;
            (_a6 = me.logger) == null ? void 0 : _a6.info("Checkout", "Checkout button clicked");
            if (!cur_frm.doc.customer && me.mobile_number_based_customer) {
              try {
                const dialog = me.create_mobile_dialog(async function(values) {
                  var _a7;
                  try {
                    if (values["mobile_number"].length !== me.settings.custom_mobile_number_length) {
                      frappe.throw("Mobile Number Length is " + me.settings.custom_mobile_number_length.toString());
                      return;
                    }
                    await me.create_customer_and_proceed(values["mobile_number"]);
                    await me.events.checkout();
                    me.toggle_checkout_btn(false);
                    me.allow_discount_change && me.$add_discount_elem.removeClass("d-none");
                    dialog.hide();
                  } catch (error) {
                    (_a7 = me.logger) == null ? void 0 : _a7.error("Checkout Mobile Dialog", {
                      message: "Error in mobile dialog checkout",
                      originalError: error
                    }, false);
                  }
                });
                dialog.show();
              } catch (error) {
                (_b2 = me.logger) == null ? void 0 : _b2.error("Checkout Dialog Creation", {
                  message: "Failed to create mobile dialog for checkout",
                  originalError: error
                }, false);
              }
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
            (_c2 = me.logger) == null ? void 0 : _c2.error("Checkout", {
              message: "Error during checkout",
              originalError: error
            }, false);
            frappe.msgprint(__("Error during checkout. Please try again."));
          }
        });
        this.$component.on("click", ".checkout-btn-held", function() {
          var _a6, _b2;
          try {
            if ($(this).attr("style").indexOf("--blue-500") == -1)
              return;
            if (!cur_frm.doc.items.length) {
              frappe.throw("Cannot save empty invoice");
              return;
            }
            (_a6 = me.logger) == null ? void 0 : _a6.info("Hold", "Hold button clicked");
            if (!cur_frm.doc.customer && me.mobile_number_based_customer) {
              const mobile_dialog = me.create_mobile_dialog(function(values) {
                var _a7;
                try {
                  const mobile_number = values["mobile_number"] || "";
                  const required_length = me.settings.custom_mobile_number_length || 10;
                  if (!mobile_number) {
                    frappe.throw(__("Please enter a mobile number"));
                    return;
                  }
                  if (mobile_number.length !== required_length) {
                    frappe.throw(__("Mobile Number must be exactly {0} digits long. Currently entered: {1} digits", [required_length, mobile_number.length]));
                    return;
                  }
                  if (!/^\d+$/.test(mobile_number)) {
                    frappe.throw(__("Mobile Number must contain only digits"));
                    return;
                  }
                  frappe.call({
                    method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
                    args: { customer: mobile_number },
                    freeze: true,
                    freeze_message: "Creating Customer....",
                    callback: function() {
                      const frm = me.events.get_frm();
                      frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer", mobile_number);
                      frm.script_manager.trigger("customer", frm.doc.doctype, frm.doc.name).then(() => {
                        frappe.run_serially([
                          () => me.fetch_customer_details(mobile_number),
                          () => me.events.customer_details_updated(me.customer_info),
                          () => me.update_customer_section(),
                          () => me.show_secret_key_popup_for_hold()
                        ]);
                      });
                      mobile_dialog.hide();
                    },
                    error: function(r) {
                      var _a8;
                      (_a8 = me.logger) == null ? void 0 : _a8.error("Customer Creation", {
                        message: "Failed to create customer",
                        originalError: r
                      }, false);
                      frappe.show_alert({
                        message: __("Failed to create customer. Please try again."),
                        indicator: "red"
                      });
                    }
                  });
                } catch (error) {
                  (_a7 = me.logger) == null ? void 0 : _a7.error("Hold Mobile Dialog", {
                    message: "Error in hold mobile dialog",
                    originalError: error
                  }, false);
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
          } catch (error) {
            (_b2 = me.logger) == null ? void 0 : _b2.error("Hold Action", {
              message: "Error during hold action",
              originalError: error
            }, false);
          }
        });
        this.$component.on("click", ".checkout-btn-order", () => {
          var _a6;
          try {
            this.events.toggle_recent_order();
          } catch (error) {
            (_a6 = this.logger) == null ? void 0 : _a6.error("Recent Order", {
              message: "Failed to toggle recent order",
              originalError: error
            }, false);
          }
        });
        this.$totals_section.on("click", ".edit-cart-btn", () => {
          var _a6;
          try {
            this.events.edit_cart();
            this.toggle_checkout_btn(true);
          } catch (error) {
            (_a6 = this.logger) == null ? void 0 : _a6.error("Edit Cart", {
              message: "Failed to edit cart",
              originalError: error
            }, false);
          }
        });
        this.$component.on("click", ".add-discount-wrapper", () => {
          var _a6;
          try {
            const can_edit_discount = this.$add_discount_elem.find(".edit-discount-btn").length;
            if (!this.discount_field || can_edit_discount)
              this.show_discount_control();
          } catch (error) {
            (_a6 = this.logger) == null ? void 0 : _a6.error("Discount Control", {
              message: "Failed to show discount control",
              originalError: error
            }, false);
          }
        });
        try {
          const $wrapper = $(".add-branch-wrapper");
          const posProfileName = me.settings.name;
          const branchFieldWrapper = $('<div class="branch-field"></div>');
          $wrapper.replaceWith(branchFieldWrapper);
          frappe.call({
            method: "posnext.doc_events.pos_profile.get_pos_profile_branch",
            args: {
              pos_profile_name: posProfileName
            },
            callback: function(r) {
              var _a6;
              try {
                const branch_name = r.message && r.message.branch;
                let branchField = new frappe.ui.form.ControlLink({
                  df: {
                    fieldtype: "Link",
                    options: "Branch",
                    fieldname: "branch",
                    label: "Branch",
                    placeholder: "Select Branch",
                    default: branch_name,
                    reqd: 1
                  },
                  parent: branchFieldWrapper
                });
                branchField.make();
                branchField.set_value(branch_name);
                branchField.refresh();
              } catch (error) {
                (_a6 = me.logger) == null ? void 0 : _a6.error("Branch Field Setup", {
                  message: "Failed to setup branch field",
                  originalError: error
                }, false);
              }
            },
            error: function(error) {
              var _a6;
              (_a6 = me.logger) == null ? void 0 : _a6.error("Branch Profile Fetch", {
                message: "Failed to fetch branch profile",
                originalError: error
              }, false);
            }
          });
        } catch (error) {
          (_b = this.logger) == null ? void 0 : _b.error("Branch Wrapper", {
            message: "Failed to setup branch wrapper",
            originalError: error
          }, false);
        }
        frappe.ui.form.on("Sales Invoice", "paid_amount", (frm) => {
          var _a6;
          try {
            this.update_totals_section(frm);
          } catch (error) {
            (_a6 = this.logger) == null ? void 0 : _a6.error("Paid Amount Update", {
              message: "Failed to update totals section on paid amount change",
              originalError: error
            }, false);
          }
        });
        (_c = this.logger) == null ? void 0 : _c.info("Event Binding", "All cart events bound successfully");
      } catch (error) {
        (_d = this.logger) == null ? void 0 : _d.error("Event Binding", {
          message: "Critical error during event binding",
          originalError: error
        }, true);
        frappe.msgprint(__("Failed to initialize cart events. Please refresh the page."));
      }
    }
    create_mobile_dialog(callback) {
      const me = this;
      let dialog = new frappe.ui.Dialog({
        title: "Enter Mobile Number",
        fields: [
          {
            label: "Mobile Number",
            fieldname: "mobile_number",
            fieldtype: "Data",
            reqd: 1
          },
          {
            label: "",
            fieldname: "mobile_number_numpad",
            fieldtype: "HTML",
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
          }
        ],
        size: "small",
        primary_action_label: "Continue",
        primary_action: callback
      });
      const numpad = dialog.wrapper.find(".custom-numpad");
      const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "zero"];
      numbers.forEach((num) => {
        numpad.on("click", "." + num, function() {
          const current_value = dialog.get_value("mobile_number") || "";
          dialog.set_value("mobile_number", current_value + $(this).text());
        });
      });
      numpad.on("click", ".clear", () => dialog.set_value("mobile_number", ""));
      numpad.on("click", ".delete", function() {
        const current_value = dialog.get_value("mobile_number") || "";
        dialog.set_value("mobile_number", current_value.slice(0, -1));
      });
      return dialog;
    }
    show_secret_key_popup_for_hold() {
      const me = this;
      const secret_dialog = me.create_secret_dialog(function(values) {
        const frm = me.events.get_frm();
        const invoice_name = frm.doc.name;
        console.log("Secret key entered, validating and saving...");
        if (!me.events.save_draft_invoice) {
          console.error("save_draft_invoice is undefined");
          frappe.show_alert({
            message: __("Save draft invoice function is not available. Please check POS configuration."),
            indicator: "red"
          });
          secret_dialog.hide();
          return;
        }
        if (invoice_name && !frm.doc.__islocal) {
          console.log("Validating permission for existing invoice:", invoice_name);
          frappe.call({
            method: "posnext.posnext.page.posnext.point_of_sale.check_edit_permission",
            args: {
              invoice_name,
              secret_key: values["secret_key"]
            },
            freeze: true,
            freeze_message: "Validating Secret Key...",
            callback: function(r) {
              if (r.message.can_edit) {
                console.log("Permission validated, saving existing invoice");
                const invoice_info = {
                  name: frm.doc.name,
                  customer: frm.doc.customer,
                  created_by_name: r.message.created_by_name || frappe.session.user
                };
                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "created_by_name", invoice_info.created_by_name);
                Promise.resolve(me.events.save_draft_invoice()).then(() => {
                  console.log("Existing draft saved successfully:", invoice_info.name);
                  secret_dialog.hide();
                  frappe.show_alert({
                    message: __("Invoice {0} held successfully by {1}", [invoice_info.name, invoice_info.created_by_name]),
                    indicator: "green"
                  });
                  frappe.utils.play_sound("submit");
                  setTimeout(() => {
                    console.log("About to call handle_successful_hold with delay");
                    me.handle_successful_hold(invoice_info.name, invoice_info.created_by_name);
                  }, 500);
                }).catch((error) => {
                  console.error("Error saving existing draft:", error);
                  frappe.show_alert({
                    message: __("Failed to save draft invoice: {0}", [error.message]),
                    indicator: "red"
                  });
                  secret_dialog.hide();
                });
              } else {
                frappe.show_alert({
                  message: __(`You did not create this invoice, hence you cannot edit it. Only the creator (${r.message.created_by_name}) can edit it.`),
                  indicator: "red"
                });
                secret_dialog.hide();
              }
            }
          });
        } else {
          console.log("Validating secret key for new invoice");
          frappe.call({
            method: "posnext.posnext.page.posnext.point_of_sale.get_user_name_from_secret_key",
            args: { secret_key: values["secret_key"] },
            freeze_message: "Validating Secret Key...",
            callback: function(r) {
              if (r.message) {
                const created_by_name = r.message;
                console.log("Secret key validated, saving new invoice");
                const invoice_info = {
                  name: frm.doc.name,
                  customer: frm.doc.customer,
                  created_by_name
                };
                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "created_by_name", created_by_name);
                Promise.resolve(me.events.save_draft_invoice()).then(() => {
                  console.log("New draft saved successfully:", invoice_info.name);
                  secret_dialog.hide();
                  frappe.show_alert({
                    message: __("Invoice {0} held successfully by {1}", [invoice_info.name, invoice_info.created_by_name]),
                    indicator: "green"
                  });
                  frappe.utils.play_sound("submit");
                  setTimeout(() => {
                    console.log("About to call handle_successful_hold with delay");
                    me.handle_successful_hold(invoice_info.name, invoice_info.created_by_name);
                  }, 500);
                }).catch((error) => {
                  console.error("Error saving new draft:", error);
                  frappe.show_alert({
                    message: __("Failed to save draft invoice: {0}", [error.message]),
                    indicator: "red"
                  });
                  secret_dialog.hide();
                });
              } else {
                frappe.show_alert({
                  message: __("Invalid secret key"),
                  indicator: "red"
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
        title: "Enter Secret Key",
        fields: [
          {
            label: "Secret Key",
            fieldname: "secret_key",
            fieldtype: "Password",
            reqd: 1
          },
          {
            label: "",
            fieldname: "secret_key_numpad",
            fieldtype: "HTML",
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
          }
        ],
        size: "small",
        primary_action_label: "Continue",
        primary_action: callback
      });
      const numpad = dialog.wrapper.find(".custom-numpad");
      const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "zero"];
      numbers.forEach((num) => {
        numpad.on("click", "." + num, function() {
          const current_value = dialog.get_value("secret_key") || "";
          dialog.set_value("secret_key", current_value + $(this).text());
        });
      });
      numpad.on("click", ".clear", () => dialog.set_value("secret_key", ""));
      numpad.on("click", ".delete", function() {
        const current_value = dialog.get_value("secret_key") || "";
        dialog.set_value("secret_key", current_value.slice(0, -1));
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
        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer", mobile_number);
        await frm.script_manager.trigger("customer", frm.doc.doctype, frm.doc.name);
        await me.fetch_customer_details(mobile_number);
        me.events.customer_details_updated(me.customer_info);
        me.update_customer_section();
        if (next_action)
          await next_action(mobile_number);
      } catch (error) {
        frappe.show_alert({ message: __("Failed to process customer"), indicator: "red" });
        throw error;
      }
    }
    async handle_successful_hold(invoice_name, creator_name) {
      console.log("handle_successful_hold called with:", invoice_name, creator_name);
      try {
        console.log("Opening order list to show held invoice...");
        if (this.$component && this.$component.length) {
          this.$component.css("display", "none");
        }
        await this.events.toggle_recent_order();
        console.log("Order list opened successfully");
        setTimeout(() => {
          frappe.show_alert({
            message: __('Find your held invoice "{0}" in the order list', [invoice_name]),
            indicator: "blue"
          });
        }, 1e3);
      } catch (error) {
        console.error("Error in handle_successful_hold:", error);
        frappe.show_alert({
          message: __("Invoice held successfully, but error opening order list: {0}", [error.message]),
          indicator: "orange"
        });
      }
    }
    attach_shortcuts() {
      for (let row of this.number_pad.keys) {
        for (let btn of row) {
          if (typeof btn !== "string")
            continue;
          let shortcut_key = `ctrl+${frappe.scrub(String(btn))[0]}`;
          if (btn === "Delete")
            shortcut_key = "ctrl+backspace";
          if (btn === "Remove")
            shortcut_key = "shift+ctrl+backspace";
          if (btn === ".")
            shortcut_key = "ctrl+>";
          const fieldname = this.number_pad.fieldnames[btn] ? this.number_pad.fieldnames[btn] : typeof btn === "string" ? frappe.scrub(btn) : btn;
          let shortcut_label = shortcut_key.split("+").map(frappe.utils.to_title_case).join("+");
          shortcut_label = frappe.utils.is_mac() ? shortcut_label.replace("Ctrl", "\u2318") : shortcut_label;
          this.$numpad_section.find(`.numpad-btn[data-button-value="${fieldname}"]`).attr("title", shortcut_label);
          frappe.ui.keys.on(`${shortcut_key}`, () => {
            const cart_is_visible = this.$component.is(":visible");
            if (cart_is_visible && this.item_is_selected && this.$numpad_section.is(":visible")) {
              this.$numpad_section.find(`.numpad-btn[data-button-value="${fieldname}"]`).click();
            }
          });
        }
      }
      const ctrl_label = frappe.utils.is_mac() ? "\u2318" : "Ctrl";
      this.$component.find(".checkout-btn").attr("title", `${ctrl_label}+Enter`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+enter",
        action: () => this.$component.find(".checkout-btn").click(),
        condition: () => this.$component.is(":visible") && !this.$totals_section.find(".edit-cart-btn").is(":visible"),
        description: __("Checkout Order / Submit Order / New Order"),
        ignore_inputs: true,
        page: cur_page.page.page
      });
      this.$component.find(".edit-cart-btn").attr("title", `${ctrl_label}+E`);
      frappe.ui.keys.on("ctrl+e", () => {
        const item_cart_visible = this.$component.is(":visible");
        const checkout_btn_invisible = !this.$totals_section.find(".checkout-btn").is("visible");
        if (item_cart_visible && checkout_btn_invisible) {
          this.$component.find(".edit-cart-btn").click();
        }
      });
      this.$component.find(".add-discount-wrapper").attr("title", `${ctrl_label}+D`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+d",
        action: () => this.$component.find(".add-discount-wrapper").click(),
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
        this.$cart_container.find(".cart-item-wrapper").css("background-color", "");
      } else {
        $cart_item.css("background-color", "var(--control-bg)");
        this.item_is_selected = true;
        this.$cart_container.find(".cart-item-wrapper").not(item).css("background-color", "");
      }
    }
    make_customer_selector() {
      var _a5, _b, _c, _d, _e, _f, _g, _h;
      try {
        (_a5 = this.logger) == null ? void 0 : _a5.info("Customer Selector", "Creating customer selector component");
        if (!this.validate_element(this.$customer_section, "Customer section")) {
          throw new Error("Customer section not available");
        }
        const CONSTANTS = posnext.PointOfSale.ItemCart.CONSTANTS;
        if (!CONSTANTS || !CONSTANTS.FIELD_LABELS) {
          console.warn("Constants not available, using fallback values");
        }
        this.$customer_section.html(`
				<div class="customer-field"></div>
			`);
        const me = this;
        const query = { query: "posnext.controllers.queries.customer_query" };
        const allowed_customer_group = this.allowed_customer_groups || [];
        if (allowed_customer_group.length) {
          query.filters = {
            customer_group: ["in", allowed_customer_group]
          };
        }
        const customer_field_container = this.$customer_section.find(".customer-field");
        if (!customer_field_container.length) {
          (_b = this.logger) == null ? void 0 : _b.error("Customer Selector", {
            message: "Customer field container not found after HTML insertion"
          }, false);
          throw new Error("Customer field container not found");
        }
        if (!frappe.ui || !frappe.ui.form || !frappe.ui.form.make_control) {
          (_c = this.logger) == null ? void 0 : _c.error("Customer Selector", {
            message: "Frappe UI components not available"
          }, false);
          throw new Error("Frappe UI components not available");
        }
        const customerLabel = CONSTANTS && CONSTANTS.FIELD_LABELS && CONSTANTS.FIELD_LABELS.CUSTOMER ? CONSTANTS.FIELD_LABELS.CUSTOMER : "Customer";
        try {
          this.customer_field = frappe.ui.form.make_control({
            df: {
              label: __(customerLabel),
              fieldtype: "Link",
              options: "Customer",
              placeholder: __("Search by customer name, phone, email."),
              read_only: this.mobile_number_based_customer,
              get_query: () => {
                var _a6;
                try {
                  return query;
                } catch (error) {
                  (_a6 = me.logger) == null ? void 0 : _a6.error("Customer Query", {
                    message: "Error building customer query",
                    originalError: error
                  }, false);
                  return {};
                }
              },
              onchange: function() {
                var _a6, _b2, _c2;
                try {
                  if (this.value) {
                    (_a6 = me.logger) == null ? void 0 : _a6.info("Customer Change", `Customer selected: ${this.value}`);
                    const frm = me.events.get_frm();
                    if (!frm) {
                      (_b2 = me.logger) == null ? void 0 : _b2.error("Customer Change", {
                        message: "Form reference not found"
                      }, false);
                      return;
                    }
                    frappe.dom.freeze();
                    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer", this.value);
                    frm.script_manager.trigger("customer", frm.doc.doctype, frm.doc.name).then(() => {
                      frappe.run_serially([
                        () => me.fetch_customer_details(this.value),
                        () => me.events.customer_details_updated(me.customer_info),
                        () => me.update_customer_section(),
                        () => me.update_totals_section(),
                        () => frappe.dom.unfreeze()
                      ]).catch((error) => {
                        var _a7;
                        (_a7 = me.logger) == null ? void 0 : _a7.error("Customer Update Chain", {
                          message: "Error in customer update sequence",
                          originalError: error
                        }, false);
                        frappe.dom.unfreeze();
                      });
                    }).catch((error) => {
                      var _a7;
                      (_a7 = me.logger) == null ? void 0 : _a7.error("Customer Trigger", {
                        message: "Error triggering customer script",
                        originalError: error
                      }, false);
                      frappe.dom.unfreeze();
                    });
                  }
                } catch (error) {
                  (_c2 = me.logger) == null ? void 0 : _c2.error("Customer Field Change", {
                    message: "Error in customer field onchange handler",
                    originalError: error
                  }, false);
                  frappe.dom.unfreeze();
                }
              }
            },
            parent: customer_field_container,
            render_input: true
          });
        } catch (controlError) {
          (_d = this.logger) == null ? void 0 : _d.error("Customer Control Creation", {
            message: "Failed to create customer field control",
            originalError: controlError
          }, false);
          throw controlError;
        }
        if (!this.customer_field) {
          (_e = this.logger) == null ? void 0 : _e.error("Customer Selector", {
            message: "Customer field control is null after creation"
          }, false);
          throw new Error("Customer field control creation failed");
        }
        try {
          this.customer_field.toggle_label(false);
        } catch (labelError) {
          (_f = this.logger) == null ? void 0 : _f.error("Customer Field Label", {
            message: "Error configuring customer field label",
            originalError: labelError
          }, false);
        }
        (_g = this.logger) == null ? void 0 : _g.info("Customer Selector", "Customer selector created successfully");
      } catch (error) {
        (_h = this.logger) == null ? void 0 : _h.error("Customer Selector", {
          message: "Critical error creating customer selector",
          originalError: error
        }, true);
        frappe.msgprint(__("Failed to initialize customer selector. Please refresh the page."));
        throw error;
      }
    }
    fetch_customer_details(customer) {
      if (customer) {
        return new Promise((resolve) => {
          frappe.db.get_value("Customer", customer, ["email_id", "mobile_no", "image", "loyalty_program"]).then(({ message }) => {
            const { loyalty_program } = message;
            if (loyalty_program) {
              frappe.call({
                method: "erpnext.accounts.doctype.loyalty_program.loyalty_program.get_loyalty_program_details_with_points",
                args: { customer, loyalty_program, "silent": true },
                callback: (r) => {
                  const { loyalty_points, conversion_factor } = r.message;
                  if (!r.exc) {
                    this.customer_info = __spreadProps(__spreadValues({}, message), { customer, loyalty_points, conversion_factor });
                    resolve();
                  }
                }
              });
            } else {
              this.customer_info = __spreadProps(__spreadValues({}, message), { customer });
              resolve();
            }
          });
        });
      } else {
        return new Promise((resolve) => {
          this.customer_info = {};
          resolve();
        });
      }
    }
    show_discount_control() {
      this.$add_discount_elem.css({ "padding": "0px", "border": "none" });
      this.$add_discount_elem.html(
        `<div class="add-discount-field"></div>`
      );
      const me = this;
      const frm = me.events.get_frm();
      let discount = frm.doc.additional_discount_percentage;
      this.discount_field = null;
      if (me.custom_use_additional_discount_amount) {
        this.discount_field = frappe.ui.form.make_control({
          df: {
            label: __("Discount"),
            fieldtype: "Data",
            placeholder: discount ? discount : __("Enter discount amount."),
            input_class: "input-xs",
            onchange: function() {
              setTimeout(() => {
                if (flt(this.value) != 0) {
                  frappe.model.set_value(frm.doc.doctype, frm.doc.name, "discount_amount", flt(this.value));
                  me.hide_discount_control(this.value);
                } else {
                  frappe.model.set_value(frm.doc.doctype, frm.doc.name, "discount_amount", 0);
                  me.$add_discount_elem.css({
                    "border": "1px dashed var(--gray-500)",
                    "padding": "var(--padding-sm) var(--padding-md)"
                  });
                  me.$add_discount_elem.html(`${me.get_discount_icon()} ${__("Add Discount")}`);
                  me.discount_field = void 0;
                }
              }, 3e3);
            }
          },
          parent: this.$add_discount_elem.find(".add-discount-field"),
          render_input: true
        });
      } else {
        this.discount_field = frappe.ui.form.make_control({
          df: {
            label: __("Discount"),
            fieldtype: "Data",
            placeholder: discount ? discount + "%" : __("Enter discount percentage."),
            input_class: "input-xs",
            onchange: function() {
              setTimeout(() => {
                if (flt(this.value) != 0) {
                  frappe.model.set_value(frm.doc.doctype, frm.doc.name, "additional_discount_percentage", flt(this.value));
                  me.hide_discount_control(this.value);
                } else {
                  frappe.model.set_value(frm.doc.doctype, frm.doc.name, "additional_discount_percentage", 0);
                  me.$add_discount_elem.css({
                    "border": "1px dashed var(--gray-500)",
                    "padding": "var(--padding-sm) var(--padding-md)"
                  });
                  me.$add_discount_elem.html(`${me.get_discount_icon()} ${__("Add Discount")}`);
                  me.discount_field = void 0;
                }
              }, 3e3);
            }
          },
          parent: this.$add_discount_elem.find(".add-discount-field"),
          render_input: true
        });
      }
      this.discount_field.toggle_label(false);
      this.discount_field.set_focus();
    }
    hide_discount_control(discount) {
      if (!discount) {
        this.$add_discount_elem.css({ "padding": "0px", "border": "none" });
        this.$add_discount_elem.html(
          `<div class="add-discount-field"></div>`
        );
      } else {
        this.$add_discount_elem.css({
          "border": "1px dashed var(--dark-green-500)",
          "padding": "var(--padding-sm) var(--padding-md)"
        });
        if (this.custom_use_additional_discount_amount) {
          this.$add_discount_elem.html(
            `<div class="edit-discount-btn">
						${this.get_discount_icon()} ${__("Additional")}&nbsp;${String(discount).bold()}&nbsp;${this.events.get_frm().doc.currency} ${__("discount applied")}
					</div>`
          );
        } else {
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
      const { customer, email_id = "", mobile_no = "", image } = this.customer_info || {};
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
        if (this.mobile_number_based_customer) {
          this.$customer_section.find(".reset-customer-btn").css("display", "none");
        } else {
          this.$customer_section.find(".reset-customer-btn").css("display", "flex");
        }
      } else {
        this.reset_customer_selector();
      }
      function get_customer_description() {
        if (!email_id && !mobile_no) {
          return `<div class="customer-desc">${__("Click to add email / phone")}</div>`;
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
      if (!frm)
        frm = this.events.get_frm();
      frm.cscript.calculate_taxes_and_totals();
      this.render_net_total(frm.doc.items);
      this.render_total_item_qty(frm.doc.items);
      let grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? frm.doc.grand_total : frm.doc.rounded_total;
      if (!frm.doc.items || frm.doc.items.length === 0) {
        if (Math.abs(grand_total) != 5e-3) {
          grand_total = 0;
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
      this.$totals_section.find(".net-total-container").html(
        `<div>${__("Net Total")}</div><div>${format_currency(total_net_amount, currency)}</div>`
      );
      this.$numpad_section.find(".numpad-net-total").html(
        `<div>${__("Net Total")}: <span>${format_currency(total_net_amount, currency)}</span></div>`
      );
    }
    render_total_item_qty(items) {
      var total_item_qty = 0;
      items.map((item) => {
        total_item_qty = total_item_qty + item.qty;
      });
      this.$totals_section.find(".item-qty-total-container").html(
        `<div>${__("Total Quantity")}</div><div>${total_item_qty}</div>`
      );
      this.$numpad_section.find(".numpad-item-qty-total").html(
        `<div>${__("Total Quantity")}: <span>${total_item_qty}</span></div>`
      );
    }
    render_grand_total(value) {
      const currency = this.events.get_frm().doc.currency;
      this.$totals_section.find(".grand-total-container").html(
        `<div>${__("Grand Total")}</div><div>${format_currency(value, currency)}</div>`
      );
      this.$numpad_section.find(".numpad-grand-total").html(
        `<div>${__("Grand Total")}: <span>${format_currency(value, currency)}</span></div>`
      );
    }
    render_taxes(taxes) {
      if (taxes && taxes.length) {
        const currency = this.events.get_frm().doc.currency;
        const taxes_html = taxes.map((t) => {
          if (t.tax_amount_after_discount_amount == 0)
            return;
          const description = /[0-9]+/.test(t.description) ? t.description : t.rate != 0 ? `${t.description} @ ${t.rate}%` : t.description;
          return `<div class="tax-row">
					<div class="tax-label">${description}</div>
					<div class="tax-value">${format_currency(t.tax_amount_after_discount_amount, currency)}</div>
				</div>`;
        }).join("");
        this.$totals_section.find(".taxes-container").css("display", "flex").html(taxes_html);
      } else {
        this.$totals_section.find(".taxes-container").css("display", "none").html("");
      }
    }
    get_cart_item({ name }) {
      const item_selector = `.cart-item-wrapper[data-row-name="${escape(name)}"]`;
      return this.$cart_items_wrapper.find(item_selector);
    }
    get_item_from_frm(item) {
      const doc = this.events.get_frm().doc;
      return doc.items.find((i) => i.name == item.name);
    }
    update_item_html(item, remove_item) {
      const $item = this.get_cart_item(item);
      if (remove_item) {
        $item && $item.next().remove() && $item.remove();
      } else {
        const item_row = this.get_item_from_frm(item);
        this.render_cart_item(item_row, $item);
      }
      const no_of_cart_items = this.$cart_items_wrapper.find(".cart-item-wrapper").length;
      this.highlight_checkout_btn(true);
      this.update_empty_cart_section(no_of_cart_items);
    }
    render_cart_item(item_data, $item_to_update) {
      const currency = this.events.get_frm().doc.currency;
      const me = this;
      if (!$item_to_update.length) {
        this.$cart_items_wrapper.prepend(
          `<div class="cart-item-wrapper" data-row-name="${escape(item_data.name)}"></div>
				<div class="seperator"></div>`
        );
        $item_to_update = this.get_cart_item(item_data);
      }
      var item_html = `${get_item_image_html()}`;
      if (me.custom_use_discount_percentage && !me.custom_use_discount_amount) {
        item_html += `<div class="item-name-desc" style="flex: 2.8">`;
      }
      if (me.custom_use_discount_amount && !me.custom_use_discount_percentage) {
        item_html += `<div class="item-name-desc" style="flex: 2.8">`;
      }
      if (me.custom_use_discount_amount && me.custom_use_discount_percentage) {
        item_html += `<div class="item-name-desc" style="flex: 2.5">`;
      }
      if (!me.custom_use_discount_amount && !me.custom_use_discount_percentage) {
        item_html += `<div class="item-name-desc" style="flex: 3.5">`;
      }
      item_html += `<div class="item-name" style="flex: 4; white-space: normal; word-wrap: break-word; overflow: visible; line-height: 1.2;">
					${item_data.item_name}
				</div>
				${get_description_html(item_data)}
				${get_item_barcode(item_data)}
			</div>
			${get_rate_discount_html()}`;
      $item_to_update.html(item_html);
      if (me.custom_edit_rate) {
        this[item_data.item_code + "_qty"] = frappe.ui.form.make_control({
          df: {
            fieldname: "qty",
            fieldtype: "Float",
            onchange: function() {
              me.events.form_updated(item_data, "qty", this.value);
            }
          },
          parent: $item_to_update.find(`.item-qty`),
          render_input: true
        });
        var uoms = [];
        if (item_data.custom_item_uoms) {
          uoms = item_data.custom_item_uoms.split(",");
        } else if (item_data.uom) {
          uoms = [item_data.uom];
        }
        if (me.custom_show_uom_in_cart) {
          this[item_data.item_code + "_uom"] = frappe.ui.form.make_control({
            df: {
              fieldname: "uom",
              fieldtype: "Select",
              onchange: function() {
                me.events.form_updated(item_data, "uom", this.value);
              }
            },
            parent: $item_to_update.find(`.item-uom`),
            render_input: true
          });
        }
        if (me.show_batch_in_cart) {
          this[item_data.item_code + "_batch"] = frappe.ui.form.make_control({
            df: {
              fieldname: "batch",
              fieldtype: "Link",
              options: "Batch",
              get_query: function() {
                return {
                  filters: {
                    item: item_data.item_code
                  }
                };
              },
              onchange: function() {
                me.events.form_updated(item_data, "batch_no", this.value);
              }
            },
            parent: $item_to_update.find(`.item-batch`),
            render_input: true
          });
        }
        this[item_data.item_code + "_rate"] = frappe.ui.form.make_control({
          df: {
            fieldname: "rate",
            fieldtype: "Float",
            read_only: !me.allow_rate_change,
            onchange: function() {
              me.events.form_updated(item_data, "rate", this.value);
            }
          },
          parent: $item_to_update.find(`.item-rate`),
          render_input: true
        });
        if (me.custom_use_discount_percentage) {
          this[item_data.item_code + "_discount"] = frappe.ui.form.make_control({
            df: {
              fieldname: "discount",
              fieldtype: "Float",
              onchange: function() {
                me.events.form_updated(item_data, "discount_percentage", this.value);
              }
            },
            parent: $item_to_update.find(`.item-rate-discount`),
            render_input: true
          });
        }
        if (me.custom_use_discount_amount) {
          this[item_data.item_code + "_discount_amount"] = frappe.ui.form.make_control({
            df: {
              fieldname: "discount_amount",
              fieldtype: "Currency",
              onchange: function() {
                me.events.form_updated(item_data, "discount_amount", this.value);
              }
            },
            parent: $item_to_update.find(`.item-rate-discount-amount`),
            render_input: true
          });
        }
        if (this.custom_show_incoming_rate) {
          this[item_data.item_code + "_incoming_rate"] = frappe.ui.form.make_control({
            df: {
              fieldname: "incoming_rate",
              fieldtype: "Float",
              read_only: 1
            },
            parent: $item_to_update.find(`.item-incoming-rate`),
            render_input: true
          });
        }
        if (this.custom_show_logical_rack_in_cart) {
          this[item_data.item_code + "_logical_rack"] = frappe.ui.form.make_control({
            df: {
              fieldname: "logical_rack",
              fieldtype: "Data",
              read_only: 1
            },
            parent: $item_to_update.find(`.item-logical-rack`),
            render_input: true
          });
        }
        if (this.custom_show_last_customer_rate) {
          this[item_data.item_code + "_last_customer_rate"] = frappe.ui.form.make_control({
            df: {
              fieldname: "last_customer_rate",
              fieldtype: "Float",
              read_only: 1
            },
            parent: $item_to_update.find(`.item-last-customer-rate`),
            render_input: true
          });
        }
        this[item_data.item_code + "_amount"] = frappe.ui.form.make_control({
          df: {
            fieldname: "amount",
            fieldtype: "Float",
            read_only: 1
          },
          parent: $item_to_update.find(`.item-rate-amount`),
          render_input: true
        });
        var delete_button = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ff0000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 11V17" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M14 11V17" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M4 7H20" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="#ff0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`;
        var remove_button = frappe.ui.form.make_control({
          df: {
            fieldname: "remove",
            fieldtype: "Button",
            label: delete_button
          },
          parent: $item_to_update.find(`.remove-button`),
          render_input: true
        });
        remove_button.refresh();
        $(remove_button.$input).on("click", function() {
          me.events.remove_item_from_cart(item_data);
          me.prev_action = void 0;
          me.toggle_item_highlight();
          me.events.numpad_event(void 0, "remove");
        });
        this[item_data.item_code + "_qty"].set_value(item_data.qty);
        if (me.custom_show_uom_in_cart) {
          this[item_data.item_code + "_uom"].df.options = uoms;
          this[item_data.item_code + "_uom"].set_value(item_data.uom);
          this[item_data.item_code + "_uom"].refresh();
        }
        if (me.show_batch_in_cart) {
          this[item_data.item_code + "_batch"].set_value(item_data.batch_no);
        }
        this[item_data.item_code + "_amount"].set_value(item_data.amount);
        this[item_data.item_code + "_rate"].set_value(item_data.rate);
        if (me.custom_use_discount_percentage) {
          this[item_data.item_code + "_discount"].set_value(item_data.discount_percentage);
        }
        if (me.custom_use_discount_amount) {
          this[item_data.item_code + "_discount_amount"].set_value(item_data.discount_amount);
        }
        if (me.custom_show_incoming_rate) {
          this[item_data.item_code + "_incoming_rate"].set_value(item_data.custom_valuation_rate);
        }
        if (me.custom_show_logical_rack_in_cart) {
          this[item_data.item_code + "_logical_rack"].set_value(item_data.custom_logical_rack);
        }
        if (me.custom_show_last_customer_rate) {
          if (me.customer_info.customer) {
            frappe.xcall("posnext.posnext.page.posnext.point_of_sale.get_lcr", {
              "customer": me.customer_info.customer,
              "item_code": item_data.item_code
            }).then((d) => {
              this[item_data.item_code + "_last_customer_rate"].set_value(d);
            });
          }
        }
        if (me.custom_show_uom_in_cart) {
          frappe.xcall("posnext.posnext.page.posnext.point_of_sale.get_uoms", {
            "item_code": item_data.item_code
          }).then((d) => {
            this[item_data.item_code + "_uom"].df.options = d;
            this[item_data.item_code + "_uom"].refresh();
          });
        }
      }
      set_dynamic_rate_header_width();
      function set_dynamic_rate_header_width() {
        const rate_cols = Array.from(me.$cart_items_wrapper.find(".item-rate-amount"));
        me.$cart_header.find(".rate-amount-header").css("width", "");
        me.$cart_items_wrapper.find(".item-rate-amount").css("width", "");
        let max_width = rate_cols.reduce((max_width2, elm) => {
          if ($(elm).width() > max_width2)
            max_width2 = $(elm).width();
          return max_width2;
        }, 0);
        max_width += 1;
        if (max_width == 1)
          max_width = "";
        me.$cart_header.find(".rate-amount-header").css("width", max_width);
        me.$cart_items_wrapper.find(".item-rate-amount").css("width", max_width);
      }
      function get_rate_discount_html() {
        if (me.custom_edit_rate) {
          if (item_data.rate && item_data.amount && item_data.rate !== item_data.amount) {
            var html = `
                        <div class="item-qty-rate" style="flex: 6">
                        <div class="item-qty" style="flex: 1"></div>`;
            if (me.custom_show_uom_in_cart) {
              html += `<div class="item-uom" style="flex: 1;text-align: left"></div>`;
            }
            if (me.show_batch_in_cart) {
              html += `<div class="item-batch" style="flex: 1;text-align: left"></div>`;
            }
            html += `<div class="item-rate" style="flex: 1;"></div>`;
            if (me.custom_use_discount_percentage) {
              html += `<div class="item-rate-discount" style="flex: 1;text-align: left"></div>`;
            }
            if (me.custom_use_discount_amount) {
              html += `<div class="item-rate-discount-amount" style="flex: 1;text-align: left"></div>`;
            }
            if (me.custom_show_incoming_rate) {
              html += `<div class="item-incoming-rate" style="flex: 1"></div>`;
            }
            if (me.custom_show_logical_rack_in_cart) {
              html += `<div class="item-logical-rack" style="flex: 1"></div>`;
            }
            if (me.custom_show_last_customer_rate) {
              html += `<div class="item-last-customer-rate" style="flex: 1"></div>`;
            }
            html += `<div class="item-rate-amount" style="flex: 1"></div>
							<div class="remove-button" style="margin-top:15px;display: flex;justify-content: center;align-items: center;"></div>
                        </div>`;
            return html;
          } else {
            var html = `
                        <div class="item-qty-rate" style="flex: 6">
                        <div class="item-qty" style="flex: 1"></div>`;
            if (me.custom_show_uom_in_cart) {
              html += `<div class="item-uom" style="flex: 1;text-align: left"></div>`;
            }
            if (me.show_batch_in_cart) {
              html += `<div class="item-batch" style="flex: 1;text-align: left"></div>`;
            }
            html += `<div class="item-rate" style="flex: 1;"></div>`;
            if (me.custom_use_discount_percentage) {
              html += `<div class="item-rate-discount" style="flex: 1;text-align: left"></div>`;
            }
            if (me.custom_use_discount_amount) {
              html += `<div class="item-rate-discount-amount" style="flex: 1;text-align: left"></div>`;
            }
            if (me.custom_show_incoming_rate) {
              html += `<div class="item-incoming-rate" style="flex: 1"></div>`;
            }
            if (me.custom_show_logical_rack_in_cart) {
              html += `<div class="item-logical-rack" style="flex: 1"></div>`;
            }
            if (me.custom_show_last_customer_rate) {
              html += `<div class="item-last-customer-rate" style="flex: 1"></div>`;
            }
            html += `<div class="item-rate-amount" style="flex: 1"></div>
                            <div class="remove-button" style="margin-top:15px;display: flex;justify-content: center;align-items: center;"></div>
                        </div>`;
            return html;
          }
        } else {
          if (item_data.rate && item_data.amount && item_data.rate !== item_data.amount) {
            return `
                        <div class="item-qty-rate" style="flex: 4" > 
                            <div class="item-qty" style="flex: 1"><span>${item_data.qty || 0}</span></div>
                            <div class="item-qty" style="flex: 1"><span> ${item_data.uom}</span></div>
							<div class="item-qty" style="flex: 1"><span> ${item_data.batch}</span></div>
                            <div class="item-rate-amount" style="flex: 1">
                                <div class="item-rate">${parseFloat(item_data.amount).toFixed(2)}</div>
                                <div class="item-amount">${parseFloat(item_data.rate).toFixed(2)}</div>
                            </div>
                        </div>`;
          } else {
            return `
                        <div class="item-qty-rate" style="flex: 4" >
                            <div class="item-qty" style="flex: 1" ><span>${item_data.qty || 0}</span></div>
                            <div class="item-qty" style="flex: 1"><span> ${item_data.uom}</span></div>
							<div class="item-qty" style="flex: 1"><span> ${item_data.batch}</span></div>
                            <div class="item-rate-amount" style="flex: 1">
                                <div class="item-rate">${parseFloat(item_data.rate).toFixed(2)}</div>
                            </div>
                        </div>`;
          }
        }
      }
      function get_description_html(item_data2) {
        const hide_description = me.custom_show_item_discription;
        if (hide_description) {
          if (item_data2.description.indexOf("<div>") != -1) {
            try {
              item_data2.description = $(item_data2.description).text();
            } catch (error) {
              item_data2.description = item_data2.description.replace(/<div>/g, " ").replace(/<\/div>/g, " ").replace(/ +/g, " ");
            }
          }
          item_data2.description = frappe.ellipsis(item_data2.description, 45);
          return `<div class="item-desc">${item_data2.description}</div>`;
        }
        return ``;
      }
      function get_item_barcode(item_data2) {
        const show_barcode = me.custom_show_item_barcode;
        if (!show_barcode) {
          return "";
        }
        const barcode_placeholder_id = `barcode-${item_data2.item_code.replace(/[^a-zA-Z0-9]/g, "-")}`;
        frappe.call({
          method: "posnext.posnext.page.posnext.point_of_sale.get_barcodes",
          args: {
            item_code: item_data2.item_code
          },
          callback: function(response) {
            if (response.message && response.message.length > 0) {
              const html = response.message.map((b) => `
							<div class="item-barcode" style="font-size: 12px; color: #888;">
								${b.barcode}
							</div>
						`).join("");
              $(`#${barcode_placeholder_id}`).html(html);
            }
          }
        });
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
      const item_abbr = $($img).attr("alt");
      $($img).parent().replaceWith(`<div class="item-image item-abbr">${item_abbr}</div>`);
    }
    update_selector_value_in_cart_item(selector, value, item) {
      const $item_to_update = this.get_cart_item(item);
      $item_to_update.attr(`data-${selector}`, escape(value));
    }
    toggle_checkout_btn(show_checkout) {
      if (show_checkout) {
        if (this.show_checkout_button) {
          this.$totals_section.find(".checkout-btn").css("display", "flex");
        } else {
          this.$totals_section.find(".checkout-btn").css("display", "none");
        }
        if (this.show_held_button) {
          this.$totals_section.find(".checkout-btn-held").css("display", "flex");
        } else {
          this.$totals_section.find(".checkout-btn-held").css("display", "none");
        }
        if (this.show_order_list_button) {
          this.$totals_section.find(".checkout-btn-order").css("display", "flex");
        } else {
          this.$totals_section.find(".checkout-btn-order").css("display", "none");
        }
        this.$totals_section.find(".edit-cart-btn").css("display", "none");
      } else {
        this.$totals_section.find(".checkout-btn").css("display", "none");
        this.$totals_section.find(".checkout-btn-held").css("display", "none");
        this.$totals_section.find(".checkout-btn-held").css("display", "none");
        this.$totals_section.find(".checkout-btn-order").css("display", "none");
        this.$totals_section.find(".edit-cart-btn").css("display", "flex");
      }
    }
    highlight_checkout_btn(toggle) {
      if (toggle) {
        this.$add_discount_elem.css("display", "flex");
        this.$cart_container.find(".checkout-btn").css({
          "background-color": "var(--blue-500)"
        });
        if (this.show_held_button) {
          this.$cart_container.find(".checkout-btn-held").css({
            "background-color": "var(--blue-500)"
          });
        } else {
          this.$cart_container.find(".checkout-btn-held").css({
            "background-color": "var(--blue-200)"
          });
        }
        if (this.show_order_list_button) {
          this.$cart_container.find(".checkout-btn-order").css({
            "background-color": "var(--blue-500)"
          });
        } else {
          this.$cart_container.find(".checkout-btn-order").css({
            "background-color": "var(--blue-500)"
          });
        }
      } else {
        this.$add_discount_elem.css("display", "none");
        this.$cart_container.find(".checkout-btn").css({
          "background-color": "var(--blue-200)"
        });
        this.$cart_container.find(".checkout-btn-held").css({
          "background-color": "var(--blue-200)"
        });
        this.$cart_container.find(".checkout-btn-order").css({
          "background-color": "var(--blue-500)"
        });
      }
    }
    update_empty_cart_section(no_of_cart_items) {
      const $no_item_element = this.$cart_items_wrapper.find(".no-item-wrapper");
      no_of_cart_items > 0 && $no_item_element && $no_item_element.remove() && this.$cart_header.css("display", "flex");
      no_of_cart_items === 0 && !$no_item_element.length && this.make_no_items_placeholder();
    }
    on_numpad_event($btn) {
      const current_action = $btn.attr("data-button-value");
      const action_is_field_edit = ["qty", "discount_percentage", "rate"].includes(current_action);
      const action_is_allowed = action_is_field_edit ? current_action == "rate" && this.allow_rate_change || current_action == "discount_percentage" && this.allow_discount_change || current_action == "qty" : true;
      const action_is_pressed_twice = this.prev_action === current_action;
      const first_click_event = !this.prev_action;
      const field_to_edit_changed = this.prev_action && this.prev_action != current_action;
      if (action_is_field_edit) {
        if (!action_is_allowed) {
          const label = current_action == "rate" ? "Rate".bold() : "Discount".bold();
          const message = __("Editing {0} is not allowed as per POS Profile settings", [label]);
          frappe.show_alert({
            indicator: "red",
            message
          });
          frappe.utils.play_sound("error");
          return;
        }
        if (first_click_event || field_to_edit_changed) {
          this.prev_action = current_action;
        } else if (action_is_pressed_twice) {
          this.prev_action = void 0;
        }
        this.numpad_value = "";
      } else if (current_action === "checkout") {
        this.prev_action = void 0;
        this.toggle_item_highlight();
        this.events.numpad_event(void 0, current_action);
        return;
      } else if (current_action === "remove") {
        this.prev_action = void 0;
        this.toggle_item_highlight();
        this.events.numpad_event(void 0, current_action);
        return;
      } else {
        this.numpad_value = current_action === "delete" ? this.numpad_value.slice(0, -1) : this.numpad_value + current_action;
        this.numpad_value = this.numpad_value || 0;
      }
      const first_click_event_is_not_field_edit = !action_is_field_edit && first_click_event;
      if (first_click_event_is_not_field_edit) {
        frappe.show_alert({
          indicator: "red",
          message: __("Please select a field to edit from numpad")
        });
        frappe.utils.play_sound("error");
        return;
      }
      if (flt(this.numpad_value) > 100 && this.prev_action === "discount_percentage") {
        frappe.show_alert({
          message: __("Discount cannot be greater than 100%"),
          indicator: "orange"
        });
        frappe.utils.play_sound("error");
        this.numpad_value = current_action;
      }
      this.highlight_numpad_btn($btn, current_action);
      this.events.numpad_event(this.numpad_value, this.prev_action);
    }
    highlight_numpad_btn($btn, curr_action) {
      const curr_action_is_highlighted = $btn.hasClass("highlighted-numpad-btn");
      const curr_action_is_action = ["qty", "discount_percentage", "rate", "done"].includes(curr_action);
      if (!curr_action_is_highlighted) {
        $btn.addClass("highlighted-numpad-btn");
      }
      if (this.prev_action === curr_action && curr_action_is_highlighted) {
        $btn.removeClass("highlighted-numpad-btn");
      }
      if (this.prev_action && this.prev_action !== curr_action && curr_action_is_action) {
        const prev_btn = $(`[data-button-value='${this.prev_action}']`);
        prev_btn.removeClass("highlighted-numpad-btn");
      }
      if (!curr_action_is_action || curr_action === "done") {
        setTimeout(() => {
          $btn.removeClass("highlighted-numpad-btn");
        }, 200);
      }
    }
    toggle_numpad(show) {
      if (show) {
        this.$totals_section.css("display", "none");
        this.$numpad_section.css("display", "flex");
      } else {
        this.$totals_section.css("display", "flex");
        this.$numpad_section.css("display", "none");
      }
      this.reset_numpad();
    }
    reset_numpad() {
      this.numpad_value = "";
      this.prev_action = void 0;
      this.$numpad_section.find(".highlighted-numpad-btn").removeClass("highlighted-numpad-btn");
    }
    toggle_numpad_field_edit(fieldname) {
      if (["qty", "discount_percentage", "rate"].includes(fieldname)) {
        this.$numpad_section.find(`[data-button-value="${fieldname}"]`).click();
      }
    }
    toggle_customer_info(show) {
      if (show) {
        const { customer } = this.customer_info || {};
        this.$cart_container.css("display", "none");
        this.$customer_section.css({
          "height": "100%",
          "padding-top": "0px"
        });
        this.$customer_section.find(".customer-details").html(
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
				<div class="customer-fields-container">
					<div class="email_id-field"></div>
					<div class="mobile_no-field"></div>
					<div class="loyalty_program-field"></div>
					<div class="loyalty_points-field"></div>
				</div>
				<div class="transactions-label">Recent Transactions</div>`
        );
        this.$customer_section.append(`<div class="customer-transactions"></div>`);
        if (this.mobile_number_based_customer) {
          this.$customer_section.find(".mobile_no-field").css("display", "none");
          this.$customer_section.find(".close-details-btn").css("display", "none");
        } else {
          this.$customer_section.find(".mobile_no-field").css("display", "flex");
          this.$customer_section.find(".close-details-btn").css("display", "flex");
        }
        this.render_customer_fields();
        this.fetch_customer_transactions();
      } else {
        this.$cart_container.css("display", "flex");
        this.$customer_section.css({
          "height": "",
          "padding-top": ""
        });
        this.update_customer_section();
      }
    }
    render_customer_fields() {
      const $customer_form = this.$customer_section.find(".customer-fields-container");
      const dfs = [{
        fieldname: "email_id",
        label: __("Email"),
        fieldtype: "Data",
        options: "email",
        placeholder: __("Enter customer's email")
      }, {
        fieldname: "mobile_no",
        label: __("Phone Number"),
        fieldtype: "Data",
        placeholder: __("Enter customer's phone number")
      }, {
        fieldname: "loyalty_program",
        label: __("Loyalty Program"),
        fieldtype: "Link",
        options: "Loyalty Program",
        placeholder: __("Select Loyalty Program")
      }, {
        fieldname: "loyalty_points",
        label: __("Loyalty Points"),
        fieldtype: "Data",
        read_only: 1
      }];
      const me = this;
      dfs.forEach((df) => {
        this[`customer_${df.fieldname}_field`] = frappe.ui.form.make_control({
          df: __spreadProps(__spreadValues({}, df), {
            onchange: handle_customer_field_change
          }),
          parent: $customer_form.find(`.${df.fieldname}-field`),
          render_input: true
        });
        this[`customer_${df.fieldname}_field`].set_value(this.customer_info[df.fieldname]);
      });
      function handle_customer_field_change() {
        const current_value = me.customer_info[this.df.fieldname];
        const current_customer = me.customer_info.customer;
        if (this.value && current_value != this.value && this.df.fieldname != "loyalty_points") {
          frappe.call({
            method: "posnext.posnext.page.posnext.point_of_sale.set_customer_info",
            args: {
              fieldname: this.df.fieldname,
              customer: current_customer,
              value: this.value
            },
            callback: (r) => {
              if (!r.exc) {
                me.customer_info[this.df.fieldname] = this.value;
                frappe.show_alert({
                  message: __("Customer contact updated successfully."),
                  indicator: "green"
                });
                frappe.utils.play_sound("submit");
              }
            }
          });
        }
      }
    }
    fetch_customer_transactions() {
      frappe.db.get_list("Sales Invoice", {
        filters: { customer: this.customer_info.customer, docstatus: 1 },
        fields: ["name", "grand_total", "status", "posting_date", "posting_time", "currency"],
        limit: 20
      }).then((res) => {
        const transaction_container = this.$customer_section.find(".customer-transactions");
        if (!res.length) {
          transaction_container.html(
            `<div class="no-transactions-placeholder">No recent transactions found</div>`
          );
          return;
        }
        const elapsed_time = moment(res[0].posting_date + " " + res[0].posting_time).fromNow();
        this.$customer_section.find(".customer-desc").html(`Last transacted ${elapsed_time}`);
        res.forEach((invoice) => {
          const posting_datetime = moment(invoice.posting_date + " " + invoice.posting_time).format("Do MMMM, h:mma");
          let indicator_color = {
            "Paid": "green",
            "Draft": "red",
            "Return": "gray",
            "Consolidated": "blue"
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
          );
        });
      });
    }
    attach_refresh_field_event(frm) {
      $(frm.wrapper).off("refresh-fields");
      $(frm.wrapper).on("refresh-fields", () => {
        if (frm.doc.items.length) {
          this.$cart_items_wrapper.html("");
          frm.doc.items.forEach((item) => {
            this.update_item_html(item);
          });
        }
      });
    }
    load_invoice() {
      console.log("Load invoice");
      const frm = this.events.get_frm();
      this.attach_refresh_field_event(frm);
      this.fetch_customer_details(frm.doc.customer).then(() => {
        this.events.customer_details_updated(this.customer_info);
        this.update_customer_section();
        this.$cart_items_wrapper.html("");
        if (frm.doc.items.length) {
          frm.doc.items.forEach((item) => {
            this.update_item_html(item);
          });
        } else {
          this.make_no_items_placeholder();
          this.highlight_checkout_btn(true);
        }
        this.update_totals_section(frm);
        if (frm.doc.docstatus === 1) {
          this.$totals_section.find(".checkout-btn").css("display", "none");
          this.$totals_section.find(".checkout-btn-held").css("display", "none");
          if (this.show_order_list_button) {
            this.$totals_section.find(".checkout-btn-order").css("display", "flex");
          } else {
            this.$totals_section.find(".checkout-btn-order").css("display", "none");
          }
          this.$totals_section.find(".edit-cart-btn").css("display", "none");
        } else {
          if (this.show_checkout_button) {
            this.$totals_section.find(".checkout-btn").css("display", "flex");
          } else {
            this.$totals_section.find(".checkout-btn").css("display", "none");
          }
          if (this.show_held_button) {
            this.$totals_section.find(".checkout-btn-held").css("display", "flex");
          } else {
            this.$totals_section.find(".checkout-btn-held").css("display", "none");
          }
          if (this.show_order_list_button) {
            this.$totals_section.find(".checkout-btn-order").css("display", "flex");
          } else {
            this.$totals_section.find(".checkout-btn-order").css("display", "none");
          }
          this.$totals_section.find(".edit-cart-btn").css("display", "none");
        }
        this.toggle_component(true);
      });
    }
    toggle_component(show) {
      show ? this.$component.css("display", "flex") : this.$component.css("display", "none");
    }
    show_reference_dialog(mobile_number = null) {
      const me = this;
      const dialog = new frappe.ui.Dialog({
        title: __("Enter Reference Details"),
        fields: [
          {
            fieldtype: "Data",
            label: __("Reference Number"),
            fieldname: "reference_no",
            reqd: 1
          },
          {
            fieldtype: "Data",
            label: __("Reference Name"),
            fieldname: "reference_name",
            reqd: 1
          }
        ],
        primary_action_label: __("Hold Invoice"),
        primary_action: async (values) => {
          if (mobile_number) {
            await frappe.call({
              method: "posnext.posnext.page.posnext.point_of_sale.create_customer",
              args: { customer: mobile_number },
              freeze: true,
              freeze_message: "Creating Customer...."
            });
            const frm2 = me.events.get_frm();
            await frappe.model.set_value(frm2.doc.doctype, frm2.doc.name, "customer", mobile_number);
            await frm2.script_manager.trigger("customer", frm2.doc.doctype, frm2.doc.name);
          }
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
        await frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer", mobile_number);
        await frm.script_manager.trigger("customer", frm.doc.doctype, frm.doc.name);
      }
      await this.events.save_draft_invoice();
    }
  }, __publicField(_a, "CONSTANTS", {
    CSS_CLASSES: {
      CUSTOMER_SECTION: "customer-section",
      CART_CONTAINER: "cart-container",
      CART_HEADER: "cart-header",
      CART_ITEMS_WRAPPER: "cart-items-section",
      TOTALS_SECTION: "cart-totals-section",
      NUMPAD_SECTION: "numpad-section"
    },
    FIELD_NAMES: {
      CUSTOMER: "customer",
      ADDITIONAL_DISCOUNT_PERCENTAGE: "additional_discount_percentage",
      DISCOUNT_AMOUNT: "discount_amount"
    },
    FIELD_LABELS: {
      CUSTOMER: "Customer"
    },
    MESSAGES: {
      NO_ITEMS: "No items in cart",
      INIT_ERROR: "Error initializing cart component",
      DOM_PREP_ERROR: "Error preparing DOM elements",
      CSS_OPERATION_ERROR: "CSS operation failed"
    }
  }), _a);
  document.addEventListener("keydown", function(event) {
    const activeElement = document.activeElement;
    const isInputActive = activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable;
    if (event.key === "F1" && !isInputActive) {
      event.preventDefault();
      const checkoutButton = document.querySelector(".checkout-btn");
      if (checkoutButton) {
        checkoutButton.click();
      } else {
        console.warn("Checkout button not found!");
      }
    }
    if (event.key === "F2" && !isInputActive) {
      event.preventDefault();
      const heldCheckoutButton = document.querySelector(".checkout-btn-held");
      if (heldCheckoutButton) {
        heldCheckoutButton.click();
      } else {
        console.warn("Held Checkout button not found!");
      }
    }
    if (event.key === "F3" && !isInputActive) {
      event.preventDefault();
      const orderCheckoutButton = document.querySelector(".checkout-btn-order");
      if (orderCheckoutButton) {
        orderCheckoutButton.click();
      } else {
        console.warn("Order Checkout button not found!");
      }
    }
    if (event.key === "F4" && !isInputActive) {
      event.preventDefault();
      const searchFieldButton = document.querySelector(".search-field button");
      if (searchFieldButton) {
        searchFieldButton.click();
      } else {
        console.warn("Search field button not found!");
      }
    }
  });

  // ../posnext/posnext/public/js/pos_item_details.js
  frappe.provide("posnext.PointOfSale");
  posnext.PointOfSale.ItemDetails = class {
    constructor({ wrapper, events, settings } = {}) {
      var _a5, _b;
      if (!wrapper) {
        throw new Error("ItemDetails constructor requires wrapper parameter");
      }
      if (!events) {
        throw new Error("ItemDetails constructor requires events parameter");
      }
      this.wrapper = wrapper;
      this.events = events;
      this.hide_images = (settings == null ? void 0 : settings.hide_images) || false;
      this.allow_rate_change = (settings == null ? void 0 : settings.allow_rate_change) || false;
      this.allow_discount_change = (settings == null ? void 0 : settings.allow_discount_change) || false;
      this.custom_edit_rate_and_uom = (settings == null ? void 0 : settings.custom_edit_rate_and_uom) || false;
      this.current_item = {};
      this.logger = this.createLogger();
      try {
        this.init_component();
        (_a5 = this.logger) == null ? void 0 : _a5.info("ItemDetails", "Component initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("ItemDetails", {
          message: "Failed to initialize component",
          error: (error == null ? void 0 : error.message) || "Unknown error",
          stack: error == null ? void 0 : error.stack
        });
        throw error;
      }
    }
    createLogger() {
      if (typeof console === "undefined")
        return null;
      return {
        info: (context, message) => {
          try {
            console.log(`[POS ItemDetails - ${context}] ${message}`);
          } catch (e) {
          }
        },
        error: (context, details) => {
          try {
            console.error(`[POS ItemDetails - ${context}] Error:`, details);
          } catch (e) {
          }
        },
        warn: (context, message) => {
          try {
            console.warn(`[POS ItemDetails - ${context}] Warning: ${message}`);
          } catch (e) {
          }
        }
      };
    }
    safeCss(element, property, value) {
      var _a5, _b;
      try {
        if (!element || !element.css || typeof element.css !== "function") {
          (_a5 = this.logger) == null ? void 0 : _a5.warn("CSS Operation", `Invalid element for CSS operation: ${property}`);
          return false;
        }
        if (value !== void 0) {
          element.css(property, value);
        } else {
          return element.css(property);
        }
        return true;
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("CSS Operation", {
          message: "CSS operation failed",
          property,
          value,
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
        return false;
      }
    }
    init_component() {
      var _a5, _b;
      try {
        this.prepare_dom();
        this.init_child_components();
        this.bind_events();
        this.attach_shortcuts();
        (_a5 = this.logger) == null ? void 0 : _a5.info("Component", "All components initialized successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Component", {
          message: "Failed to initialize components",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
        throw error;
      }
    }
    prepare_dom() {
      var _a5, _b;
      try {
        if (!this.wrapper || !this.wrapper.append) {
          throw new Error("Invalid wrapper element for DOM preparation");
        }
        this.wrapper.append(
          `<section class="item-details-container" id="item-details-container"></section>`
        );
        this.$component = this.wrapper.find(".item-details-container");
        if (!this.$component || this.$component.length === 0) {
          throw new Error("Failed to create item details container");
        }
        (_a5 = this.logger) == null ? void 0 : _a5.info("DOM", "DOM structure prepared successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("DOM", {
          message: "Failed to prepare DOM structure",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
        throw error;
      }
    }
    init_child_components() {
      var _a5, _b, _c;
      try {
        if (!this.$component || !this.$component.html) {
          throw new Error("Component container not available for initialization");
        }
        this.$component.html(
          `<div class="item-details-header">
					<div class="label">${__("Item Detailss")}</div>
					<div class="close-btn">
						<svg width="32" height="32" viewBox="0 0 14 14" fill="none">
							<path d="M4.93764 4.93759L7.00003 6.99998M9.06243 9.06238L7.00003 6.99998M7.00003 6.99998L4.93764 9.06238L9.06243 4.93759" stroke="#8D99A6"/>
						</svg>
					</div>
				</div>
				<div class="item-display">
					<div class="item-name-desc-price">
						<div class="item-name"></div>
						<div class="item-desc"></div>
						<div class="item-price"></div>
					</div>
					<div class="item-image"></div>
				</div>
				<div class="discount-section"></div>
				<div class="form-container"></div>
				<div class="serial-batch-container"></div>`
        );
        this.$item_name = this.$component.find(".item-name");
        this.$item_description = this.$component.find(".item-desc");
        this.$item_price = this.$component.find(".item-price");
        this.$item_image = this.$component.find(".item-image");
        this.$form_container = this.$component.find(".form-container");
        this.$dicount_section = this.$component.find(".discount-section");
        this.$serial_batch_container = this.$component.find(".serial-batch-container");
        const requiredElements = [
          { name: "item_name", element: this.$item_name },
          { name: "item_description", element: this.$item_description },
          { name: "item_price", element: this.$item_price },
          { name: "item_image", element: this.$item_image },
          { name: "form_container", element: this.$form_container }
        ];
        for (const { name, element } of requiredElements) {
          if (!element || element.length === 0) {
            (_a5 = this.logger) == null ? void 0 : _a5.warn("Child Components", `${name} element not found`);
          }
        }
        (_b = this.logger) == null ? void 0 : _b.info("Child Components", "All child components initialized");
      } catch (error) {
        (_c = this.logger) == null ? void 0 : _c.error("Child Components", {
          message: "Failed to initialize child components",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
        throw error;
      }
    }
    compare_with_current_item(item) {
      return item && item.name == this.current_item.name;
    }
    async toggle_item_details_section(item) {
      const current_item_changed = !this.compare_with_current_item(item);
      const hide_item_details = !Boolean(item) || !current_item_changed;
      if (!hide_item_details && current_item_changed || hide_item_details) {
        await this.validate_serial_batch_item();
      }
      if (!this.custom_edit_rate_and_uom) {
        this.events.toggle_item_selector(!hide_item_details);
        this.toggle_component(!hide_item_details);
      }
      if (item && current_item_changed) {
        this.doctype = item.doctype;
        this.item_meta = frappe.get_meta(this.doctype);
        this.name = item.name;
        this.item_row = item;
        this.currency = this.events.get_frm().doc.currency;
        this.current_item = item;
        this.render_dom(item);
        this.render_discount_dom(item);
        this.render_form(item);
        this.events.highlight_cart_item(item);
      } else {
        this.current_item = {};
      }
    }
    validate_serial_batch_item() {
      const doc = this.events.get_frm().doc;
      const item_row = doc.items.find((item) => item.name === this.name);
      if (!item_row)
        return;
      const serialized = item_row.has_serial_no;
      const batched = item_row.has_batch_no;
      const no_bundle_selected = !item_row.serial_and_batch_bundle;
      if (serialized && no_bundle_selected || batched && no_bundle_selected) {
        frappe.show_alert({
          message: __("Item is removed since no serial / batch no selected."),
          indicator: "orange"
        });
        frappe.utils.play_sound("cancel");
        return this.events.remove_item_from_cart();
      }
    }
    render_dom(item) {
      let { item_name, description, image, price_list_rate } = item;
      function get_description_html() {
        if (description) {
          description = description.indexOf("...") === -1 && description.length > 140 ? description.substr(0, 139) + "..." : description;
          return description;
        }
        return ``;
      }
      this.$item_name.html(item_name);
      this.$item_description.html(get_description_html());
      this.$item_price.html(format_currency(price_list_rate, this.currency));
      if (!this.hide_images && image) {
        this.$item_image.html(
          `<img
					onerror="cur_pos.item_details.handle_broken_image(this)"
					class="h-full" src="${image}"
					alt="${frappe.get_abbr(item_name)}"
					style="object-fit: cover;">`
        );
      } else {
        this.$item_image.html(`<div class="item-abbr">${frappe.get_abbr(item_name)}</div>`);
      }
    }
    handle_broken_image($img) {
      const item_abbr = $($img).attr("alt");
      $($img).replaceWith(`<div class="item-abbr">${item_abbr}</div>`);
    }
    render_discount_dom(item) {
      if (item.discount_percentage) {
        this.$dicount_section.html(
          `<div class="item-rate">${format_currency(item.price_list_rate, this.currency)}</div>
				<div class="item-discount">${item.discount_percentage}% off</div>`
        );
        this.$item_price.html(format_currency(item.rate, this.currency));
      } else {
        this.$dicount_section.html(``);
      }
    }
    render_form(item) {
      const fields_to_display = this.get_form_fields(item);
      this.$form_container.html("");
      fields_to_display.forEach((fieldname, idx) => {
        this.$form_container.append(
          `<div class="${fieldname}-control" data-fieldname="${fieldname}"></div>`
        );
        const field_meta = this.item_meta.fields.find((df) => df.fieldname === fieldname);
        fieldname === "discount_percentage" ? field_meta.label = __("Discount (%)") : "";
        const me = this;
        var uoms = [];
        frappe.db.get_doc("Item", me.current_item.item_code).then((doc) => {
          uoms = doc.uoms.map((item2) => item2.uom);
        });
        this[`${fieldname}_control`] = frappe.ui.form.make_control({
          df: __spreadProps(__spreadValues({}, field_meta), {
            onchange: function() {
              me.events.form_updated(me.current_item, fieldname, this.value);
            },
            get_query: function() {
              if (fieldname === "uom") {
                return {
                  filters: {
                    name: ["in", uoms]
                  }
                };
              }
              return;
            }
          }),
          parent: this.$form_container.find(`.${fieldname}-control`),
          render_input: true
        });
        this[`${fieldname}_control`].set_value(item[fieldname]);
      });
      this.make_auto_serial_selection_btn(item);
      this.bind_custom_control_change_event();
    }
    get_form_fields(item) {
      const fields = ["qty", "uom", "rate", "conversion_factor", "discount_percentage", "warehouse", "actual_qty", "price_list_rate"];
      if (item.has_serial_no)
        fields.push("serial_no");
      if (item.has_batch_no)
        fields.push("batch_no");
      return fields;
    }
    make_auto_serial_selection_btn(item) {
      var _a5;
      try {
        if (item.has_serial_no || item.has_batch_no) {
          const label = item.has_serial_no ? __("Select Serial No") : __("Select Batch No");
          this.$form_container.append(
            `<div class="btn btn-sm btn-secondary auto-fetch-btn">${label}</div>`
          );
          const serialControl = this.$form_container.find(".serial_no-control").find("textarea");
          if (serialControl && serialControl.length > 0) {
            this.safeCss(serialControl, "height", "6rem");
          }
        }
      } catch (error) {
        (_a5 = this.logger) == null ? void 0 : _a5.error("Serial Selection", {
          message: "Failed to create auto serial selection button",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
      }
    }
    bind_custom_control_change_event() {
      const me = this;
      if (this.rate_control) {
        this.rate_control.df.onchange = function() {
          if (this.value || flt(this.value) === 0) {
            me.events.form_updated(me.current_item, "rate", this.value).then(() => {
              const item_row = frappe.get_doc(me.doctype, me.name);
              const doc = me.events.get_frm().doc;
              me.$item_price.html(format_currency(item_row.rate, doc.currency));
              me.render_discount_dom(item_row);
            });
          }
        };
        this.rate_control.df.read_only = !this.allow_rate_change;
        this.rate_control.refresh();
      }
      if (this.discount_percentage_control && !this.allow_discount_change) {
        this.discount_percentage_control.df.read_only = 1;
        this.discount_percentage_control.refresh();
      }
      if (this.warehouse_control) {
        this.warehouse_control.df.reqd = 1;
        this.warehouse_control.df.onchange = function() {
          if (this.value) {
            me.events.form_updated(me.current_item, "warehouse", this.value).then(() => {
              me.item_stock_map = me.events.get_item_stock_map();
              const available_qty = me.item_stock_map[me.item_row.item_code][this.value][0];
              const is_stock_item = Boolean(me.item_stock_map[me.item_row.item_code][this.value][1]);
              if (available_qty === void 0) {
                me.events.get_available_stock(me.item_row.item_code, this.value).then(() => {
                  me.warehouse_control.set_value(this.value);
                });
              } else if (available_qty === 0 && is_stock_item) {
                me.warehouse_control.set_value("");
                const bold_item_code = me.item_row.item_code.bold();
                const bold_warehouse = this.value.bold();
                frappe.throw(
                  __("Item Code: {0} is not available under warehouse {1}.", [bold_item_code, bold_warehouse])
                );
              }
              me.actual_qty_control.set_value(available_qty);
            });
          }
        };
        this.warehouse_control.df.get_query = () => {
          return {
            filters: { company: this.events.get_frm().doc.company }
          };
        };
        this.warehouse_control.refresh();
      }
      if (this.serial_no_control) {
        this.serial_no_control.df.reqd = 1;
        this.serial_no_control.df.onchange = async function() {
          !me.current_item.batch_no && await me.auto_update_batch_no();
          me.events.form_updated(me.current_item, "serial_no", this.value);
        };
        this.serial_no_control.refresh();
      }
      if (this.batch_no_control) {
        this.batch_no_control.df.reqd = 1;
        this.batch_no_control.df.get_query = () => {
          return {
            query: "erpnext.controllers.queries.get_batch_no",
            filters: {
              item_code: me.item_row.item_code,
              warehouse: me.item_row.warehouse,
              posting_date: me.events.get_frm().doc.posting_date
            }
          };
        };
        this.batch_no_control.refresh();
      }
      if (this.uom_control) {
        this.uom_control.df.onchange = function() {
          me.events.form_updated(me.current_item, "uom", this.value);
          const item_row = frappe.get_doc(me.doctype, me.name);
          me.conversion_factor_control.df.read_only = item_row.stock_uom == this.value;
          me.conversion_factor_control.refresh();
        };
      }
      frappe.model.on("POS Invoice Item", "*", (fieldname, value, item_row) => {
        const field_control = this[`${fieldname}_control`];
        const item_row_is_being_edited = this.compare_with_current_item(item_row);
        if (item_row_is_being_edited && field_control && field_control.get_value() !== value) {
          field_control.set_value(value);
          cur_pos.update_cart_html(item_row);
        }
      });
    }
    async auto_update_batch_no() {
      if (this.serial_no_control && this.batch_no_control) {
        const selected_serial_nos = this.serial_no_control.get_value().split(`
`).filter((s) => s);
        if (!selected_serial_nos.length)
          return;
        const serials_with_batch_no = await frappe.db.get_list("Serial No", {
          filters: { "name": ["in", selected_serial_nos] },
          fields: ["batch_no", "name"]
        });
        const batch_serial_map = serials_with_batch_no.reduce((acc, r) => {
          if (!acc[r.batch_no]) {
            acc[r.batch_no] = [];
          }
          acc[r.batch_no] = [...acc[r.batch_no], r.name];
          return acc;
        }, {});
        const batch_no = Object.keys(batch_serial_map)[0];
        const batch_serial_nos = batch_serial_map[batch_no].join(`
`);
        const serial_nos_belongs_to_other_batch = selected_serial_nos.length !== batch_serial_map[batch_no].length;
        const current_batch_no = this.batch_no_control.get_value();
        current_batch_no != batch_no && await this.batch_no_control.set_value(batch_no);
        if (serial_nos_belongs_to_other_batch) {
          this.serial_no_control.set_value(batch_serial_nos);
          this.qty_control.set_value(batch_serial_map[batch_no].length);
          delete batch_serial_map[batch_no];
          this.events.clone_new_batch_item_in_frm(batch_serial_map, this.current_item);
        }
      }
    }
    bind_events() {
      var _a5, _b;
      try {
        this.bind_auto_serial_fetch_event();
        this.bind_fields_to_numpad_fields();
        if (this.$component && this.$component.on) {
          this.$component.on("click", ".close-btn", () => {
            var _a6;
            try {
              this.events.close_item_details();
            } catch (error) {
              (_a6 = this.logger) == null ? void 0 : _a6.error("Event", {
                message: "Failed to close item details",
                error: (error == null ? void 0 : error.message) || "Unknown error"
              });
            }
          });
        }
        (_a5 = this.logger) == null ? void 0 : _a5.info("Events", "All events bound successfully");
      } catch (error) {
        (_b = this.logger) == null ? void 0 : _b.error("Events", {
          message: "Failed to bind events",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
      }
    }
    attach_shortcuts() {
      var _a5, _b, _c, _d;
      try {
        if (this.wrapper && this.wrapper.find) {
          this.wrapper.find(".close-btn").attr("title", "Esc");
        }
        if ((_b = (_a5 = frappe == null ? void 0 : frappe.ui) == null ? void 0 : _a5.keys) == null ? void 0 : _b.on) {
          frappe.ui.keys.on("escape", () => {
            var _a6, _b2;
            try {
              const item_details_visible = (_a6 = this.$component) == null ? void 0 : _a6.is(":visible");
              if (item_details_visible) {
                this.events.close_item_details();
              }
            } catch (error) {
              (_b2 = this.logger) == null ? void 0 : _b2.error("Shortcut", {
                message: "Failed to handle escape shortcut",
                error: (error == null ? void 0 : error.message) || "Unknown error"
              });
            }
          });
        }
        (_c = this.logger) == null ? void 0 : _c.info("Shortcuts", "Keyboard shortcuts attached successfully");
      } catch (error) {
        (_d = this.logger) == null ? void 0 : _d.error("Shortcuts", {
          message: "Failed to attach shortcuts",
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
      }
    }
    bind_fields_to_numpad_fields() {
      const me = this;
      this.$form_container.on("click", ".input-with-feedback", function() {
        const fieldname = $(this).attr("data-fieldname");
        if (this.last_field_focused != fieldname) {
          me.events.item_field_focused(fieldname);
          this.last_field_focused = fieldname;
        }
      });
    }
    bind_auto_serial_fetch_event() {
      this.$form_container.on("click", ".auto-fetch-btn", () => {
        frappe.require("assets/erpnext/js/utils/serial_no_batch_selector.js", () => {
          let frm = this.events.get_frm();
          let item_row = this.item_row;
          item_row.type_of_transaction = "Outward";
          new erpnext.SerialBatchPackageSelector(frm, item_row, (r) => {
            if (r) {
              frappe.model.set_value(item_row.doctype, item_row.name, {
                "serial_and_batch_bundle": r.name,
                "qty": Math.abs(r.total_qty)
              });
            }
          });
        });
      });
    }
    toggle_component(show) {
      var _a5, _b, _c;
      try {
        if (!this.$component) {
          (_a5 = this.logger) == null ? void 0 : _a5.warn("Toggle", "Component not available for toggle operation");
          return false;
        }
        const displayValue = show ? "flex" : "none";
        const success = this.safeCss(this.$component, "display", displayValue);
        if (success) {
          (_b = this.logger) == null ? void 0 : _b.info("Toggle", `Component ${show ? "shown" : "hidden"} successfully`);
        }
        return success;
      } catch (error) {
        (_c = this.logger) == null ? void 0 : _c.error("Toggle", {
          message: "Failed to toggle component visibility",
          show,
          error: (error == null ? void 0 : error.message) || "Unknown error"
        });
        return false;
      }
    }
  };

  // ../posnext/posnext/public/js/pos_number_pad.js
  frappe.provide("posnext.PointOfSale");
  var _a2;
  posnext.PointOfSale.NumberPad = (_a2 = class {
    constructor({ wrapper, events, cols, keys, css_classes, fieldnames_map }) {
      try {
        this.validate_constructor_params({ wrapper, events, cols, keys, css_classes, fieldnames_map });
        this.wrapper = wrapper;
        this.events = events;
        this.cols = cols || this.constructor.CONSTANTS.DEFAULTS.COLS;
        this.keys = keys || this.constructor.CONSTANTS.DEFAULTS.KEYS;
        this.css_classes = css_classes || this.constructor.CONSTANTS.DEFAULTS.CSS_CLASSES;
        this.fieldnames = fieldnames_map || this.constructor.CONSTANTS.DEFAULTS.FIELDNAMES;
        this.is_disabled = false;
        this.button_states = /* @__PURE__ */ new Map();
        this.init_component();
      } catch (error) {
        console.error("NumberPad constructor error:", error);
        frappe.show_alert({
          message: __("Failed to initialize number pad"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    validate_constructor_params({ wrapper, events, cols, keys, css_classes, fieldnames_map }) {
      if (!wrapper) {
        throw new Error("NumberPad requires a wrapper element");
      }
      if (!wrapper.jquery && !wrapper.nodeType) {
        throw new Error("Wrapper must be a jQuery object or DOM element");
      }
      if (!events) {
        throw new Error("NumberPad requires an events object");
      }
      if (typeof events.numpad_event !== "function") {
        throw new Error("Events object must have a numpad_event method");
      }
      if (keys && !Array.isArray(keys)) {
        throw new Error("Keys must be an array");
      }
      if (keys) {
        keys.forEach((row, i) => {
          if (!Array.isArray(row)) {
            throw new Error(`Keys row ${i} must be an array`);
          }
        });
      }
      if (cols && (typeof cols !== "number" || cols < 1)) {
        throw new Error("Cols must be a positive number");
      }
      if (css_classes && !Array.isArray(css_classes)) {
        throw new Error("CSS classes must be an array");
      }
      if (fieldnames_map && typeof fieldnames_map !== "object") {
        throw new Error("Fieldnames map must be an object");
      }
    }
    init_component() {
      try {
        this.prepare_dom();
        this.bind_events();
        this.setup_accessibility();
      } catch (error) {
        console.error("NumberPad initialization error:", error);
        frappe.show_alert({
          message: __("Number pad initialization failed"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    prepare_dom() {
      try {
        const container_html = this.generate_container_html();
        this.wrapper.html(container_html);
        this.$container = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.CONTAINER);
        this.$buttons = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON);
        if (!this.$container.length) {
          throw new Error("Failed to create number pad container");
        }
      } catch (error) {
        console.error("DOM preparation error:", error);
        frappe.show_alert({
          message: __("Failed to create number pad interface"),
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
        }, "");
      }, "");
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
      const extra_class = this.css_classes && this.css_classes[row_index] ? this.css_classes[row_index][col_index] || "" : "";
      const fieldname = this.fieldnames && this.fieldnames[key] ? this.fieldnames[key] : typeof key === "string" ? frappe.scrub(key) : key;
      const display_text = this.sanitize_html(__(key));
      const is_empty = !key || key === "";
      return {
        classes: `${this.constructor.CONSTANTS.CSS.BUTTON} ${extra_class}`.trim(),
        fieldname: this.sanitize_attribute(fieldname),
        aria_label: `${this.constructor.CONSTANTS.ARIA.LABEL_PREFIX} ${key || "empty"}`,
        display_text,
        tabindex: is_empty ? "-1" : "0"
      };
    }
    sanitize_html(text) {
      if (typeof text !== "string")
        return "";
      return text.replace(/[<>&"']/g, (match) => {
        const escape_map = {
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&#x27;"
        };
        return escape_map[match];
      });
    }
    sanitize_attribute(value) {
      if (typeof value !== "string" && typeof value !== "number")
        return "";
      return String(value).replace(/[<>&"']/g, "");
    }
    bind_events() {
      try {
        const me = this;
        this.wrapper.on(this.constructor.CONSTANTS.EVENTS.CLICK, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
          me.handle_button_click($(this), event);
        });
        this.wrapper.on(this.constructor.CONSTANTS.EVENTS.KEYDOWN, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
          me.handle_button_keydown($(this), event);
        });
        this.wrapper.on(this.constructor.CONSTANTS.EVENTS.FOCUS, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
          me.handle_button_focus($(this), event);
        });
        this.wrapper.on(this.constructor.CONSTANTS.EVENTS.BLUR, this.constructor.CONSTANTS.SELECTORS.BUTTON, function(event) {
          me.handle_button_blur($(this), event);
        });
      } catch (error) {
        console.error("Event binding error:", error);
        frappe.show_alert({
          message: __("Failed to setup number pad interactions"),
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
        console.error("Button click error:", error);
        frappe.show_alert({
          message: __("Button action failed"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    handle_button_keydown($button, event) {
      try {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.handle_button_click($button, event);
        } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          this.navigate_buttons($button, event.key);
        }
      } catch (error) {
        console.error("Keyboard event error:", error);
      }
    }
    handle_button_focus($button, event) {
      try {
        $button.addClass("focused");
      } catch (error) {
        console.error("Focus event error:", error);
      }
    }
    handle_button_blur($button, event) {
      try {
        $button.removeClass("focused");
      } catch (error) {
        console.error("Blur event error:", error);
      }
    }
    navigate_buttons($current_button, direction) {
      try {
        const $buttons = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON + ':not([tabindex="-1"])');
        const current_index = $buttons.index($current_button);
        const total_buttons = $buttons.length;
        if (current_index === -1)
          return;
        let next_index;
        const cols = this.cols;
        const rows = Math.ceil(total_buttons / cols);
        const current_row = Math.floor(current_index / cols);
        const current_col = current_index % cols;
        switch (direction) {
          case "ArrowLeft":
            next_index = current_index > 0 ? current_index - 1 : total_buttons - 1;
            break;
          case "ArrowRight":
            next_index = current_index < total_buttons - 1 ? current_index + 1 : 0;
            break;
          case "ArrowUp":
            next_index = current_row > 0 ? current_index - cols : current_index + (rows - 1) * cols;
            if (next_index >= total_buttons)
              next_index = current_col;
            break;
          case "ArrowDown":
            next_index = current_row < rows - 1 ? current_index + cols : current_col;
            if (next_index >= total_buttons)
              next_index = current_index;
            break;
          default:
            return;
        }
        if (next_index >= 0 && next_index < total_buttons) {
          $buttons.eq(next_index).focus();
        }
      } catch (error) {
        console.error("Button navigation error:", error);
      }
    }
    setup_accessibility() {
      try {
        this.$container.attr("role", "grid");
        this.$container.attr("aria-label", __("Number pad"));
        const $first_button = this.wrapper.find(this.constructor.CONSTANTS.SELECTORS.BUTTON + ':not([tabindex="-1"])').first();
        if ($first_button.length) {
          $first_button.attr("tabindex", "0");
        }
      } catch (error) {
        console.error("Accessibility setup error:", error);
      }
    }
    add_button_feedback($button) {
      try {
        $button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_ACTIVE);
        setTimeout(() => {
          $button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_ACTIVE);
        }, 150);
        this.play_button_sound();
      } catch (error) {
        console.error("Button feedback error:", error);
      }
    }
    play_button_sound() {
      try {
        if (frappe.utils && frappe.utils.play_sound) {
          frappe.utils.play_sound("click");
        }
      } catch (error) {
      }
    }
    trigger_numpad_event($button) {
      try {
        if (this.events && typeof this.events.numpad_event === "function") {
          this.events.numpad_event($button);
        }
      } catch (error) {
        console.error("Numpad event trigger error:", error);
        frappe.show_alert({
          message: __("Number pad action failed"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    is_button_disabled($button) {
      return $button.hasClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED) || $button.attr("aria-disabled") === "true";
    }
    disable_button(value) {
      try {
        const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
        if ($button.length) {
          $button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
          $button.attr("aria-disabled", "true");
          $button.attr("tabindex", "-1");
          this.button_states.set(value, "disabled");
        }
      } catch (error) {
        console.error("Button disable error:", error);
      }
    }
    enable_button(value) {
      try {
        const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
        if ($button.length) {
          $button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
          $button.removeAttr("aria-disabled");
          $button.attr("tabindex", "0");
          this.button_states.delete(value);
        }
      } catch (error) {
        console.error("Button enable error:", error);
      }
    }
    disable_all() {
      try {
        this.is_disabled = true;
        this.$buttons.addClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
        this.$buttons.attr("aria-disabled", "true");
        this.$buttons.attr("tabindex", "-1");
      } catch (error) {
        console.error("Disable all error:", error);
      }
    }
    enable_all() {
      try {
        this.is_disabled = false;
        this.$buttons.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_DISABLED);
        this.$buttons.removeAttr("aria-disabled");
        this.$buttons.attr("tabindex", "0");
      } catch (error) {
        console.error("Enable all error:", error);
      }
    }
    set_loading_state(value, loading = true) {
      try {
        const $button = this.wrapper.find(`[data-button-value="${this.sanitize_attribute(value)}"]`);
        if ($button.length) {
          if (loading) {
            $button.addClass(this.constructor.CONSTANTS.CSS.BUTTON_LOADING);
            $button.attr("aria-busy", "true");
          } else {
            $button.removeClass(this.constructor.CONSTANTS.CSS.BUTTON_LOADING);
            $button.removeAttr("aria-busy");
          }
        }
      } catch (error) {
        console.error("Loading state error:", error);
      }
    }
    destroy() {
      try {
        if (this.wrapper) {
          this.wrapper.off(this.constructor.CONSTANTS.EVENTS.CLICK, this.constructor.CONSTANTS.SELECTORS.BUTTON);
          this.wrapper.off(this.constructor.CONSTANTS.EVENTS.KEYDOWN, this.constructor.CONSTANTS.SELECTORS.BUTTON);
          this.wrapper.off(this.constructor.CONSTANTS.EVENTS.FOCUS, this.constructor.CONSTANTS.SELECTORS.BUTTON);
          this.wrapper.off(this.constructor.CONSTANTS.EVENTS.BLUR, this.constructor.CONSTANTS.SELECTORS.BUTTON);
        }
        if (this.button_states) {
          this.button_states.clear();
        }
        this.$container = null;
        this.$buttons = null;
        this.wrapper = null;
        this.events = null;
        this.keys = null;
        this.css_classes = null;
        this.fieldnames = null;
        this.button_states = null;
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  }, __publicField(_a2, "CONSTANTS", {
    CSS: {
      CONTAINER: "numpad-container",
      BUTTON: "numpad-btn",
      BUTTON_ACTIVE: "numpad-btn-active",
      BUTTON_DISABLED: "numpad-btn-disabled",
      BUTTON_LOADING: "numpad-btn-loading"
    },
    SELECTORS: {
      BUTTON: ".numpad-btn",
      CONTAINER: ".numpad-container"
    },
    ARIA: {
      ROLE_BUTTON: "button",
      LABEL_PREFIX: "Number pad button",
      DISABLED: "disabled",
      PRESSED: "aria-pressed"
    },
    DEFAULTS: {
      COLS: 3,
      KEYS: [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", ""]],
      CSS_CLASSES: [],
      FIELDNAMES: {}
    },
    INDICATORS: {
      GREEN: "green",
      RED: "red",
      ORANGE: "orange",
      BLUE: "blue"
    },
    EVENTS: {
      CLICK: "click",
      KEYDOWN: "keydown",
      FOCUS: "focus",
      BLUR: "blur"
    }
  }), _a2);

  // ../posnext/posnext/public/js/pos_payment.js
  frappe.provide("posnext.PointOfSale");
  posnext.PointOfSale.Payment = class {
    constructor({ events, wrapper, settings }) {
      this.wrapper = wrapper;
      this.events = events;
      this.custom_show_sales_man = settings.custom_show_sales_man;
      this.custom_show_additional_note = settings.custom_show_additional_note;
      this.custom_edit_rate = settings.custom_edit_rate_and_uom;
      this.custom_show_credit_sales = settings.custom_show_credit_sales;
      this.default_payment = settings.default_payment;
      this.current_payments = [];
      this.enable_coupon_code = settings.enable_coupon_code;
      this.init_component();
      if (this.enable_coupon_code) {
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
      if (document.getElementById("posnext-payment-styles"))
        return;
      const style = document.createElement("style");
      style.id = "posnext-payment-styles";
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
				<div class="section-label payment-section">${__("Payment Method")}</div>
				<div class="payment-modes"></div>
				<div class="fields-numpad-container">
					<div class="fields-section">
						<div class="section-label">${__("Additional Information")}</div>
						<div class="coupon-code"></div> <!-- \u2705 Correct class here -->
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
      this.$component = this.wrapper.find(".payment-container");
      this.$payment_modes = this.$component.find(".payment-modes");
      this.$totals_section = this.$component.find(".totals-section");
      this.$totals = this.$component.find(".totals");
      this.$numpad = this.$component.find(".number-pad");
      this.$coupon_code = this.$component.find(".coupon-code");
      this.$invoice_fields_section = this.$component.find(".fields-section");
    }
    render_coupon_code_field() {
      frappe.ui.form.make_control({
        df: {
          label: __("Coupon Code"),
          fieldtype: "Link",
          options: "Coupon Code",
          fieldname: "coupon_code",
          placeholder: __("Select a coupon")
        },
        parent: this.$component.find(".coupon-code"),
        render_input: true
      });
    }
    make_invoice_fields_control() {
      var me = this;
      const fields = [];
      if (this.custom_show_credit_sales) {
        fields.push({
          fieldname: "custom_credit_sales",
          label: "Credit Sales",
          fieldtype: "Check"
        });
      }
      if (this.custom_show_sales_man) {
        fields.push({
          fieldname: "sales_person",
          label: "Sales Man",
          fieldtype: "Link",
          options: "Sales Person"
        });
      }
      if (this.custom_show_additional_note) {
        fields.push({
          fieldname: "remarks",
          label: "Additional Note",
          fieldtype: "Small Text"
        });
      }
      if (!fields.length)
        return;
      this.$invoice_fields = this.$invoice_fields_section.find(".invoice-fields");
      this.$invoice_fields.html("");
      const frm = this.events.get_frm();
      me.current_payments = frm.doc.payments;
      fields.forEach((df) => {
        this.$invoice_fields.append(
          `<div class="invoice_detail_field ${df.fieldname}-field" data-fieldname="${df.fieldname}"></div>`
        );
        let df_events = {
          onchange: function() {
            if (this.df.fieldname === "sales_person") {
              frm.clear_table("sales_team");
              cur_frm.add_child("sales_team", {
                sales_person: this.get_value(),
                allocated_percentage: 100
              });
            } else {
              if (this.df.fieldname === "custom_credit_sales") {
                if (this.get_value()) {
                  frm.doc.payments.forEach((p) => {
                    const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
                    me[`${mode}_control`].set_value(0);
                  });
                } else {
                  console.log(me.current_payments);
                  me.current_payments.forEach((p) => {
                    if (p.mode_of_payment === me.default_payment) {
                      const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
                      me[`${mode}_control`].set_value(frm.doc.grand_total);
                    }
                  });
                }
              }
              frm.set_value(this.df.fieldname, this.get_value());
            }
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
          df: __spreadValues(__spreadValues({}, df), df_events),
          parent: this.$invoice_fields.find(`.${df.fieldname}-field`),
          render_input: true
        });
        if (df.fieldname !== "remarks") {
          this[`${df.fieldname}_field`].set_value(frm.doc[df.fieldname]);
        }
      });
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
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
          [".", 0, "Delete"]
        ]
      });
      this.numpad_value = "";
    }
    on_numpad_clicked($btn) {
      const button_value = $btn.attr("data-button-value");
      highlight_numpad_btn($btn);
      this.numpad_value = button_value === "delete" ? this.numpad_value.slice(0, -1) : this.numpad_value + button_value;
      this.selected_mode.$input.get(0).focus();
      this.selected_mode.set_value(this.numpad_value);
      function highlight_numpad_btn($btn2) {
        $btn2.addClass("shadow-base-inner bg-selected");
        setTimeout(() => {
          $btn2.removeClass("shadow-base-inner bg-selected");
        }, 100);
      }
    }
    bind_events() {
      const me = this;
      this.$payment_modes.on("click", ".mode-of-payment", function(e) {
        const mode_clicked = $(this);
        if (!$(e.target).is(mode_clicked))
          return;
        const scrollLeft = mode_clicked.offset().left - me.$payment_modes.offset().left + me.$payment_modes.scrollLeft();
        me.$payment_modes.animate({ scrollLeft });
        const mode = mode_clicked.attr("data-mode");
        $(`.mode-of-payment-control`).css("display", "none");
        $(`.cash-shortcuts`).css("display", "none");
        me.$payment_modes.find(`.pay-amount`).css("display", "inline");
        me.$payment_modes.find(`.loyalty-amount-name`).css("display", "none");
        $(".mode-of-payment").removeClass("border-primary");
        if (mode_clicked.hasClass("border-primary")) {
          mode_clicked.removeClass("border-primary");
          me.selected_mode = "";
        } else {
          mode_clicked.addClass("border-primary");
          mode_clicked.find(".mode-of-payment-control").css("display", "flex");
          mode_clicked.find(".cash-shortcuts").css("display", "grid");
          me.$payment_modes.find(`.${mode}-amount`).css("display", "none");
          me.$payment_modes.find(`.${mode}-name`).css("display", "inline");
          me.selected_mode = me[`${mode}_control`];
          me.selected_mode && me.selected_mode.$input.get(0).focus();
          me.auto_set_remaining_amount();
        }
      });
      frappe.ui.form.on("POS Invoice", "contact_mobile", (frm) => {
        var _a5;
        const contact = frm.doc.contact_mobile;
        const request_button = $((_a5 = this.request_for_payment_field) == null ? void 0 : _a5.$input[0]);
        if (contact) {
          request_button.removeClass("btn-default").addClass("btn-primary");
        } else {
          request_button.removeClass("btn-primary").addClass("btn-default");
        }
      });
      frappe.ui.form.on("POS Invoice", "coupon_code", (frm) => {
        if (frm.doc.coupon_code && !frm.applying_pos_coupon_code) {
          if (!frm.doc.ignore_pricing_rule) {
            frm.applying_pos_coupon_code = true;
            frappe.run_serially([
              () => frm.doc.ignore_pricing_rule = 1,
              () => frm.trigger("ignore_pricing_rule"),
              () => frm.doc.ignore_pricing_rule = 0,
              () => frm.trigger("apply_pricing_rule"),
              () => frm.save(),
              () => this.update_totals_section(frm.doc),
              () => frm.applying_pos_coupon_code = false
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
      this.$payment_modes.on("click", ".shortcut-btn", function() {
        try {
          const value = $(this).attr("data-value");
          if (!value || isNaN(value)) {
            frappe.show_alert({
              message: __("Invalid shortcut value"),
              indicator: "red"
            });
            return;
          }
          $(this).addClass("shortcut-clicked");
          setTimeout(() => {
            $(this).removeClass("shortcut-clicked");
          }, 150);
          me._handleShortcutSelection(value);
        } catch (error) {
          console.error("Error applying cash shortcut:", error);
          frappe.show_alert({
            message: __("Error applying cash shortcut"),
            indicator: "red"
          });
        }
      });
      this.$payment_modes.on("keydown", ".shortcut-btn", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          $(this).click();
        }
      });
      this.$component.on("click", ".submit-order-btn", () => {
        const doc = this.events.get_frm().doc;
        let paid_amount = doc.paid_amount;
        if (cur_frm.doc.custom_credit_sales && this.custom_show_credit_sales) {
          cur_frm.clear_table("payments");
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
      frappe.ui.form.on("POS Invoice", "paid_amount", (frm) => {
        this.update_totals_section(frm.doc);
        const is_cash_shortcuts_invisible = !this.$payment_modes.find(".cash-shortcuts").is(":visible");
        this.attach_cash_shortcuts(frm.doc);
        !is_cash_shortcuts_invisible && this.$payment_modes.find(".cash-shortcuts").css("display", "grid");
        this.render_payment_mode_dom();
      });
      frappe.ui.form.on("POS Invoice", "loyalty_amount", (frm) => {
        const formatted_currency = format_currency(frm.doc.loyalty_amount, frm.doc.currency);
        this.$payment_modes.find(`.loyalty-amount-amount`).html(formatted_currency);
      });
      frappe.ui.form.on("Sales Invoice Payment", "amount", (frm, cdt, cdn) => {
        const default_mop = locals[cdt][cdn];
        const mode = default_mop.mode_of_payment.replace(/ +/g, "_").toLowerCase();
        if (this[`${mode}_control`] && this[`${mode}_control`].get_value() != default_mop.amount) {
          this[`${mode}_control`].set_value(default_mop.amount);
        }
      });
    }
    _handleShortcutSelection(value) {
      try {
        if (this.selected_mode && typeof this.selected_mode.set_value === "function") {
          this.selected_mode.set_value(value);
          this._addShortcutFeedback(this.selected_mode.$input);
          return;
        }
        const activePaymentMode = this.$payment_modes.find(".mode-of-payment.border-primary");
        if (activePaymentMode.length) {
          const mode = activePaymentMode.attr("data-mode");
          const control = this[`${mode}_control`];
          if (control && typeof control.set_value === "function") {
            control.set_value(value);
            this._addShortcutFeedback(control.$input);
            return;
          }
        }
        const cashMode = this.$payment_modes.find('[data-payment-type="Cash"], [data-mode*="cash"]').first();
        if (cashMode.length) {
          cashMode.click();
          setTimeout(() => {
            if (this.selected_mode && typeof this.selected_mode.set_value === "function") {
              this.selected_mode.set_value(value);
              this._addShortcutFeedback(this.selected_mode.$input);
            }
          }, 100);
          return;
        }
        const firstMode = this.$payment_modes.find(".mode-of-payment").first();
        if (firstMode.length) {
          firstMode.click();
          setTimeout(() => {
            if (this.selected_mode && typeof this.selected_mode.set_value === "function") {
              this.selected_mode.set_value(value);
              this._addShortcutFeedback(this.selected_mode.$input);
            }
          }, 100);
          return;
        }
        frappe.show_alert({
          message: __("No payment mode available for cash shortcut"),
          indicator: "orange"
        });
      } catch (error) {
        console.error("Error in shortcut selection:", error);
        frappe.show_alert({
          message: __("Error applying shortcut value"),
          indicator: "red"
        });
      }
    }
    _addShortcutFeedback($input) {
      if ($input && $input.length) {
        $input.addClass("shortcut-flash");
        setTimeout(() => {
          $input.removeClass("shortcut-flash");
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
      const current_value = this.selected_mode ? this.selected_mode.get_value() : void 0;
      if (!current_value && remaining_amount > 0 && this.selected_mode) {
        this.selected_mode.set_value(remaining_amount);
      }
    }
    attach_shortcuts() {
      const ctrl_label = frappe.utils.is_mac() ? "\u2318" : "Ctrl";
      this.$component.find(".submit-order-btn").attr("title", `${ctrl_label}+Enter`);
      frappe.ui.keys.on("ctrl+enter", () => {
        const payment_is_visible = this.$component.is(":visible");
        const active_mode = this.$payment_modes.find(".border-primary");
        if (payment_is_visible && active_mode.length) {
          this.$component.find(".submit-order-btn").click();
        }
      });
      frappe.ui.keys.add_shortcut({
        shortcut: "tab",
        action: () => {
          const payment_is_visible = this.$component.is(":visible");
          let active_mode = this.$payment_modes.find(".border-primary");
          active_mode = active_mode.length ? active_mode.attr("data-mode") : void 0;
          if (!active_mode)
            return;
          const mode_of_payments = Array.from(this.$payment_modes.find(".mode-of-payment")).map((m) => $(m).attr("data-mode"));
          const mode_index = mode_of_payments.indexOf(active_mode);
          const next_mode_index = (mode_index + 1) % mode_of_payments.length;
          const next_mode_to_be_clicked = this.$payment_modes.find(`.mode-of-payment[data-mode="${mode_of_payments[next_mode_index]}"]`);
          if (payment_is_visible && mode_index != next_mode_index) {
            next_mode_to_be_clicked.click();
          }
        },
        condition: () => this.$component.is(":visible") && this.$payment_modes.find(".border-primary").length,
        description: __("Switch Between Payment Modes"),
        ignore_inputs: true,
        page: cur_page.page.page
      });
    }
    toggle_numpad() {
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
      if (this.custom_edit_rate) {
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
      if (this.$remarks.find(".frappe-control").length) {
        this.$remarks.html("+ Add Remark");
      } else {
        this.$remarks.html("");
        this[`remark_control`] = frappe.ui.form.make_control({
          df: {
            label: __("Remark"),
            fieldtype: "Data",
            onchange: function() {
            }
          },
          parent: this.$totals_section.find(`.remarks`),
          render_input: true
        });
        this[`remark_control`].set_value("");
      }
    }
    render_payment_mode_dom() {
      const doc = this.events.get_frm().doc;
      const payments = doc.payments;
      const currency = doc.currency;
      this.$payment_modes.html(`${payments.map((p, i) => {
        const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
        const payment_type = p.type;
        const margin = i % 2 === 0 ? "pr-2" : "pl-2";
        const amount = p.amount > 0 ? format_currency(p.amount, currency) : "";
        return `
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
				`;
      }).join("")}`);
      this.current_payments = payments;
      payments.forEach((p) => {
        const mode = p.mode_of_payment.replace(/ +/g, "_").toLowerCase();
        const me = this;
        this[`${mode}_control`] = frappe.ui.form.make_control({
          df: {
            label: p.mode_of_payment,
            fieldtype: "Currency",
            placeholder: __("Enter {0} amount.", [p.mode_of_payment]),
            onchange: function() {
              try {
                console.log(p.doctype);
                console.log(p.name);
                const current_value = frappe.model.get_value(p.doctype, p.name, "amount");
                if (isNaN(this.value) || this.value < 0) {
                  frappe.show_alert({
                    message: __("Please enter a valid positive amount"),
                    indicator: "red"
                  });
                  this.set_value(current_value || 0);
                  return;
                }
                if (current_value != this.value) {
                  frappe.model.set_value(p.doctype, p.name, "amount", flt(this.value)).then(() => {
                    me.update_totals_section();
                    this.$input.addClass("success-flash");
                    setTimeout(() => {
                      this.$input.removeClass("success-flash");
                    }, 300);
                  }).catch((error) => {
                    console.error("Error updating payment amount:", error);
                    frappe.show_alert({
                      message: __("Error updating payment amount: {0}", [error.message]),
                      indicator: "red"
                    });
                    this.set_value(current_value || 0);
                  });
                  const formatted_currency = format_currency(this.value, currency);
                  me.$payment_modes.find(`.${mode}-amount`).html(formatted_currency);
                }
              } catch (error) {
                console.error("Error in payment control onchange:", error);
                frappe.show_alert({
                  message: __("An error occurred while processing payment"),
                  indicator: "red"
                });
              }
            }
          },
          parent: this.$payment_modes.find(`.${mode}.mode-of-payment-control`),
          render_input: true
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
      payments.forEach((p) => {
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
      this.$payment_modes.find(".cash-shortcuts").remove();
      if (shortcuts.length === 0)
        return;
      let shortcuts_html = shortcuts.map((s) => {
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
      }).join("");
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
      let cashPaymentMode = this.$payment_modes.find('[data-payment-type="Cash"]');
      if (!cashPaymentMode.length) {
        cashPaymentMode = this.$payment_modes.find('[data-mode*="cash"]');
      }
      if (!cashPaymentMode.length) {
        cashPaymentMode = this.$payment_modes.find(".mode-of-payment").filter(function() {
          return $(this).text().toLowerCase().includes("cash");
        });
      }
      if (!cashPaymentMode.length) {
        cashPaymentMode = this.$payment_modes.find(".mode-of-payment").first();
      }
      if (cashPaymentMode.length) {
        cashPaymentMode.find(".mode-of-payment-control").after(shortcutsContainer);
      }
    }
    get_cash_shortcuts(grand_total) {
      let steps = [1, 5, 10];
      const digits = String(Math.round(grand_total)).length;
      steps = steps.map((x) => x * 10 ** (digits - 2));
      const get_nearest = (amount, x) => {
        let nearest_x = Math.ceil(amount / x) * x;
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
      if (!loyalty_program)
        return;
      let description, read_only, max_redeemable_amount;
      if (!loyalty_points) {
        description = __("You don't have enough points to redeem.");
        read_only = true;
      } else {
        max_redeemable_amount = flt(flt(loyalty_points) * flt(conversion_factor), precision("loyalty_amount", doc));
        description = __("You can redeem upto {0}.", [format_currency(max_redeemable_amount)]);
        read_only = false;
      }
      const margin = this.$payment_modes.children().length % 2 === 0 ? "pr-2" : "pl-2";
      const amount = doc.loyalty_amount > 0 ? format_currency(doc.loyalty_amount, doc.currency) : "";
      this.$payment_modes.append(
        `<div class="payment-mode-wrapper">
				<div class="mode-of-payment loyalty-card" data-mode="loyalty-amount" data-payment-type="loyalty-amount">
					<div class="payment-mode-header">
						<i class="${this._get_payment_icon("loyalty-amount")} payment-mode-icon"></i>
						<span class="payment-mode-name">Redeem Loyalty Points</span>
					</div>
					<div class="loyalty-amount-amount pay-amount">${amount}</div>
					<div class="loyalty-amount-name">${loyalty_program}</div>
					<div class="loyalty-amount mode-of-payment-control"></div>
				</div>
			</div>`
      );
      this["loyalty-amount_control"] = frappe.ui.form.make_control({
        df: {
          label: __("Redeem Loyalty Points"),
          fieldtype: "Currency",
          placeholder: __("Enter amount to be redeemed."),
          options: "company:currency",
          read_only,
          onchange: async function() {
            if (!loyalty_points)
              return;
            if (this.value > max_redeemable_amount) {
              frappe.show_alert({
                message: __("You cannot redeem more than {0}.", [format_currency(max_redeemable_amount)]),
                indicator: "red"
              });
              frappe.utils.play_sound("submit");
              me["loyalty-amount_control"].set_value(0);
              return;
            }
            const redeem_loyalty_points = this.value > 0 ? 1 : 0;
            await frappe.model.set_value(doc.doctype, doc.name, "redeem_loyalty_points", redeem_loyalty_points);
            frappe.model.set_value(doc.doctype, doc.name, "loyalty_points", parseInt(this.value / conversion_factor));
          },
          description
        },
        parent: this.$payment_modes.find(`.loyalty-amount.mode-of-payment-control`),
        render_input: true
      });
      this["loyalty-amount_control"].toggle_label(false);
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
      if (!doc)
        doc = this.events.get_frm().doc;
      let branch_value = $('.input-with-feedback[data-fieldname="branch"]').val();
      frappe.model.set_value(cur_frm.doctype, cur_frm.docname, "branch", branch_value);
      const paid_amount = doc.paid_amount;
      if (cur_frm.doc.custom_credit_sales) {
        const paid_amount2 = 0;
      }
      const grand_total = cint(frappe.sys_defaults.disable_rounded_total) ? doc.grand_total : doc.rounded_total;
      const remaining = grand_total - doc.paid_amount;
      const change = doc.change_amount || remaining <= 0 ? -1 * remaining : void 0;
      const currency = doc.currency;
      const label = change ? __("Change") : __("To Be Paid");
      this.$totals.html(
        `<div class="col">
				<div class="total-label">${__("Grand Total")}</div>
				<div class="value">${format_currency(grand_total, currency)}</div>
			</div>
			<div class="seperator-y"></div>
			<div class="col">
				<div class="total-label">${__("Paid Amount")}</div>
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
      this._cache_dom_elements();
      this._optimize_event_delegation();
      this._setup_loading_states();
    }
    _cache_dom_elements() {
      this._cached_elements = {
        payment_modes: this.$payment_modes,
        payment_container: this.$payment_modes.closest(".payment-container"),
        cash_shortcuts: null,
        mode_controls: null
      };
      this._update_dom_cache = () => {
        this._cached_elements.cash_shortcuts = this.$payment_modes.find(".cash-shortcuts");
        this._cached_elements.mode_controls = this.$payment_modes.find(".mode-of-payment-control");
      };
    }
    _optimize_event_delegation() {
      this.$payment_modes.off("input.payment_optimized");
      this.$payment_modes.on(
        "input.payment_optimized",
        ".mode-of-payment-control input",
        this._debounce((e) => {
          const $input = $(e.target);
          const fieldname = $input.attr("data-fieldname");
          if (fieldname) {
            this._handle_payment_input_optimized(fieldname, $input.val());
          }
        }, 300)
      );
    }
    _handle_payment_input_optimized(fieldname, value) {
      try {
        const numValue = flt(value);
        if (isNaN(numValue)) {
          frappe.show_alert({
            message: __("Invalid amount entered"),
            indicator: "red"
          });
          return;
        }
        this._batch_dom_updates(() => {
          this.update_totals_section(this.events.get_frm().doc);
        });
      } catch (error) {
        console.error("Error in optimized payment input handling:", error);
      }
    }
    _batch_dom_updates(callback) {
      if (window.requestAnimationFrame) {
        requestAnimationFrame(() => {
          callback();
        });
      } else {
        callback();
      }
    }
    _setup_loading_states() {
      this._loading_states = /* @__PURE__ */ new Map();
      this._set_loading_state = (element, loading) => {
        const $element = $(element);
        if (loading) {
          $element.addClass("payment-loading");
          this._loading_states.set(element, true);
        } else {
          $element.removeClass("payment-loading");
          this._loading_states.delete(element);
        }
      };
      this._is_loading = (element) => {
        return this._loading_states.has(element);
      };
    }
    _get_payment_icon(payment_type) {
      const iconMap = {
        "Cash": "fa fa-money-bill-wave",
        "Card": "fa fa-credit-card",
        "Credit Card": "fa fa-credit-card",
        "Debit Card": "fa fa-credit-card",
        "Bank Transfer": "fa fa-university",
        "Cheque": "fa fa-money-check",
        "Digital Wallet": "fa fa-mobile-alt",
        "Mobile Money": "fa fa-mobile-alt",
        "loyalty-amount": "fa fa-gift",
        "UPI": "fa fa-qrcode",
        "PayPal": "fa fa-paypal",
        "Apple Pay": "fa fa-apple-pay",
        "Google Pay": "fa fa-google-pay",
        "Samsung Pay": "fa fa-samsung-pay"
      };
      return iconMap[payment_type] || "fa fa-money-bill";
    }
    toggle_component(show) {
      show ? this.$component.css("display", "flex") : this.$component.css("display", "none");
    }
  };

  // ../posnext/posnext/public/js/pos_past_order_list.js
  frappe.provide("posnext.PointOfSale");
  var _a3;
  posnext.PointOfSale.PastOrderList = (_a3 = class {
    constructor({ wrapper, events, settings }) {
      try {
        this.wrapper = wrapper;
        this.events = events;
        this.pos_profile = settings.name;
        this.custom_filter_order_list_by_profile = settings.custom_filter_order_list_by_profile;
        this.invoices = [];
        this.last_search = null;
        this.init_component();
      } catch (error) {
        console.error("PastOrderList constructor error:", error);
        frappe.show_alert({
          message: __("Failed to initialize order list component"),
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
        console.error("Component initialization error:", error);
        frappe.show_alert({
          message: __("Order list component initialization failed"),
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
						<div class="label">${__("Recent Orders")}</div>
						<div class="search-field"></div>
						<div class="status-field"></div>
					</div>
					<div class="invoices-container"></div>
				</section>`
        );
        this.$component = this.wrapper.find(".past-order-list");
        this.$invoices_container = this.$component.find(".invoices-container");
        if (!this.$component.length || !this.$invoices_container.length) {
          throw new Error("Required DOM elements not found");
        }
      } catch (error) {
        console.error("DOM preparation error:", error);
        frappe.show_alert({
          message: __("Failed to prepare order list interface"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    bind_events() {
      try {
        this.search_field.$input.on("input", (e) => {
          clearTimeout(this.last_search);
          this.last_search = setTimeout(() => {
            const search_term = e.target.value;
            this.refresh_list(search_term, this.status_field.get_value());
          }, this.constructor.CONSTANTS.SEARCH.DEBOUNCE_DELAY);
        });
        const me = this;
        this.$invoices_container.on("click", this.constructor.CONSTANTS.SELECTORS.INVOICE_WRAPPER, function() {
          try {
            const invoice_name = unescape($(this).attr("data-invoice-name"));
            if (invoice_name && me.events.open_invoice_data) {
              me.events.open_invoice_data(invoice_name);
            }
          } catch (error) {
            console.error("Invoice click error:", error);
            frappe.show_alert({
              message: __("Failed to open invoice"),
              indicator: me.constructor.CONSTANTS.INDICATORS.RED
            });
          }
        });
        this.$component.on("click", this.constructor.CONSTANTS.SELECTORS.BACK_BUTTON, function() {
          try {
            if (me.events.previous_screen) {
              me.events.previous_screen();
            }
          } catch (error) {
            console.error("Back button error:", error);
            frappe.show_alert({
              message: __("Navigation failed"),
              indicator: me.constructor.CONSTANTS.INDICATORS.RED
            });
          }
        });
      } catch (error) {
        console.error("Event binding error:", error);
        frappe.show_alert({
          message: __("Failed to setup event listeners"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    make_filter_section() {
      try {
        const me = this;
        this.search_field = frappe.ui.form.make_control({
          df: {
            label: __("Search"),
            fieldtype: "Data",
            placeholder: __(this.constructor.CONSTANTS.SEARCH.PLACEHOLDER)
          },
          parent: this.$component.find(".search-field"),
          render_input: true
        });
        this.status_field = frappe.ui.form.make_control({
          df: {
            label: __("Invoice Status"),
            fieldtype: "Select",
            options: this.constructor.CONSTANTS.STATUS.OPTIONS,
            placeholder: __("Filter by invoice status"),
            onchange: function() {
              try {
                if (me.$component.is(":visible"))
                  me.refresh_list();
              } catch (error) {
                console.error("Status change error:", error);
                frappe.show_alert({
                  message: __("Filter update failed"),
                  indicator: me.constructor.CONSTANTS.INDICATORS.RED
                });
              }
            }
          },
          parent: this.$component.find(".status-field"),
          render_input: true
        });
        this.search_field.toggle_label(false);
        this.status_field.toggle_label(false);
        this.status_field.set_value(this.constructor.CONSTANTS.STATUS.DEFAULT);
      } catch (error) {
        console.error("Filter section creation error:", error);
        frappe.show_alert({
          message: __("Failed to create search filters"),
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
        this.$invoices_container.html("");
        let filter = { search_term, status };
        if (this.custom_filter_order_list_by_profile) {
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
                  response.message.forEach((invoice) => {
                    const invoice_html = this.get_invoice_html(invoice);
                    this.$invoices_container.append(invoice_html);
                  });
                }
              } else {
                this.show_empty_state();
              }
            } catch (error) {
              console.error("Response processing error:", error);
              frappe.dom.unfreeze();
              frappe.show_alert({
                message: __("Failed to process order data"),
                indicator: this.constructor.CONSTANTS.INDICATORS.RED
              });
            }
          },
          error: (error) => {
            console.error("API call error:", error);
            frappe.dom.unfreeze();
            frappe.show_alert({
              message: __("Failed to fetch orders. Please try again."),
              indicator: this.constructor.CONSTANTS.INDICATORS.RED
            });
            this.show_error_state();
          }
        });
      } catch (error) {
        console.error("Refresh list error:", error);
        frappe.dom.unfreeze();
        frappe.show_alert({
          message: __("Failed to refresh order list"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    get_invoice_html(invoice) {
      try {
        if (!invoice || !invoice.name) {
          console.warn("Invalid invoice data:", invoice);
          return "";
        }
        const posting_datetime = moment(invoice.posting_date + " " + invoice.posting_time).format("Do MMMM, h:mma");
        const customer_name = invoice.customer || __("Unknown Customer");
        const grand_total = invoice.grand_total || 0;
        const currency = invoice.currency || frappe.defaults.get_default("currency");
        return `<div class="invoice-wrapper" data-invoice-name="${escape(invoice.name)}">
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
				<div class="seperator"></div>`;
      } catch (error) {
        console.error("Invoice HTML generation error:", error);
        return `<div class="invoice-wrapper error">
				<div class="invoice-name-date">
					<div class="invoice-name">${__("Error loading invoice")}</div>
				</div>
			</div>`;
      }
    }
    toggle_component(show) {
      try {
        if (show) {
          this.$component.css("display", "flex");
          this.refresh_list();
        } else {
          this.$component.css("display", "none");
        }
      } catch (error) {
        console.error("Toggle component error:", error);
        frappe.show_alert({
          message: __("Failed to toggle order list view"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    show_empty_state() {
      this.$invoices_container.html(`
			<div class="empty-state" style="text-align: center; padding: 2rem; color: #8d99a6;">
				<div style="font-size: 48px; margin-bottom: 1rem;">\u{1F4C4}</div>
				<div style="font-size: 18px; margin-bottom: 0.5rem;">${__("No Orders Found")}</div>
				<div style="font-size: 14px;">${__("Try adjusting your search criteria or create a new order")}</div>
			</div>
		`);
    }
    show_error_state() {
      this.$invoices_container.html(`
			<div class="error-state" style="text-align: center; padding: 2rem; color: #d1453b;">
				<div style="font-size: 48px; margin-bottom: 1rem;">\u26A0\uFE0F</div>
				<div style="font-size: 18px; margin-bottom: 0.5rem;">${__("Failed to Load Orders")}</div>
				<div style="font-size: 14px;">${__("Please check your connection and try again")}</div>
			</div>
		`);
    }
    destroy() {
      try {
        if (this.last_search) {
          clearTimeout(this.last_search);
          this.last_search = null;
        }
        if (this.$invoices_container) {
          this.$invoices_container.off("click", this.constructor.CONSTANTS.SELECTORS.INVOICE_WRAPPER);
        }
        if (this.$component) {
          this.$component.off("click", this.constructor.CONSTANTS.SELECTORS.BACK_BUTTON);
        }
        if (this.search_field && this.search_field.$input) {
          this.search_field.$input.off("input");
        }
        this.invoices = null;
        this.search_field = null;
        this.status_field = null;
        this.$component = null;
        this.$invoices_container = null;
        this.wrapper = null;
        this.events = null;
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  }, __publicField(_a3, "CONSTANTS", {
    SEARCH: {
      DEBOUNCE_DELAY: 300,
      PLACEHOLDER: "Search by invoice id or customer name"
    },
    STATUS: {
      OPTIONS: "Draft\nPaid\nUnpaid\nReturn",
      DEFAULT: "Draft"
    },
    DISPLAY: {
      CUSTOMER_NAME_LENGTH: 20,
      CURRENCY_DECIMALS: 0
    },
    API: {
      ENDPOINT: "posnext.posnext.page.posnext.point_of_sale.get_past_order_list"
    },
    SELECTORS: {
      INVOICE_WRAPPER: ".invoice-wrapper",
      BACK_BUTTON: ".back"
    },
    INDICATORS: {
      GREEN: "green",
      RED: "red",
      ORANGE: "orange",
      BLUE: "blue"
    }
  }), _a3);

  // ../posnext/posnext/public/js/pos_past_order_summary.js
  frappe.provide("posnext.PointOfSale");
  var _a4;
  posnext.PointOfSale.PastOrderSummary = (_a4 = class {
    constructor({ wrapper, pos_profile, events }) {
      try {
        this.wrapper = wrapper;
        this.pos_profile = pos_profile;
        this.events = events;
        this.customer_email = "";
        this.doc = null;
        this.dialogs = {};
        this.eventListeners = [];
        this.init_component();
      } catch (error) {
        console.error("Error initializing PastOrderSummary:", error);
        frappe.show_alert({
          message: __("Failed to initialize order summary. Please refresh the page."),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    init_component() {
      try {
        this.prepare_dom();
        this.init_email_print_dialog();
        this.bind_events();
        this.attach_shortcuts();
      } catch (error) {
        console.error("Error during component initialization:", error);
        frappe.show_alert({
          message: __("Component initialization failed. Some features may not work."),
          indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
        });
      }
    }
    destroy() {
      try {
        this.eventListeners.forEach(({ element, event, handler }) => {
          if (element && element.off) {
            element.off(event, handler);
          }
        });
        this.eventListeners = [];
        Object.values(this.dialogs).forEach((dialog) => {
          if (dialog && dialog.hide) {
            dialog.hide();
          }
        });
        this.dialogs = {};
        if (frappe.ui.keys) {
          frappe.ui.keys.off("ctrl+enter");
          frappe.ui.keys.remove_shortcut && frappe.ui.keys.remove_shortcut("ctrl+p");
          frappe.ui.keys.remove_shortcut && frappe.ui.keys.remove_shortcut("ctrl+e");
        }
        this.doc = null;
        this.customer_email = "";
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }
    prepare_dom() {
      this.wrapper.append(
        `<section class="past-order-summary">
				<div class="no-summary-placeholder">
					${__("Select an invoice to load summary data")}
				</div>
				<div class="invoice-summary-wrapper" >
					<div class="abs-container" >
						<div class="upper-section"></div>
						<div class="label">${__("Items")}</div>
						<div class="items-container summary-container"></div>
						<div class="label">${__("Totals")}</div>
						<div class="totals-container summary-container"></div>
						<div class="label">${__("Payments")}</div>
						<div class="payments-container summary-container"></div>
						<div class="summary-btns"></div>
					</div>
				</div>
			</section>`
      );
      this.$component = this.wrapper.find(".past-order-summary");
      this.$summary_wrapper = this.$component.find(".invoice-summary-wrapper");
      this.$summary_container = this.$component.find(".abs-container");
      this.$upper_section = this.$summary_container.find(".upper-section");
      this.$items_container = this.$summary_container.find(".items-container");
      this.$totals_container = this.$summary_container.find(".totals-container");
      this.$payment_container = this.$summary_container.find(".payments-container");
      this.$summary_btns = this.$summary_container.find(".summary-btns");
    }
    init_email_print_dialog() {
      try {
        const email_dialog = new frappe.ui.Dialog({
          title: __("Email Receipt"),
          fields: [
            {
              fieldname: "email_id",
              fieldtype: "Data",
              options: "Email",
              label: __("Email ID"),
              reqd: 1,
              description: __("Enter a valid email address")
            },
            {
              fieldname: "content",
              fieldtype: "Small Text",
              label: __("Message (if any)")
            }
          ],
          primary_action: () => {
            this.send_email();
          },
          primary_action_label: __("Send")
        });
        this.dialogs.email = email_dialog;
        const print_dialog = new frappe.ui.Dialog({
          title: __("Print Receipt"),
          fields: [
            {
              fieldname: "print",
              fieldtype: "Data",
              label: __("Print Preview"),
              read_only: 1
            }
          ],
          primary_action: () => {
            this.print_receipt();
          },
          primary_action_label: __("Print")
        });
        this.dialogs.print = print_dialog;
      } catch (error) {
        console.error("Error initializing dialogs:", error);
        frappe.show_alert({
          message: __("Dialog initialization failed. Email and print features may not work."),
          indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
        });
      }
    }
    get_upper_section_html(doc) {
      const { status } = doc;
      let indicator_color = "";
      in_list(["Paid", "Consolidated"], status) && (indicator_color = "green");
      status === "Draft" && (indicator_color = "red");
      status === "Return" && (indicator_color = "grey");
      return `<div class="left-section">
					<div class="customer-name">${doc.customer}</div>
					<div class="customer-email">${this.customer_email}</div>
					<div class="cashier">${__("Sold by")}: ${doc.created_by_name}</div>
				</div>
				<div class="right-section">
					<div class="paid-amount">${format_currency(doc.paid_amount, doc.currency)}</div>
					<div class="invoice-name">${doc.name}</div>
					<span class="indicator-pill whitespace-nowrap ${indicator_color}"><span>${doc.status}</span></span>
				</div>`;
    }
    get_item_html(doc, item_data) {
      return `<div class="item-row-wrapper">
					<div class="item-name">${item_data.item_name}</div>
					<div class="item-qty">${item_data.qty || 0} ${item_data.uom}</div>
					<div class="item-rate-disc">${get_rate_discount_html()}</div>
				</div>`;
      function get_rate_discount_html() {
        if (item_data.rate && item_data.price_list_rate && item_data.rate !== item_data.price_list_rate) {
          return `<span class="item-disc">(${item_data.discount_percentage}% off)</span>
						<div class="item-rate">${format_currency(item_data.rate, doc.currency)}</div>`;
        } else {
          return `<div class="item-rate">${format_currency(item_data.price_list_rate || item_data.rate, doc.currency)}</div>`;
        }
      }
    }
    get_discount_html(doc) {
      if (doc.discount_amount) {
        return `<div class="summary-row-wrapper">
						<div>Discount (${doc.additional_discount_percentage} %)</div>
						<div>${format_currency(doc.discount_amount, doc.currency)}</div>
					</div>`;
      } else {
        return ``;
      }
    }
    get_net_total_html(doc) {
      return `<div class="summary-row-wrapper">
					<div>${__("Net Total")}</div>
					<div>${format_currency(doc.net_total, doc.currency)}</div>
				</div>`;
    }
    get_taxes_html(doc) {
      if (!doc.taxes.length)
        return "";
      let taxes_html = doc.taxes.map((t) => {
        const description = /[0-9]+/.test(t.description) ? t.description : t.rate != 0 ? `${t.description} @ ${t.rate}%` : t.description;
        return `
				<div class="tax-row">
					<div class="tax-label">${description}</div>
					<div class="tax-value">${format_currency(t.tax_amount_after_discount_amount, doc.currency)}</div>
				</div>
			`;
      }).join("");
      return `<div class="taxes-wrapper">${taxes_html}</div>`;
    }
    get_grand_total_html(doc) {
      return `<div class="summary-row-wrapper grand-total">
					<div>${__("Grand Total")}</div>
					<div>${format_currency(doc.grand_total, doc.currency)}</div>
				</div>`;
    }
    get_payment_html(doc, payment) {
      return `<div class="summary-row-wrapper payments">
					<div>${__(payment.mode_of_payment)}</div>
					<div>${format_currency(payment.amount, doc.currency)}</div>
				</div>`;
    }
    bind_events() {
      this.$summary_container.on("click", ".return-btn", () => {
        this.events.process_return(this.doc.name);
        this.toggle_component(false);
        this.$component.find(".no-summary-placeholder").css("display", "flex");
        this.$summary_wrapper.css("display", "none");
      });
      this.$summary_container.on("click", ".edit-btn", () => {
        this.events.edit_order(this.doc.name);
        this.toggle_component(false);
        this.$component.find(".no-summary-placeholder").css("display", "flex");
        this.$summary_wrapper.css("display", "none");
      });
      this.$summary_container.on("click", ".delete-btn", () => {
        this.events.delete_order(this.doc.name);
        this.show_summary_placeholder();
      });
      this.$summary_container.on("click", ".send-btn", () => {
        try {
          this.send_whatsapp();
        } catch (error) {
          console.error("WhatsApp send error:", error);
          frappe.show_alert({
            message: __("WhatsApp feature encountered an error"),
            indicator: this.constructor.CONSTANTS.INDICATORS.RED
          });
        }
      });
      function formatString2(str, args) {
        return str.replace(/{(\d+)}/g, function(match, number) {
          return typeof args[number] !== "undefined" ? args[number] : match;
        });
      }
      this.$summary_container.on("click", ".new-btn", () => {
        this.events.new_order();
        this.toggle_component(false);
        this.$component.find(".no-summary-placeholder").css("display", "flex");
        this.$summary_wrapper.css("display", "none");
      });
      this.$summary_container.on("click", ".email-btn", () => {
        this.email_dialog.fields_dict.email_id.set_value(this.customer_email);
        this.email_dialog.show();
      });
      this.$summary_container.on("click", ".print-btn", () => {
        this.print_receipt();
      });
    }
    print_receipt() {
      try {
        if (!this.dialogs.print) {
          frappe.throw(__("Print dialog not available"));
          return;
        }
        const frm = this.events.get_frm();
        if (!frm || !frm.pos_print_format) {
          frappe.show_alert({
            message: __("Print format not configured"),
            indicator: this.constructor.CONSTANTS.INDICATORS.RED
          });
          return;
        }
        const print_format = frm.pos_print_format;
        const doctype = this.doc.doctype;
        const docname = this.doc.name;
        const letterhead = this.doc.letter_head || __("No Letterhead");
        const lang_code = this.doc.language || frappe.boot.lang;
        frappe.show_alert({
          message: __("Preparing print..."),
          indicator: this.constructor.CONSTANTS.INDICATORS.BLUE
        });
        frappe.db.get_value("Print Settings", "Print Settings", "enable_raw_printing").then(({ message }) => {
          if (message && message.enable_raw_printing === "1") {
            this._print_via_qz(doctype, docname, print_format, letterhead, lang_code);
          } else {
            this._print_via_browser(doctype, docname, print_format, letterhead, lang_code);
          }
        }).catch((error) => {
          console.error("Print settings fetch error:", error);
          this._print_via_browser(doctype, docname, print_format, letterhead, lang_code);
        });
      } catch (error) {
        console.error("Print function error:", error);
        frappe.show_alert({
          message: __("Print feature encountered an error"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    _print_via_browser(doctype, docname, print_format, letterhead, lang_code) {
      try {
        frappe.utils.print(
          doctype,
          docname,
          print_format,
          letterhead,
          lang_code
        );
        frappe.show_alert({
          message: __("Print opened successfully"),
          indicator: this.constructor.CONSTANTS.INDICATORS.GREEN
        });
      } catch (error) {
        console.error("Browser print error:", error);
        frappe.show_alert({
          message: __("Failed to open print preview"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    _print_via_qz(doctype, docname, print_format, letterhead, lang_code) {
      try {
        const print_format_printer_map = this._get_print_format_printer_map();
        const mapped_printer = this._get_mapped_printer(print_format_printer_map, doctype, print_format);
        if (mapped_printer.length === 1) {
          this._print_with_mapped_printer(doctype, docname, print_format, letterhead, lang_code, mapped_printer[0]);
        } else if (this._is_raw_printing(print_format)) {
          frappe.show_alert({
            message: __("Printer mapping not set."),
            subtitle: __("Please set a printer mapping for this print format in the Printer Settings"),
            indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
          }, this.constructor.CONSTANTS.DELAYS.LONG_ALERT);
          this._printer_setting_dialog(doctype, print_format);
        } else {
          this._render_pdf_or_regular_print(doctype, docname, print_format, letterhead, lang_code);
        }
      } catch (error) {
        console.error("QZ print error:", error);
        frappe.show_alert({
          message: __("QZ printer failed, falling back to browser print"),
          indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
        });
        this._print_via_browser(doctype, docname, print_format, letterhead, lang_code);
      }
    }
    _print_with_mapped_printer(doctype, docname, print_format, letterhead, lang_code, printer_map) {
      if (this._is_raw_printing(print_format)) {
        this._get_raw_commands(doctype, docname, print_format, lang_code, (out) => {
          frappe.ui.form.qz_connect().then(() => {
            let config = qz.configs.create(printer_map.printer);
            let data = [out.raw_commands];
            return qz.print(config, data);
          }).then(frappe.ui.form.qz_success).catch((err) => {
            frappe.ui.form.qz_fail(err);
          });
        });
      } else {
        frappe.show_alert({
          message: __('PDF printing via "Raw Print" is not supported.'),
          subtitle: __("Please remove the printer mapping in Printer Settings and try again."),
          indicator: "info"
        }, 14);
        this._render_pdf_or_regular_print(doctype, docname, print_format, letterhead, lang_code);
      }
    }
    _get_raw_commands(doctype, docname, print_format, lang_code, callback) {
      frappe.call({
        method: "frappe.www.printview.get_rendered_raw_commands",
        args: {
          doc: frappe.get_doc(doctype, docname),
          print_format,
          _lang: lang_code
        },
        callback: (r) => {
          if (!r.exc) {
            callback(r.message);
          }
        }
      });
    }
    _is_raw_printing(format) {
      let print_format = {};
      if (locals["Print Format"] && locals["Print Format"][format]) {
        print_format = locals["Print Format"][format];
      }
      return print_format.raw_printing === 1;
    }
    _get_print_format_printer_map() {
      try {
        return JSON.parse(localStorage.print_format_printer_map || "{}");
      } catch (e) {
        return {};
      }
    }
    _get_mapped_printer(print_format_printer_map, doctype, print_format) {
      if (print_format_printer_map[doctype]) {
        return print_format_printer_map[doctype].filter(
          (printer_map) => printer_map.print_format === print_format
        );
      }
      return [];
    }
    _render_pdf_or_regular_print(doctype, docname, print_format, letterhead, lang_code) {
      frappe.utils.print(
        doctype,
        docname,
        print_format,
        letterhead,
        lang_code
      );
    }
    _printer_setting_dialog(doctype, current_print_format) {
      let print_format_printer_map = this._get_print_format_printer_map();
      let data = print_format_printer_map[doctype] || [];
      frappe.ui.form.qz_get_printer_list().then((printer_list) => {
        if (!(printer_list && printer_list.length)) {
          frappe.throw(__("No Printer is Available."));
          return;
        }
        const dialog = new frappe.ui.Dialog({
          title: __("Printer Settings"),
          fields: [
            {
              fieldtype: "Section Break"
            },
            {
              fieldname: "printer_mapping",
              fieldtype: "Table",
              label: __("Printer Mapping"),
              in_place_edit: true,
              data,
              get_data: () => {
                return data;
              },
              fields: [
                {
                  fieldtype: "Select",
                  fieldname: "print_format",
                  default: 0,
                  options: frappe.meta.get_print_formats(doctype),
                  read_only: 0,
                  in_list_view: 1,
                  label: __("Print Format")
                },
                {
                  fieldtype: "Select",
                  fieldname: "printer",
                  default: 0,
                  options: printer_list,
                  read_only: 0,
                  in_list_view: 1,
                  label: __("Printer")
                }
              ]
            }
          ],
          primary_action: () => {
            let printer_mapping = dialog.get_values()["printer_mapping"];
            if (printer_mapping && printer_mapping.length) {
              let print_format_list = printer_mapping.map((a) => a.print_format);
              let has_duplicate = print_format_list.some(
                (item, idx) => print_format_list.indexOf(item) != idx
              );
              if (has_duplicate) {
                frappe.throw(__("Cannot have multiple printers mapped to a single print format."));
                return;
              }
            } else {
              printer_mapping = [];
            }
            let saved_print_format_printer_map = this._get_print_format_printer_map();
            saved_print_format_printer_map[doctype] = printer_mapping;
            localStorage.print_format_printer_map = JSON.stringify(saved_print_format_printer_map);
            dialog.hide();
            this._print_via_qz(doctype, this.doc.name, current_print_format, this.doc.letter_head, this.doc.language || frappe.boot.lang);
          },
          primary_action_label: __("Save")
        });
        dialog.show();
      });
    }
    attach_shortcuts() {
      const ctrl_label = frappe.utils.is_mac() ? "\u2318" : "Ctrl";
      this.$summary_container.find(".print-btn").attr("title", `${ctrl_label}+P`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+p",
        action: () => this.$summary_container.find(".print-btn").click(),
        condition: () => this.$component.is(":visible") && this.$summary_container.find(".print-btn").is(":visible"),
        description: __("Print Receipt"),
        page: cur_page.page.page
      });
      this.$summary_container.find(".new-btn").attr("title", `${ctrl_label}+Enter`);
      frappe.ui.keys.on("ctrl+enter", () => {
        const summary_is_visible = this.$component.is(":visible");
        if (summary_is_visible && this.$summary_container.find(".new-btn").is(":visible")) {
          this.$summary_container.find(".new-btn").click();
        }
      });
      this.$summary_container.find(".edit-btn").attr("title", `${ctrl_label}+E`);
      frappe.ui.keys.add_shortcut({
        shortcut: "ctrl+e",
        action: () => this.$summary_container.find(".edit-btn").click(),
        condition: () => this.$component.is(":visible") && this.$summary_container.find(".edit-btn").is(":visible"),
        description: __("Edit Receipt"),
        page: cur_page.page.page
      });
    }
    send_email() {
      try {
        if (!this.dialogs.email) {
          frappe.throw(__("Email dialog not available"));
          return;
        }
        const form_data = this.dialogs.email.get_values();
        if (!form_data.email_id || !this.validate_email(form_data.email_id)) {
          frappe.show_alert({
            message: __("Please enter a valid email address"),
            indicator: this.constructor.CONSTANTS.INDICATORS.RED
          });
          return;
        }
        const frm = this.events.get_frm();
        const recipients = form_data.email_id;
        const content = form_data.content;
        const doc = this.doc || frm.doc;
        const print_format = frm.pos_print_format;
        this.dialogs.email.set_primary_action(__("Sending..."));
        this.dialogs.email.disable_primary_action();
        frappe.call({
          method: "frappe.core.doctype.communication.email.make",
          args: {
            recipients,
            subject: __(frm.meta.name) + ": " + doc.name,
            content: content ? content : __(frm.meta.name) + ": " + doc.name,
            doctype: doc.doctype,
            name: doc.name,
            send_email: 1,
            print_format,
            sender_full_name: frappe.user.full_name(),
            _lang: doc.language
          },
          callback: (r) => {
            this.dialogs.email.enable_primary_action();
            this.dialogs.email.set_primary_action(__("Send"));
            if (!r.exc) {
              frappe.utils.play_sound("email");
              if (r.message["emails_not_sent_to"]) {
                frappe.msgprint(__(
                  "Email not sent to {0} (unsubscribed / disabled)",
                  [frappe.utils.escape_html(r.message["emails_not_sent_to"])]
                ));
              } else {
                frappe.show_alert({
                  message: __("Email sent successfully."),
                  indicator: this.constructor.CONSTANTS.INDICATORS.GREEN
                });
              }
              this.dialogs.email.hide();
            } else {
              console.error("Email send error:", r.exc);
              frappe.msgprint(__("There were errors while sending email. Please try again."));
            }
          },
          error: (error) => {
            console.error("Email call error:", error);
            this.dialogs.email.enable_primary_action();
            this.dialogs.email.set_primary_action(__("Send"));
            frappe.show_alert({
              message: __("Email sending failed. Please try again."),
              indicator: this.constructor.CONSTANTS.INDICATORS.RED
            });
          }
        });
      } catch (error) {
        console.error("Email function error:", error);
        frappe.show_alert({
          message: __("Email feature encountered an error"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    validate_email(email) {
      const emailRegex = this.constructor.CONSTANTS.VALIDATION.EMAIL_REGEX;
      const maxLength = this.constructor.CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH;
      return emailRegex.test(email) && email.length <= maxLength;
    }
    send_whatsapp() {
      try {
        if (!this.pos_profile.custom_notification_message_whatsapp) {
          frappe.show_alert({
            message: __("WhatsApp notification is not enabled in POS Profile"),
            indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
          });
          return;
        }
        if (!this.doc.customer) {
          frappe.throw(__("Please select a customer first"));
          return;
        }
        frappe.db.get_value("Customer", this.doc.customer, "mobile_no").then(({ message }) => {
          this.process_whatsapp_send(message);
        }).catch((error) => {
          console.error("Error fetching customer mobile:", error);
          frappe.show_alert({
            message: __("Failed to fetch customer mobile number"),
            indicator: this.constructor.CONSTANTS.INDICATORS.RED
          });
        });
      } catch (error) {
        console.error("WhatsApp function error:", error);
        frappe.show_alert({
          message: __("WhatsApp feature encountered an error"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    process_whatsapp_send(customer_data) {
      try {
        const print_url = this.generate_print_url();
        if (customer_data.mobile_no) {
          this.send_whatsapp_with_mobile(customer_data.mobile_no, print_url);
        } else {
          this.send_whatsapp_without_mobile(print_url);
        }
      } catch (error) {
        console.error("WhatsApp processing error:", error);
        frappe.show_alert({
          message: __("Error processing WhatsApp message"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    send_whatsapp_with_mobile(mobile_no, print_url) {
      const cleaned_mobile = mobile_no.replace(/[^0-9]/g, "");
      if (!this.validate_mobile(cleaned_mobile)) {
        frappe.show_alert({
          message: __("Invalid mobile number format"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
        return;
      }
      const whatsapp_message = this.constructor.CONSTANTS.WHATSAPP.BASE_URL + cleaned_mobile + "?text=";
      const message_text = this.constructor.CONSTANTS.WHATSAPP.DEFAULT_MESSAGE + " \n" + print_url;
      const final_message = whatsapp_message + encodeURIComponent(message_text);
      this.open_whatsapp_url(final_message);
    }
    send_whatsapp_without_mobile(print_url) {
      if (!this.pos_profile.custom_whatsapp_field_names || !this.pos_profile.custom_whatsapp_message) {
        frappe.show_alert({
          message: __("WhatsApp configuration incomplete"),
          indicator: this.constructor.CONSTANTS.INDICATORS.ORANGE
        });
        return;
      }
      const field_values = this.pos_profile.custom_whatsapp_field_names.map((x) => this.doc[x.field_name]);
      let message_body = formatString(this.pos_profile.custom_whatsapp_message, field_values);
      message_body += "\n\n" + this.constructor.CONSTANTS.WHATSAPP.DEFAULT_MESSAGE + ":\n" + print_url;
      const encoded_message = encodeURIComponent(message_body);
      const phone_number = this.doc.customer;
      const whatsapp_url = this.constructor.CONSTANTS.WHATSAPP.BASE_URL + phone_number + "?text=" + encoded_message;
      this.open_whatsapp_url(whatsapp_url);
    }
    generate_print_url() {
      return frappe.urllib.get_full_url(
        "/printview?doctype=" + encodeURIComponent(this.doc.doctype) + "&name=" + encodeURIComponent(this.doc.name) + "&format=" + encodeURIComponent(this.pos_profile.print_format) + "&no_letterhead=0&_lang=" + encodeURIComponent(frappe.boot.lang) + "&trigger_print=1"
      );
    }
    validate_mobile(mobile) {
      const minLength = this.constructor.CONSTANTS.VALIDATION.MIN_MOBILE_LENGTH;
      const maxLength = this.constructor.CONSTANTS.VALIDATION.MAX_MOBILE_LENGTH;
      return mobile && mobile.length >= minLength && mobile.length <= maxLength;
    }
    open_whatsapp_url(url) {
      try {
        window.open(url, "_blank");
        frappe.show_alert({
          message: __("WhatsApp opened successfully"),
          indicator: this.constructor.CONSTANTS.INDICATORS.GREEN
        });
      } catch (error) {
        console.error("Error opening WhatsApp URL:", error);
        frappe.show_alert({
          message: __("Failed to open WhatsApp"),
          indicator: this.constructor.CONSTANTS.INDICATORS.RED
        });
      }
    }
    add_summary_btns(map) {
      this.$summary_btns.html("");
      map.forEach((m) => {
        if (m.condition) {
          m.visible_btns.forEach((b) => {
            const class_name = b.split(" ")[0].toLowerCase();
            const btn = __(b);
            this.$summary_btns.append(
              `<div class="summary-btn btn btn-default ${class_name}-btn">${btn}</div>`
            );
          });
        }
      });
      this.$summary_btns.children().last().removeClass("mr-4");
    }
    toggle_summary_placeholder(show) {
      if (show) {
        this.$summary_wrapper.css("display", "none");
        this.$component.find(".no-summary-placeholder").css("display", "flex");
      } else {
        this.$summary_wrapper.css("display", "flex");
        this.$component.find(".no-summary-placeholder").css("display", "none");
      }
    }
    get_condition_btn_map(after_submission) {
      if (after_submission)
        return [{ condition: true, visible_btns: ["Print Receipt", "Email Receipt", "Send Whatsapp", "New Order"] }];
      return [
        { condition: this.doc.docstatus === 0, visible_btns: ["Print Receipt", "Edit Order", "Delete Order", "Send Whatsapp"] },
        { condition: !this.doc.is_return && this.doc.docstatus === 1, visible_btns: ["Print Receipt", "Email Receipt", "Return", "Send Whatsapp"] },
        { condition: this.doc.is_return && this.doc.docstatus === 1, visible_btns: ["Print Receipt", "Email Receipt", "Send Whatsapp"] }
      ];
    }
    load_summary_of(doc, after_submission = false) {
      after_submission ? this.$component.css("grid-column", "span 10 / span 10") : this.$component.css("grid-column", "span 6 / span 6");
      this.toggle_summary_placeholder(false);
      this.doc = doc;
      this.attach_document_info(doc);
      this.attach_items_info(doc);
      this.attach_totals_info(doc);
      this.attach_payments_info(doc);
      const condition_btns_map = this.get_condition_btn_map(after_submission);
      this.add_summary_btns(condition_btns_map);
      this.$summary_wrapper.css("width", after_submission ? "35%" : "60%");
      if (after_submission) {
        this.print_receipt_on_order_complete();
      }
    }
    attach_document_info(doc) {
      frappe.db.get_value("Customer", this.doc.customer, "email_id").then(({ message }) => {
        this.customer_email = message.email_id || "";
        const upper_section_dom = this.get_upper_section_html(doc);
        this.$upper_section.html(upper_section_dom);
      });
    }
    attach_items_info(doc) {
      this.$items_container.html("");
      doc.items.forEach((item) => {
        const item_dom = this.get_item_html(doc, item);
        this.$items_container.append(item_dom);
        this.set_dynamic_rate_header_width();
      });
    }
    set_dynamic_rate_header_width() {
      const rate_cols = Array.from(this.$items_container.find(".item-rate-disc"));
      this.$items_container.find(".item-rate-disc").css("width", "");
      let max_width = rate_cols.reduce((max_width2, elm) => {
        if ($(elm).width() > max_width2)
          max_width2 = $(elm).width();
        return max_width2;
      }, 0);
      max_width += 1;
      if (max_width == 1)
        max_width = "";
      this.$items_container.find(".item-rate-disc").css("width", max_width);
    }
    attach_payments_info(doc) {
      this.$payment_container.html("");
      doc.payments.forEach((p) => {
        if (p.amount) {
          const payment_dom = this.get_payment_html(doc, p);
          this.$payment_container.append(payment_dom);
        }
      });
      if (doc.redeem_loyalty_points && doc.loyalty_amount) {
        const payment_dom = this.get_payment_html(doc, {
          mode_of_payment: "Loyalty Points",
          amount: doc.loyalty_amount
        });
        this.$payment_container.append(payment_dom);
      }
    }
    attach_totals_info(doc) {
      this.$totals_container.html("");
      const net_total_dom = this.get_net_total_html(doc);
      const taxes_dom = this.get_taxes_html(doc);
      const discount_dom = this.get_discount_html(doc);
      const grand_total_dom = this.get_grand_total_html(doc);
      this.$totals_container.append(net_total_dom);
      this.$totals_container.append(taxes_dom);
      this.$totals_container.append(discount_dom);
      this.$totals_container.append(grand_total_dom);
    }
    toggle_component(show) {
      show ? this.$component.css("display", "flex") : this.$component.css("display", "none");
    }
    async print_receipt_on_order_complete() {
      var _a5;
      const profile_name = ((_a5 = this.pos_profile) == null ? void 0 : _a5.name) || this.pos_profile;
      const { message } = await frappe.db.get_value(
        "POS Profile",
        profile_name,
        ["print_receipt_on_order_complete", "print_format"]
      );
      if (message == null ? void 0 : message.print_receipt_on_order_complete) {
        setTimeout(() => this.print_receipt(), 300);
      }
    }
  }, __publicField(_a4, "CONSTANTS", {
    DELAYS: {
      PRINT_DELAY: 300,
      AUTO_PRINT_DELAY: 500,
      EMAIL_SEND_DELAY: 1e3
    },
    VALIDATION: {
      MIN_MOBILE_LENGTH: 10,
      MAX_MOBILE_LENGTH: 15,
      EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    WHATSAPP: {
      BASE_URL: "https://wa.me/",
      MESSAGE_TEMPLATE: "Invoice {0} from {1}"
    },
    STATUSES: {
      PAID: "Paid",
      CONSOLIDATED: "Consolidated",
      DRAFT: "Draft",
      RETURN: "Return"
    },
    INDICATORS: {
      GREEN: "green",
      RED: "red",
      GREY: "grey",
      ORANGE: "orange"
    }
  }), _a4);
})();
//# sourceMappingURL=posnext.bundle.GKHLITO4.js.map
