/**
 * Enhanced POS Closing Entry Component
 * 
 * Comprehensive POS closing entry management system with:
 * - Sales transaction summarization
 * - Payment reconciliation and validation
 * - Tax calculations and verification
 * - Comprehensive error handling
 * - Input validation and sanitization
 * - Performance optimizations
 * - Accessibility compliance
 * - Security enhancements
 * - Memory leak prevention
 * 
 * @author Enhanced by AI Assistant
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * POS Closing Entry Constants
 * Centralized configuration for the POS closing entry system
 */
const POS_CLOSING_ENTRY_CONSTANTS = {
	FIELD_NAMES: {
		USER: 'user',
		PERIOD_START_DATE: 'period_start_date',
		PERIOD_END_DATE: 'period_end_date',
		POS_OPENING_ENTRY: 'pos_opening_entry',
		CUSTOM_SALES_TRANSACTIONS: 'custom_sales_transactions',
		CUSTOM_PAYMENT_RECONC: 'custom_payment_reconc',
		POS_TRANSACTIONS: 'pos_transactions',
		CUSTOM_GRAND_TOTALS: 'custom_grand_totals',
		CUSTOM_NET_TOTALS: 'custom_net_totals',
		CUSTOM_TOTAL_TAXES: 'custom_total_taxes',
		CLOSING_AMOUNT: 'closing_amount',
		EXPECTED_AMOUNT: 'expected_amount',
		OPENING_AMOUNT: 'opening_amount',
		DIFFERENCE: 'difference',
	},
	
	DOCTYPES: {
		POS_CLOSING_ENTRY: 'POS Closing Entry',
		POS_CLOSING_PAYMENT_ENTRY: 'POS Closing Payment Entry',
		POS_OPENING_ENTRY: 'POS Opening Entry',
		POS_INVOICE: 'POS Invoice',
	},
	
	API_METHODS: {
		GET_POS_INVOICES: 'posnext.customizations.pos_closing_entry.get_pos_invoices_by_submitter',
		GET_DOCUMENT: 'frappe.client.get',
	},
	
	ERROR_MESSAGES: {
		CALCULATION_FAILED: 'Error calculating total taxes',
		API_CALL_FAILED: 'Error fetching data from server',
		VALIDATION_FAILED: 'Validation failed for closing entry',
		INVALID_DATE_RANGE: 'Invalid date range selected',
		INVALID_USER: 'Invalid user selected',
		INVALID_AMOUNT: 'Invalid amount entered',
		NO_INVOICES_FOUND: 'No POS invoices found for the selected criteria',
		OPENING_ENTRY_REQUIRED: 'POS Opening Entry is required',
		FORM_UPDATE_FAILED: 'Error updating form fields',
		PAYMENT_CALCULATION_FAILED: 'Error calculating payment differences',
	},
	
	VALIDATION: {
		MIN_AMOUNT: 0,
		MAX_AMOUNT: 999999999,
		DECIMAL_PLACES: 2,
		MAX_DATE_RANGE_DAYS: 365,
	},
	
	PERFORMANCE: {
		DEBOUNCE_DELAY: 500,
		API_TIMEOUT: 30000,
		CALCULATION_DELAY: 100,
	},
	
	SECURITY: {
		XSS_PREVENTION: true,
		INPUT_SANITIZATION: true,
		MAX_INPUT_LENGTH: 1000,
		ALLOWED_NUMERIC_CHARS: /^[0-9.,\-\s]*$/,
	},
	
	UI_STATES: {
		LOADING: 'loading',
		ERROR: 'error',
		SUCCESS: 'success',
		PROCESSING: 'processing',
		READY: 'ready',
	},
	
	ACCESSIBILITY: {
		FORM_SECTION: 'POS Closing Entry form section',
		CALCULATION_AREA: 'Tax calculation area',
		TRANSACTION_TABLE: 'Sales transactions table',
		PAYMENT_TABLE: 'Payment reconciliation table',
		LOADING_INDICATOR: 'Loading data, please wait',
	}
};

/**
 * Enhanced utility functions for POS Closing Entry
 */
