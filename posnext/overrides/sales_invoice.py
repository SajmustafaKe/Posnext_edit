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


