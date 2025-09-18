import frappe
from erpnext.accounts.doctype.sales_invoice.sales_invoice import (
    SalesInvoice,
    update_multi_mode_option
)
from frappe import _
from frappe.utils import add_days, cint, cstr, flt, formatdate, get_link_to_form, getdate, nowdate

from six import iteritems
from frappe import msgprint
class PosnextSalesInvoice(SalesInvoice):

    @frappe.whitelist()
    def reset_mode_of_payments(self):
        if self.pos_profile:
            pos_profile = frappe.get_cached_doc("POS Profile", self.pos_profile)
            update_multi_mode_option(self, pos_profile)
            self.paid_amount = 0
    def validate_pos(self):
        if self.is_return:
            self.paid_amount = self.paid_amount if not self.is_pos else self.base_rounded_total
            self.outstanding_amount = 0

            for x in self.payments:
                x.amount =  self.paid_amount
                x.amount = x.amount * -1 if x.amount > 0 else x.amount
            invoice_total = self.rounded_total or self.grand_total
            if flt(self.paid_amount) + flt(self.write_off_amount) - abs(flt(invoice_total)) > 1.0 / (10.0 ** (self.precision("grand_total") + 1.0)):
                frappe.throw(_("Paid amount + Write Off Amount can not be greater than Grand Total"))
    def validate_pos_paid_amount(self):
        if len(self.payments) == 0 and self.is_pos:
            custom_show_credit_sales = frappe.get_value("POS Profile",self.pos_profile,"custom_show_credit_sales")
            if not custom_show_credit_sales:
                frappe.throw(_("At least one mode of payment is required for POS invoice."))

    def before_submit(self):
        # Fix for "In Words (Company Currency)" validation error during POS submission
        if self.is_pos and hasattr(self, '_pos_submitting'):
            # Store current in_words values to prevent recalculation during submission
            if self.in_words:
                self._stored_in_words = self.in_words
            if self.base_in_words:
                self._stored_base_in_words = self.base_in_words
        
        # Call parent method
        super().before_submit()
        
        # Restore stored values after parent processing
        if self.is_pos and hasattr(self, '_pos_submitting'):
            if hasattr(self, '_stored_in_words'):
                self.in_words = self._stored_in_words
            if hasattr(self, '_stored_base_in_words'):
                self.base_in_words = self._stored_base_in_words

    def validate(self):
        # Fix for "In Words (Company Currency)" validation error
        # Skip certain validations during POS submission that might trigger field recalculation
        if self.is_pos and hasattr(self, '_pos_submitting'):
            # Store original in_words values before validation
            original_in_words = self.in_words
            original_base_in_words = self.base_in_words
            
        # Call parent validation
        super().validate()
        
        # Restore in_words values if they were changed during validation
        if self.is_pos and hasattr(self, '_pos_submitting'):
            if original_in_words and self.in_words != original_in_words:
                self.in_words = original_in_words
            if original_base_in_words and self.base_in_words != original_base_in_words:
                self.base_in_words = original_base_in_words