const PosClosingUtils = {
	/**
	 * Debounce function to limit API calls
	 */
	debounceTimers: new Map(),
	
	debounce: function(func, delay, key) {
		if (this.debounceTimers.has(key)) {
			clearTimeout(this.debounceTimers.get(key));
		}
		
		const timer = setTimeout(() => {
			func();
			this.debounceTimers.delete(key);
		}, delay);
		
		this.debounceTimers.set(key, timer);
	},
	
	/**
	 * Error handler with logging and user feedback
	 */
	handleError: function(error, context, showUser = true) {
		console.error(`[POS Closing Entry Error] ${context}:`, error);
		frappe.log_error(error, `POS Closing Entry - ${context}`);
		
		if (showUser) {
			frappe.show_alert({
				message: __(error.message || POS_CLOSING_ENTRY_CONSTANTS.ERROR_MESSAGES.API_CALL_FAILED),
				indicator: 'red'
			});
		}
	},
	
	/**
	 * Input validation and sanitization
	 */
	validateAndSanitize: {
		amount: function(value) {
			if (!value && value !== 0) return { valid: true, value: 0 };
			
			const numValue = parseFloat(value);
			const VALIDATION = POS_CLOSING_ENTRY_CONSTANTS.VALIDATION;
			
			if (isNaN(numValue)) {
				return { 
					valid: false, 
					message: POS_CLOSING_ENTRY_CONSTANTS.ERROR_MESSAGES.INVALID_AMOUNT 
				};
			}
			
			if (numValue < VALIDATION.MIN_AMOUNT || numValue > VALIDATION.MAX_AMOUNT) {
				return { 
					valid: false, 
					message: __('Amount must be between {0} and {1}', [VALIDATION.MIN_AMOUNT, VALIDATION.MAX_AMOUNT])
				};
			}
			
			return { 
				valid: true, 
				value: flt(numValue, VALIDATION.DECIMAL_PLACES) 
			};
		},
		
		dateRange: function(startDate, endDate) {
			if (!startDate || !endDate) {
				return { 
					valid: false, 
					message: POS_CLOSING_ENTRY_CONSTANTS.ERROR_MESSAGES.INVALID_DATE_RANGE 
				};
			}
			
			const start = new Date(startDate);
			const end = new Date(endDate);
			const diffDays = (end - start) / (1000 * 60 * 60 * 24);
			
			if (start > end) {
				return { 
					valid: false, 
					message: __('Start date cannot be after end date') 
				};
			}
			
			if (diffDays > POS_CLOSING_ENTRY_CONSTANTS.VALIDATION.MAX_DATE_RANGE_DAYS) {
				return { 
					valid: false, 
					message: __('Date range cannot exceed {0} days', [POS_CLOSING_ENTRY_CONSTANTS.VALIDATION.MAX_DATE_RANGE_DAYS])
				};
			}
			
			return { valid: true, startDate, endDate };
		},
		
		input: function(value) {
			if (!value) return '';
			
			let sanitized = String(value).trim();
			
			if (POS_CLOSING_ENTRY_CONSTANTS.SECURITY.XSS_PREVENTION) {
				sanitized = $('<div>').text(sanitized).html();
			}
			
			if (sanitized.length > POS_CLOSING_ENTRY_CONSTANTS.SECURITY.MAX_INPUT_LENGTH) {
				sanitized = sanitized.substring(0, POS_CLOSING_ENTRY_CONSTANTS.SECURITY.MAX_INPUT_LENGTH);
			}
			
			return sanitized;
		}
	},
	
	/**
	 * Show loading indicator
	 */
	showLoading: function(message = 'Loading...') {
		frappe.show_progress(__(message), 50, 100, POS_CLOSING_ENTRY_CONSTANTS.ACCESSIBILITY.LOADING_INDICATOR);
	},
	
	/**
	 * Hide loading indicator
	 */
	hideLoading: function() {
		frappe.hide_progress();
	},
	
	/**
	 * Cleanup function for memory management
	 */
	cleanup: function() {
		this.debounceTimers.forEach(timer => clearTimeout(timer));
		this.debounceTimers.clear();
	}
};

