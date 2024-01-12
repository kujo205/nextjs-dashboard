'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoiceSchema = FormSchema.omit({ id: true, date: true });
const UpdateInvoiceSchema = FormSchema.omit({ id: true, date: true });

function revalidateAndRedirect(path: string) {
  revalidatePath(path);
  redirect(path);
}

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = CreateInvoiceSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    return {
      message: 'Database error: failed to create invoice.',
    };
  }
  revalidateAndRedirect('/dashboard/invoices');
}
export async function updateInvoice(invoiceId: string, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const { customerId, amount, status } = UpdateInvoiceSchema.parse(rawFormData);

  const amountInCents = amount * 100;

  try {
    await sql`UPDATE invoices
    SET customer_id = ${customerId},
        amount = ${amountInCents},
        status = ${status}
    WHERE id = ${invoiceId}
  `;
  } catch (error) {
    return {
      message: 'Database error: failed to update invoice.',
    };
  }

  revalidateAndRedirect('/dashboard/invoices');
}

export async function deleteInvoice(invoiceId: string) {
  throw new Error('Not implemented');
  try {
    await sql`DELETE FROM invoices WHERE id = ${invoiceId}`;
  } catch (error) {
    return {
      message: 'Database error: failed to delete invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
}
