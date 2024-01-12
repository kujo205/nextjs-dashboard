'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const formSchema = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string().optional(),
});

const CreateInvoiceSchema = formSchema.omit({ id: true, date: true });
const UpdateInvoiceSchema = formSchema.omit({ id: true, date: true });

function revalidateAndRedirect(path: string) {
  revalidatePath(path);
  redirect(path);
}

export async function createInvoice(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const { customerId, amount, status } = CreateInvoiceSchema.parse(rawFormData);

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  revalidateAndRedirect('/dashboard/invoices');
}
export async function updateInvoice(invoiceId: string, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const { customerId, amount, status } = UpdateInvoiceSchema.parse(rawFormData);

  const amountInCents = amount * 100;

  await sql`UPDATE invoices
    SET customer_id = ${customerId},
        amount = ${amountInCents},
        status = ${status}
    WHERE id = ${invoiceId}
  `;

  revalidateAndRedirect('/dashboard/invoices');
}

export async function deleteInvoice(invoiceId: string) {
  await sql`DELETE FROM invoices WHERE id = ${invoiceId}`;
  revalidatePath('/dashboard/invoices');
}