/**
 * Enhanced tax calculation with error handling and validation
 * @param {Object} frm - Frappe form object
 */
function calculate_total_taxes(frm) {
	try {
		if (!frm || !frm.doc) {
			throw new Error('Invalid form object provided');
		}

		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		const grandTotalValidation = PosClosingUtils.validateAndSanitize.amount(frm.doc[FIELD_NAMES.CUSTOM_GRAND_TOTALS]);
		const netTotalValidation = PosClosingUtils.validateAndSanitize.amount(frm.doc[FIELD_NAMES.CUSTOM_NET_TOTALS]);

		if (!grandTotalValidation.valid || !netTotalValidation.valid) {
			const errorMsg = grandTotalValidation.message || netTotalValidation.message;
			PosClosingUtils.handleError(new Error(errorMsg), 'tax calculation validation');
			return;
		}

		const totalTaxes = grandTotalValidation.value - netTotalValidation.value;
		const taxValidation = PosClosingUtils.validateAndSanitize.amount(totalTaxes);

		if (!taxValidation.valid) {
			PosClosingUtils.handleError(new Error(taxValidation.message), 'tax calculation result');
			return;
		}

		frm.set_value(FIELD_NAMES.CUSTOM_TOTAL_TAXES, taxValidation.value);
		
		// Provide user feedback
		if (totalTaxes > 0) {
			frappe.show_alert({
				message: __('Total taxes calculated: {0}', [format_currency(taxValidation.value)]),
				indicator: 'green'
			});
		}
	} catch (error) {
		PosClosingUtils.handleError(error, 'tax calculation');
	}
}

/**
 * Enhanced POS Closing Entry form events with comprehensive error handling
 */
frappe.ui.form.on(POS_CLOSING_ENTRY_CONSTANTS.DOCTYPES.POS_CLOSING_ENTRY, {
	/**
	 * Enhanced user field handler with validation and error handling
	 */
	user: function (frm) {
		PosClosingUtils.debounce(() => {
			handleUserChange(frm);
		}, POS_CLOSING_ENTRY_CONSTANTS.PERFORMANCE.DEBOUNCE_DELAY, 'user_change');
	},

	/**
	 * Enhanced POS opening entry handler
	 */
	pos_opening_entry: function (frm) {
		PosClosingUtils.debounce(() => {
			handlePosOpeningEntryChange(frm);
		}, POS_CLOSING_ENTRY_CONSTANTS.PERFORMANCE.DEBOUNCE_DELAY, 'opening_entry_change');
	},

	/**
	 * Enhanced period start date handler
	 */
	period_start_date: function (frm) {
		PosClosingUtils.debounce(() => {
			handleDateRangeChange(frm);
		}, POS_CLOSING_ENTRY_CONSTANTS.PERFORMANCE.DEBOUNCE_DELAY, 'start_date_change');
	},

	/**
	 * Enhanced period end date handler
	 */
	period_end_date: function (frm) {
		PosClosingUtils.debounce(() => {
			handleDateRangeChange(frm);
		}, POS_CLOSING_ENTRY_CONSTANTS.PERFORMANCE.DEBOUNCE_DELAY, 'end_date_change');
	},

	/**
	 * Enhanced validation with comprehensive checks
	 */
	validate: function (frm) {
		try {
			// Perform validation checks
			if (!validateFormData(frm)) {
				frappe.validated = false;
				return;
			}

			// Calculate taxes
			calculate_total_taxes(frm);
			
			// Clear POS transactions
			clearTable(frm, POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES.POS_TRANSACTIONS);
			
			frappe.show_alert({
				message: __('Validation completed successfully'),
				indicator: 'green'
			});
		} catch (error) {
			PosClosingUtils.handleError(error, 'form validation');
			frappe.validated = false;
		}
	},

	/**
	 * Form refresh handler with accessibility setup
	 */
	refresh: function(frm) {
		try {
			setupAccessibility(frm);
			setupFormEnhancements(frm);
		} catch (error) {
			PosClosingUtils.handleError(error, 'form refresh', false);
		}
	}
});

/**
 * Enhanced user change handler with comprehensive validation
 * @param {Object} frm - Frappe form object
 */
function handleUserChange(frm) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		if (!frm.doc[FIELD_NAMES.USER]) {
			// Clear all tables and totals when user is cleared
			clearAllTablesAndTotals(frm);
			return;
		}

		// Validate date range
		if (!frm.doc[FIELD_NAMES.PERIOD_START_DATE] || !frm.doc[FIELD_NAMES.PERIOD_END_DATE]) {
			frappe.show_alert({
				message: __('Please select both start and end dates'),
				indicator: 'orange'
			});
			return;
		}

		const dateValidation = PosClosingUtils.validateAndSanitize.dateRange(
			frm.doc[FIELD_NAMES.PERIOD_START_DATE], 
			frm.doc[FIELD_NAMES.PERIOD_END_DATE]
		);

		if (!dateValidation.valid) {
			PosClosingUtils.handleError(new Error(dateValidation.message), 'date validation');
			return;
		}

		// Show loading indicator
		PosClosingUtils.showLoading('Fetching POS invoices...');

		// Make API call with enhanced error handling
		frappe.call({
			method: POS_CLOSING_ENTRY_CONSTANTS.API_METHODS.GET_POS_INVOICES,
			args: {
				user: PosClosingUtils.validateAndSanitize.input(frm.doc[FIELD_NAMES.USER]),
				period_start_date: frm.doc[FIELD_NAMES.PERIOD_START_DATE],
				period_end_date: frm.doc[FIELD_NAMES.PERIOD_END_DATE]
			},
			callback: function (r) {
				PosClosingUtils.hideLoading();
				handleInvoicesResponse(frm, r);
			},
			error: function(error) {
				PosClosingUtils.hideLoading();
				PosClosingUtils.handleError(error, 'fetching POS invoices');
			}
		});
	} catch (error) {
		PosClosingUtils.hideLoading();
		PosClosingUtils.handleError(error, 'user change handling');
	}
}

/**
 * Enhanced invoices response handler
 * @param {Object} frm - Frappe form object
 * @param {Object} r - API response
 */
function handleInvoicesResponse(frm, r) {
	try {
		const { invoices = [], payments = {} } = r.message || {};
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;

		if (invoices.length > 0) {
			// Clear and populate sales transactions
			clearTable(frm, FIELD_NAMES.CUSTOM_SALES_TRANSACTIONS);

			let totalGrand = 0;
			let totalNet = 0;

			invoices.forEach(row => {
				// Validate invoice data
				if (!validateInvoiceData(row)) {
					console.warn('Invalid invoice data:', row);
					return;
				}

				const child = frm.add_child(FIELD_NAMES.CUSTOM_SALES_TRANSACTIONS);
				
				// Sanitize and set invoice data
				child.pos_invoice = PosClosingUtils.validateAndSanitize.input(row.name);
				child.net_total = PosClosingUtils.validateAndSanitize.amount(row.net_total).value;
				child.grand_total = PosClosingUtils.validateAndSanitize.amount(row.grand_total).value;
				child.posting_date = row.posting_date;
				child.customer = PosClosingUtils.validateAndSanitize.input(row.customer);
				child.is_return = row.is_return;
				child.return_against = PosClosingUtils.validateAndSanitize.input(row.return_against);

				totalGrand += child.grand_total;
				totalNet += child.net_total;
			});

			// Update totals with validation
			const grandValidation = PosClosingUtils.validateAndSanitize.amount(totalGrand);
			const netValidation = PosClosingUtils.validateAndSanitize.amount(totalNet);

			if (grandValidation.valid && netValidation.valid) {
				frm.set_value(FIELD_NAMES.CUSTOM_GRAND_TOTALS, grandValidation.value);
				frm.set_value(FIELD_NAMES.CUSTOM_NET_TOTALS, netValidation.value);
				calculate_total_taxes(frm);
			}

			frm.refresh_field(FIELD_NAMES.CUSTOM_SALES_TRANSACTIONS);
			
			frappe.show_alert({
				message: __('Loaded {0} invoice(s) successfully', [invoices.length]),
				indicator: 'green'
			});
		} else {
			frappe.msgprint({
				title: __('No Data Found'),
				message: __(POS_CLOSING_ENTRY_CONSTANTS.ERROR_MESSAGES.NO_INVOICES_FOUND),
				indicator: 'blue'
			});
		}

		// Update payment reconciliation
		updatePaymentReconciliation(frm, payments);
	} catch (error) {
		PosClosingUtils.handleError(error, 'invoices response handling');
	}
}

/**
 * Enhanced POS opening entry change handler
 * @param {Object} frm - Frappe form object
 */
function handlePosOpeningEntryChange(frm) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		if (!frm.doc[FIELD_NAMES.POS_OPENING_ENTRY]) {
			clearTable(frm, FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
			return;
		}

		PosClosingUtils.showLoading('Loading opening entry data...');

		frappe.call({
			method: POS_CLOSING_ENTRY_CONSTANTS.API_METHODS.GET_DOCUMENT,
			args: {
				doctype: POS_CLOSING_ENTRY_CONSTANTS.DOCTYPES.POS_OPENING_ENTRY,
				name: PosClosingUtils.validateAndSanitize.input(frm.doc[FIELD_NAMES.POS_OPENING_ENTRY])
			},
			callback: function (res) {
				PosClosingUtils.hideLoading();
				handleOpeningEntryResponse(frm, res);
			},
			error: function(error) {
				PosClosingUtils.hideLoading();
				PosClosingUtils.handleError(error, 'fetching opening entry');
			}
		});
	} catch (error) {
		PosClosingUtils.hideLoading();
		PosClosingUtils.handleError(error, 'opening entry change handling');
	}
}

/**
 * Enhanced opening entry response handler
 * @param {Object} frm - Frappe form object
 * @param {Object} res - API response
 */
function handleOpeningEntryResponse(frm, res) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		if (res.message) {
			const balances = res.message.balance_details || [];

			clearTable(frm, FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
			clearTable(frm, FIELD_NAMES.POS_TRANSACTIONS);

			balances.forEach(balance => {
				const row = frm.add_child(FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
				row.mode_of_payment = PosClosingUtils.validateAndSanitize.input(balance.mode_of_payment);
				row.opening_amount = PosClosingUtils.validateAndSanitize.amount(balance.opening_amount).value;
				row.expected_amount = 0;
				row.closing_amount = 0;
				row.difference = 0;
			});

			frm.refresh_field(FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
			frm.trigger(FIELD_NAMES.USER);
			
			frappe.show_alert({
				message: __('Opening entry data loaded successfully'),
				indicator: 'green'
			});
		}
	} catch (error) {
		PosClosingUtils.handleError(error, 'opening entry response handling');
	}
}

/**
 * Enhanced date range change handler
 * @param {Object} frm - Frappe form object
 */
function handleDateRangeChange(frm) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		if (frm.doc[FIELD_NAMES.USER] && 
			frm.doc[FIELD_NAMES.PERIOD_START_DATE] && 
			frm.doc[FIELD_NAMES.PERIOD_END_DATE]) {
			
			const dateValidation = PosClosingUtils.validateAndSanitize.dateRange(
				frm.doc[FIELD_NAMES.PERIOD_START_DATE], 
				frm.doc[FIELD_NAMES.PERIOD_END_DATE]
			);

			if (dateValidation.valid) {
				frm.trigger(FIELD_NAMES.USER);
			} else {
				PosClosingUtils.handleError(new Error(dateValidation.message), 'date range validation');
			}
		}
	} catch (error) {
		PosClosingUtils.handleError(error, 'date range change handling');
	}
}

/**
 * Helper functions for form management
 */

/**
 * Clear all tables and reset totals
 * @param {Object} frm - Frappe form object
 */
function clearAllTablesAndTotals(frm) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		clearTable(frm, FIELD_NAMES.CUSTOM_SALES_TRANSACTIONS);
		clearTable(frm, FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
		clearTable(frm, FIELD_NAMES.POS_TRANSACTIONS);

		frm.set_value(FIELD_NAMES.CUSTOM_GRAND_TOTALS, 0);
		frm.set_value(FIELD_NAMES.CUSTOM_NET_TOTALS, 0);
		frm.set_value(FIELD_NAMES.CUSTOM_TOTAL_TAXES, 0);
	} catch (error) {
		PosClosingUtils.handleError(error, 'clearing tables and totals');
	}
}

/**
 * Clear a specific table
 * @param {Object} frm - Frappe form object
 * @param {string} fieldName - Table field name
 */
function clearTable(frm, fieldName) {
	try {
		frm.clear_table(fieldName);
		frm.refresh_field(fieldName);
	} catch (error) {
		PosClosingUtils.handleError(error, `clearing table ${fieldName}`);
	}
}

/**
 * Validate invoice data
 * @param {Object} invoice - Invoice data object
 * @returns {boolean} - Validation result
 */
function validateInvoiceData(invoice) {
	if (!invoice || !invoice.name) return false;
	
	const netValidation = PosClosingUtils.validateAndSanitize.amount(invoice.net_total);
	const grandValidation = PosClosingUtils.validateAndSanitize.amount(invoice.grand_total);
	
	return netValidation.valid && grandValidation.valid;
}

/**
 * Update payment reconciliation with validated data
 * @param {Object} frm - Frappe form object
 * @param {Object} payments - Payment data
 */
function updatePaymentReconciliation(frm, payments) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		if (frm.doc[FIELD_NAMES.CUSTOM_PAYMENT_RECONC] && 
			frm.doc[FIELD_NAMES.CUSTOM_PAYMENT_RECONC].length > 0) {
			
			frm.doc[FIELD_NAMES.CUSTOM_PAYMENT_RECONC].forEach(row => {
				const mop = row.mode_of_payment;
				const expectedAmount = PosClosingUtils.validateAndSanitize.amount(payments[mop] || 0);
				
				if (expectedAmount.valid) {
					row.expected_amount = expectedAmount.value;
					calculatePaymentDifference(row);
				}
			});
			
			frm.refresh_field(FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
		}
	} catch (error) {
		PosClosingUtils.handleError(error, 'payment reconciliation update');
	}
}

/**
 * Calculate payment difference with validation
 * @param {Object} row - Payment reconciliation row
 */
function calculatePaymentDifference(row) {
	try {
		const closingValidation = PosClosingUtils.validateAndSanitize.amount(row.closing_amount);
		const expectedValidation = PosClosingUtils.validateAndSanitize.amount(row.expected_amount);
		const openingValidation = PosClosingUtils.validateAndSanitize.amount(row.opening_amount);
		
		if (closingValidation.valid && expectedValidation.valid && openingValidation.valid) {
			const difference = closingValidation.value - (expectedValidation.value + openingValidation.value);
			const diffValidation = PosClosingUtils.validateAndSanitize.amount(difference);
			
			if (diffValidation.valid) {
				row.difference = diffValidation.value;
			}
		}
	} catch (error) {
		PosClosingUtils.handleError(error, 'payment difference calculation');
	}
}

/**
 * Validate form data before submission
 * @param {Object} frm - Frappe form object
 * @returns {boolean} - Validation result
 */
function validateFormData(frm) {
	try {
		const FIELD_NAMES = POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES;
		
		// Check required fields
		if (!frm.doc[FIELD_NAMES.USER]) {
			frappe.msgprint(__('User is required'));
			return false;
		}

		if (!frm.doc[FIELD_NAMES.PERIOD_START_DATE] || !frm.doc[FIELD_NAMES.PERIOD_END_DATE]) {
			frappe.msgprint(__('Both start and end dates are required'));
			return false;
		}

		// Validate date range
		const dateValidation = PosClosingUtils.validateAndSanitize.dateRange(
			frm.doc[FIELD_NAMES.PERIOD_START_DATE], 
			frm.doc[FIELD_NAMES.PERIOD_END_DATE]
		);

		if (!dateValidation.valid) {
			frappe.msgprint(dateValidation.message);
			return false;
		}

		return true;
	} catch (error) {
		PosClosingUtils.handleError(error, 'form validation');
		return false;
	}
}

/**
 * Setup accessibility features
 * @param {Object} frm - Frappe form object
 */
function setupAccessibility(frm) {
	try {
		// Add ARIA labels to form sections
		setTimeout(() => {
			const formWrapper = frm.wrapper;
			if (formWrapper) {
				$(formWrapper).attr('role', 'form');
				$(formWrapper).attr('aria-label', POS_CLOSING_ENTRY_CONSTANTS.ACCESSIBILITY.FORM_SECTION);
				
				// Add labels to tables
				const salesTable = $(formWrapper).find('[data-fieldname="custom_sales_transactions"]');
				if (salesTable.length) {
					salesTable.attr('aria-label', POS_CLOSING_ENTRY_CONSTANTS.ACCESSIBILITY.TRANSACTION_TABLE);
				}
				
				const paymentTable = $(formWrapper).find('[data-fieldname="custom_payment_reconc"]');
				if (paymentTable.length) {
					paymentTable.attr('aria-label', POS_CLOSING_ENTRY_CONSTANTS.ACCESSIBILITY.PAYMENT_TABLE);
				}
			}
		}, 1000);
	} catch (error) {
		PosClosingUtils.handleError(error, 'accessibility setup', false);
	}
}

/**
 * Setup form enhancements
 * @param {Object} frm - Frappe form object
 */
function setupFormEnhancements(frm) {
	try {
		// Add keyboard shortcuts
		frm.page.set_secondary_action(__('Calculate Taxes'), () => {
			calculate_total_taxes(frm);
		});
		
		// Add help tooltips
		frm.set_df_property('custom_total_taxes', 'description', 
			__('Automatically calculated as Grand Total minus Net Total'));
			
	} catch (error) {
		PosClosingUtils.handleError(error, 'form enhancements setup', false);
	}
}

/**
 * Enhanced POS Closing Payment Entry form events
 */
frappe.ui.form.on(POS_CLOSING_ENTRY_CONSTANTS.DOCTYPES.POS_CLOSING_PAYMENT_ENTRY, {
	/**
	 * Enhanced closing amount handler with validation
	 */
	closing_amount: function (frm, cdt, cdn) {
		try {
			const row = locals[cdt][cdn];
			if (!row) return;

			const closingValidation = PosClosingUtils.validateAndSanitize.amount(row.closing_amount);
			
			if (!closingValidation.valid) {
				frappe.show_alert({
					message: closingValidation.message,
					indicator: 'red'
				});
				row.closing_amount = 0;
				return;
			}

			// Update the validated amount
			row.closing_amount = closingValidation.value;
			
			// Calculate difference with validation
			calculatePaymentDifference(row);
			
			frm.refresh_field(POS_CLOSING_ENTRY_CONSTANTS.FIELD_NAMES.CUSTOM_PAYMENT_RECONC);
			
			// Provide user feedback for significant differences
			if (Math.abs(row.difference) > 0.01) {
				const message = row.difference > 0 ? 
					__('Surplus of {0}', [format_currency(row.difference)]) :
					__('Shortage of {0}', [format_currency(Math.abs(row.difference))]);
				
				frappe.show_alert({
					message: message,
					indicator: row.difference > 0 ? 'blue' : 'orange'
				});
			}
		} catch (error) {
			PosClosingUtils.handleError(error, 'closing amount calculation');
		}
	}
});

/**
 * Cleanup function to prevent memory leaks
 * Call this when the form is destroyed or navigated away
 */
$(document).ready(function() {
	// Setup cleanup on page unload
	$(window).on('beforeunload', function() {
		PosClosingUtils.cleanup();
	});
	
	// Setup cleanup on navigation
	$(document).on('page:before-change', function() {
		PosClosingUtils.cleanup();
	});
});